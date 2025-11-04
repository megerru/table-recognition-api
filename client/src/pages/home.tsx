import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { UploadZone } from "@/components/upload-zone";
import { ProcessingIndicator } from "@/components/processing-indicator";
import { TableDisplay } from "@/components/table-display";
import { ExportButtons } from "@/components/export-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { RegionSelector } from "@/components/region-selector";
import { ProcessingStatus, TableRecognitionResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { convertTableToTraditional } from "@/lib/convert";
import { getApiUrl } from "@/lib/api-config";
import { Table, AlertCircle, RefreshCw, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ImageInfo {
  url: string;
  pageNumber: number;
}

interface PreviewData {
  sessionId: string;
  images: ImageInfo[];
}

export default function Home() {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [recognizedTables, setRecognizedTables] = useState<TableRecognitionResult[]>([]);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [globalSelectedCells, setGlobalSelectedCells] = useState<string[]>([]);
  const { toast } = useToast();

  // 全局統計計算
  const globalStats = useMemo(() => {
    if (globalSelectedCells.length === 0) return null;

    // 提取數字：移除 $, ¥, € 等貨幣符號和逗號
    const numbers = globalSelectedCells
      .map(c => {
        const cleaned = c.replace(/[\$¥€£₩,]/g, '').replace(/NT\$/g, '');
        return parseFloat(cleaned);
      })
      .filter(n => !isNaN(n));

    if (numbers.length === 0) return null;

    const sum = Math.round(numbers.reduce((a, b) => a + b, 0));
    const dividedBy105 = Math.round(sum / 1.05);

    return { sum, dividedBy105, count: numbers.length };
  }, [globalSelectedCells]);

  // 上傳並預覽
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      setProcessingStatus({
        status: "uploading",
        progress: 0,
        message: "正在上傳檔案...",
        currentStep: `檔案大小：${(file.size / 1024 / 1024).toFixed(2)} MB`,
      });

      let isCompleted = false;
      let responseData: any = null;

      return new Promise<{
        success: boolean;
        sessionId: string;
        images: ImageInfo[];
        filename: string;
        message?: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && !isCompleted) {
            const percentComplete = (e.loaded / e.total) * 50; // 上傳佔總進度的50%
            setProcessingStatus({
              status: "uploading",
              progress: percentComplete,
              message: `正在上傳檔案... (${(e.loaded / 1024 / 1024).toFixed(2)} MB / ${(e.total / 1024 / 1024).toFixed(2)} MB)`,
              currentStep: "上傳中",
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              responseData = JSON.parse(xhr.responseText);
              
              if (!isCompleted) {
                setProcessingStatus({
                  status: "converting",
                  progress: 75,
                  message: "正在轉換檔案格式...",
                  currentStep: "PDF 轉圖片",
                });

                setTimeout(() => {
                  if (!isCompleted && responseData) {
                    isCompleted = true;
                    resolve(responseData);
                  }
                }, 500);
              }
            } catch (error) {
              isCompleted = true;
              reject(new Error("解析回應失敗"));
            }
          } else {
            isCompleted = true;
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.message || "上傳失敗"));
            } catch {
              reject(new Error(`上傳失敗 (狀態碼: ${xhr.status})`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          isCompleted = true;
          reject(new Error("網路錯誤，請檢查您的連線"));
        });

        xhr.open('POST', getApiUrl('/api/upload-preview'));
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      if (data.success && data.images) {
        setPreviewData({
          sessionId: data.sessionId,
          images: data.images
        });
        setCurrentFilename(data.filename);
        setProcessingStatus({
          status: "completed",
          progress: 100,
          message: "檔案已準備好，請框選要識別的區域",
        });
        toast({
          title: "上傳成功",
          description: `已載入 ${data.images.length} 頁，請框選要識別的表格區域`,
        });
      } else {
        throw new Error(data.message || "上傳失敗");
      }
    },
    onError: (error: Error) => {
      setProcessingStatus({
        status: "error",
        progress: 0,
        message: error.message || "處理過程中出現錯誤，請重試",
      });
      toast({
        title: "上傳失敗",
        description: error.message || "處理過程中出現錯誤",
        variant: "destructive",
      });
    },
  });

  // 區域識別
  const recognizeRegionsMutation = useMutation({
    mutationFn: async (regions: any[]) => {
      setProcessingStatus({
        status: "recognizing",
        progress: 50,
        message: "正在識別框選的區域...",
        currentStep: `識別 ${regions.length} 個區域`,
      });

      const response = await apiRequest("POST", "/api/recognize-regions", {
        sessionId: previewData?.sessionId,
        regions
      });

      return await response.json();
    },
    onSuccess: (data: any) => {
      if (data.success && data.tables) {
        console.log("🔍 API 返回的表格數量:", data.tables.length);
        console.log("🔍 第一個表格的原始數據:", data.tables[0]);
        console.log("🔍 第一個表格的 rows:", data.tables[0]?.rows);
        console.log("🔍 rows 的維度:", data.tables[0]?.rows?.length, "行 ×", data.tables[0]?.rows[0]?.length, "列");
        
        const convertedTables = data.tables.map((table: any) => ({
          ...table,
          rows: convertTableToTraditional(table.rows)
        }));
        
        console.log("🔍 簡繁轉換後的第一個表格:", convertedTables[0]);
        console.log("🔍 轉換後 rows 的維度:", convertedTables[0]?.rows?.length, "行 ×", convertedTables[0]?.rows[0]?.length, "列");
        
        setRecognizedTables(convertedTables);
        setPreviewData(null);
        setProcessingStatus({
          status: "completed",
          progress: 100,
          message: `成功識別 ${data.tables.length} 個表格！`,
        });
        toast({
          title: "識別完成",
          description: `成功識別 ${data.tables.length} 個表格`,
        });
      } else {
        throw new Error(data.message || "識別失敗");
      }
    },
    onError: (error: Error) => {
      setProcessingStatus({
        status: "error",
        progress: 0,
        message: error.message || "識別過程中出現錯誤，請重試",
      });
      toast({
        title: "識別失敗",
        description: error.message || "識別過程中出現錯誤",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (file: File) => {
    setRecognizedTables([]);
    setPreviewData(null);
    setCurrentFilename(file.name);
    uploadMutation.mutate(file);
  };

  const handleRegionConfirm = (regions: any[]) => {
    recognizeRegionsMutation.mutate(regions);
  };

  const handleRegionCancel = () => {
    setPreviewData(null);
    setProcessingStatus({
      status: "idle",
      progress: 0,
      message: "",
    });
  };

  const handleReset = () => {
    setProcessingStatus({
      status: "idle",
      progress: 0,
      message: "",
    });
    setRecognizedTables([]);
    setPreviewData(null);
    setCurrentFilename("");
  };

  const isProcessing = (processingStatus.status !== "idle" && 
                       processingStatus.status !== "completed" && 
                       processingStatus.status !== "error") ||
                       recognizeRegionsMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Table className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">PDF 表格識別工具</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">基於 TableStructureRec 技術</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              智慧識別表格內容
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              上傳 PDF 或圖片檔案，自動提取和識別其中的表格內容，支援匯出為 CSV 或 HTML 格式
            </p>
          </div>

          {processingStatus.status === "idle" && recognizedTables.length === 0 && !previewData && (
            <Alert className="border-primary/50 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>使用說明</AlertTitle>
              <AlertDescription className="text-sm space-y-2">
                <p>1. 點擊或拖曳上傳 PDF 或圖片檔案（PNG、JPG、JPEG）</p>
                <p>2. 在圖片上框選要識別的表格區域</p>
                <p>3. 確認後系統將識別框選區域的表格</p>
                <p>4. 識別完成後可預覽、編輯表格並匯出</p>
              </AlertDescription>
            </Alert>
          )}

          {!previewData && (
            <UploadZone
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
            />
          )}

          {processingStatus.status !== "idle" && processingStatus.status !== "completed" && (
            <div className="py-6">
              <ProcessingIndicator status={processingStatus} />
            </div>
          )}

          {/* 框選區域界面 */}
          {previewData && processingStatus.status === "completed" && !recognizeRegionsMutation.isPending && (
            <div className="animate-in fade-in-50 duration-500">
              <RegionSelector
                images={previewData.images}
                onConfirm={handleRegionConfirm}
                onCancel={handleRegionCancel}
              />
            </div>
          )}

          {recognizedTables.length > 0 && processingStatus.status === "completed" && (
            <div className="space-y-8 animate-in fade-in-50 duration-500">
              {/* 全局統計面板 */}
              {globalStats && (
                <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="global-stats-panel">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                          <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-primary">跨表格統計</h3>
                          <p className="text-xs text-muted-foreground">選取來自所有表格的儲存格</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[200px]" />
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="default" className="text-sm px-4 py-2" data-testid="global-stat-count">
                          總數量：{globalStats.count}
                        </Badge>
                        <Badge variant="default" className="text-sm px-4 py-2" data-testid="global-stat-sum">
                          總和：{globalStats.sum.toLocaleString('zh-TW')}
                        </Badge>
                        <Badge variant="default" className="text-sm px-4 py-2" data-testid="global-stat-divided">
                          除以1.05：{globalStats.dividedBy105.toLocaleString('zh-TW')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <TableDisplay 
                tables={recognizedTables} 
                onGlobalSelectionChange={setGlobalSelectedCells}
              />
              
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 bg-card rounded-xl border border-border">
                <ExportButtons
                  tables={recognizedTables}
                  filename={currentFilename}
                />
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-reset"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新上傳
                </Button>
              </div>
            </div>
          )}

          {processingStatus.status === "error" && (
            <div className="text-center py-6">
              <Button
                onClick={handleReset}
                variant="outline"
                className="gap-2"
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4" />
                重新嘗試
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              採用 <span className="font-medium text-foreground">TableStructureRec</span> 開源表格識別技術
            </p>
            <p className="text-xs text-muted-foreground">
              支援有線表格和無線表格的自動識別與提取
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
