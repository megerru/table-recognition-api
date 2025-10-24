import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Check } from "lucide-react";

interface Region {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  displayX?: number;
  displayY?: number;
  displayWidth?: number;
  displayHeight?: number;
}

interface ImageInfo {
  url: string;
  pageNumber: number;
}

interface RegionSelectorProps {
  images: ImageInfo[];
  onConfirm: (regions: Region[]) => void;
  onCancel: () => void;
}

export function RegionSelector({ images, onConfirm, onCancel }: RegionSelectorProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [regions, setRegions] = useState<Region[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [imageScale, setImageScale] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;

    const handleImageLoad = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 獲取圖片的實際顯示尺寸
      const displayWidth = img.offsetWidth;
      const displayHeight = img.offsetHeight;
      
      // 計算縮放比例（實際圖片尺寸 vs 顯示尺寸）
      const scale = displayWidth / img.naturalWidth;
      setImageScale(scale);

      // 設置 canvas 內部尺寸與圖片顯示尺寸完全一致
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      // 設置 canvas 的 CSS 尺寸也與圖片一致
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // 重繪所有區域
      redrawRegions();
    };

    img.addEventListener("load", handleImageLoad);
    
    // 監聽窗口大小變化，重新調整 canvas
    const handleResize = () => {
      if (img.complete) {
        handleImageLoad();
      }
    };
    window.addEventListener("resize", handleResize);
    
    return () => {
      img.removeEventListener("load", handleImageLoad);
      window.removeEventListener("resize", handleResize);
    };
  }, [currentPage]);

  const redrawRegions = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空 canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製當前頁的所有區域
    const pageRegions = regions.filter(r => r.pageIndex === currentPage);
    pageRegions.forEach((region, index) => {
      if (!region.displayX) return;
      
      // 繪製框選區域
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(region.displayX, region.displayY!, region.displayWidth!, region.displayHeight!);
      
      // 繪製半透明背景
      ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
      ctx.fillRect(region.displayX, region.displayY!, region.displayWidth!, region.displayHeight!);
      
      // 繪製序號
      ctx.fillStyle = "#3b82f6";
      ctx.font = "16px sans-serif";
      ctx.fillText(`${index + 1}`, region.displayX + 8, region.displayY! + 20);
    });

    // 繪製當前正在繪製的區域
    if (currentRegion && currentRegion.displayWidth) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRegion.displayX!, currentRegion.displayY!, currentRegion.displayWidth, currentRegion.displayHeight!);
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
      ctx.fillRect(currentRegion.displayX!, currentRegion.displayY!, currentRegion.displayWidth, currentRegion.displayHeight!);
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    redrawRegions();
  }, [regions, currentRegion, currentPage]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPoint({ x, y });
    setCurrentRegion({
      id: Date.now().toString(),
      pageIndex: currentPage,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      displayX: x,
      displayY: y,
      displayWidth: 0,
      displayHeight: 0
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = x - startPoint.x;
    const height = y - startPoint.y;

    setCurrentRegion(prev => prev ? {
      ...prev,
      displayWidth: width,
      displayHeight: height
    } : null);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRegion || !currentRegion.displayWidth || !currentRegion.displayHeight) {
      setIsDrawing(false);
      setCurrentRegion(null);
      return;
    }

    const img = imageRef.current;
    if (!img) return;

    // 轉換為實際圖片座標
    const actualX = Math.round(currentRegion.displayX! / imageScale);
    const actualY = Math.round(currentRegion.displayY! / imageScale);
    const actualWidth = Math.round(currentRegion.displayWidth / imageScale);
    const actualHeight = Math.round(currentRegion.displayHeight / imageScale);

    // 確保區域有效
    if (Math.abs(actualWidth) < 10 || Math.abs(actualHeight) < 10) {
      setIsDrawing(false);
      setCurrentRegion(null);
      return;
    }

    const newRegion: Region = {
      id: currentRegion.id,
      pageIndex: currentPage,
      x: actualWidth > 0 ? actualX : actualX + actualWidth,
      y: actualHeight > 0 ? actualY : actualY + actualHeight,
      width: Math.abs(actualWidth),
      height: Math.abs(actualHeight),
      displayX: actualWidth > 0 ? currentRegion.displayX : currentRegion.displayX! + currentRegion.displayWidth,
      displayY: actualHeight > 0 ? currentRegion.displayY : currentRegion.displayY! + currentRegion.displayHeight,
      displayWidth: Math.abs(currentRegion.displayWidth),
      displayHeight: Math.abs(currentRegion.displayHeight)
    };

    setRegions(prev => [...prev, newRegion]);
    setIsDrawing(false);
    setCurrentRegion(null);
  };

  const removeRegion = (id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
  };

  const clearCurrentPage = () => {
    setRegions(prev => prev.filter(r => r.pageIndex !== currentPage));
  };

  const handleConfirm = () => {
    if (regions.length === 0) {
      alert("請至少框選一個區域");
      return;
    }
    onConfirm(regions);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>框選要識別的表格區域</span>
          <div className="flex gap-2">
            <Badge variant="secondary" data-testid="badge-region-count">
              已選 {regions.length} 個區域
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 頁面標籤 */}
        {images.length > 1 && (
          <Tabs value={currentPage.toString()} onValueChange={(v) => setCurrentPage(parseInt(v))}>
            <TabsList>
              {images.map((img, index) => (
                <TabsTrigger key={index} value={index.toString()} data-testid={`tab-page-${index}`}>
                  第 {img.pageNumber} 頁
                  {regions.filter(r => r.pageIndex === index).length > 0 && (
                    <Badge variant="default" className="ml-2">
                      {regions.filter(r => r.pageIndex === index).length}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* 圖片和 canvas 疊加 */}
        <div ref={containerRef} className="relative border rounded-lg overflow-hidden bg-muted">
          <img
            ref={imageRef}
            src={images[currentPage].url}
            alt={`第 ${images[currentPage].pageNumber} 頁`}
            className="w-full h-auto"
            style={{ display: "block", maxWidth: "100%" }}
            data-testid="img-preview"
          />
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute top-0 left-0 cursor-crosshair"
            data-testid="canvas-selector"
          />
        </div>

        {/* 提示文字 */}
        <div className="text-sm text-muted-foreground">
          💡 按住滑鼠左鍵拖動即可框選表格區域。可以框選多個區域。
        </div>

        {/* 當前頁的區域列表 */}
        {regions.filter(r => r.pageIndex === currentPage).length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">本頁已框選區域：</div>
            <div className="flex flex-wrap gap-2">
              {regions
                .filter(r => r.pageIndex === currentPage)
                .map((region, index) => (
                  <Badge
                    key={region.id}
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid={`badge-region-${index}`}
                  >
                    區域 {index + 1} ({region.width}×{region.height})
                    <button
                      onClick={() => removeRegion(region.id)}
                      className="hover:text-destructive"
                      data-testid={`button-remove-region-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCurrentPage}
              data-testid="button-clear-page"
            >
              清除本頁所有區域
            </Button>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-selection"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={regions.length === 0}
            data-testid="button-confirm-selection"
          >
            <Check className="w-4 h-4 mr-2" />
            確認識別 ({regions.length} 個區域)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
