import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UploadZone } from "@/components/upload-zone";
import { ProcessingIndicator } from "@/components/processing-indicator";
import { TableDisplay } from "@/components/table-display";
import { ExportButtons } from "@/components/export-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProcessingStatus, TableRecognitionResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Table, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Home() {
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [recognizedTables, setRecognizedTables] = useState<TableRecognitionResult[]>([]);
  const [currentFilename, setCurrentFilename] = useState<string>("");
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      setProcessingStatus({
        status: "uploading",
        progress: 10,
        message: "正在上傳檔案...",
        currentStep: "檔案上傳",
      });

      const response = await apiRequest<{
        success: boolean;
        tables: TableRecognitionResult[];
        filename: string;
        message?: string;
      }>("POST", "/api/upload", formData);

      return response;
    },
    onSuccess: (data) => {
      if (data.success && data.tables) {
        setRecognizedTables(data.tables);
        setCurrentFilename(data.filename);
        setProcessingStatus({
          status: "completed",
          progress: 100,
          message: `成功識別 ${data.tables.length} 個表格！`,
        });
        toast({
          title: "識別完成",
          description: `成功從 PDF 中識別出 ${data.tables.length} 個表格`,
        });
      } else {
        throw new Error(data.message || "識別失敗");
      }
    },
    onError: (error: Error) => {
      setProcessingStatus({
        status: "error",
        progress: 0,
        message: error.message || "處理過程中出現錯誤，請重試",
      });
      toast({
        title: "識別失敗",
        description: error.message || "處理過程中出現錯誤",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    setRecognizedTables([]);
    setCurrentFilename(file.name);
    uploadMutation.mutate(file);
  };

  const handleReset = () => {
    setProcessingStatus({
      status: "idle",
      progress: 0,
      message: "",
    });
    setRecognizedTables([]);
    setCurrentFilename("");
  };

  const isProcessing = processingStatus.status !== "idle" && 
                       processingStatus.status !== "completed" && 
                       processingStatus.status !== "error";

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
              智慧識別 PDF 中的表格
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              上傳您的 PDF 檔案，自動提取和識別其中的表格內容，支援匯出為 CSV 或 HTML 格式
            </p>
          </div>

          {processingStatus.status === "idle" && recognizedTables.length === 0 && (
            <Alert className="border-primary/50 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertTitle>使用說明</AlertTitle>
              <AlertDescription className="text-sm space-y-2">
                <p>1. 點擊或拖曳上傳 PDF 檔案</p>
                <p>2. 系統將自動識別檔案中的表格</p>
                <p>3. 識別完成後可預覽表格並匯出</p>
              </AlertDescription>
            </Alert>
          )}

          <UploadZone
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
          />

          {processingStatus.status !== "idle" && (
            <div className="py-6">
              <ProcessingIndicator status={processingStatus} />
            </div>
          )}

          {recognizedTables.length > 0 && processingStatus.status === "completed" && (
            <div className="space-y-8 animate-in fade-in-50 duration-500">
              <TableDisplay tables={recognizedTables} />
              
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
