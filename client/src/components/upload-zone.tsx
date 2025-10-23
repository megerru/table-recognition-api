import { useCallback, useState } from "react";
import { CloudUpload, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  className?: string;
}

export function UploadZone({ onFileSelect, isProcessing, className }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) {
      setIsDragging(true);
    }
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === "application/pdf" || 
      file.type === "image/png" || 
      file.type === "image/jpeg" || 
      file.type === "image/jpg"
    );
    
    if (validFile) {
      onFileSelect(validFile);
    }
  }, [isProcessing, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
    e.target.value = "";
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative min-h-64 rounded-2xl border-2 border-dashed transition-all duration-200",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
        isProcessing && "opacity-50 cursor-not-allowed",
        className
      )}
      data-testid="upload-zone"
    >
      <input
        type="file"
        id="file-upload"
        accept="application/pdf,image/png,image/jpeg,image/jpg"
        onChange={handleFileInput}
        disabled={isProcessing}
        className="hidden"
        data-testid="input-file"
      />
      
      <label
        htmlFor="file-upload"
        className={cn(
          "flex flex-col items-center justify-center h-full cursor-pointer p-8",
          isProcessing && "cursor-not-allowed"
        )}
      >
        <div className={cn(
          "mb-4 rounded-full p-6 transition-colors",
          isDragging ? "bg-primary/20" : "bg-muted"
        )}>
          {isDragging ? (
            <CloudUpload className="w-16 h-16 text-primary" />
          ) : (
            <FileText className="w-16 h-16 text-muted-foreground" />
          )}
        </div>
        
        <h3 className="text-xl font-semibold mb-2 text-foreground">
          {isDragging ? "釋放檔案以上傳" : "上傳 PDF 或圖片"}
        </h3>
        
        <p className="text-sm text-muted-foreground text-center mb-4">
          {isDragging 
            ? "鬆開滑鼠即可上傳檔案" 
            : "拖放檔案到此處，或點擊選擇檔案"}
        </p>
        
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-muted-foreground" />
            <span>支援格式：PDF、PNG、JPG、JPEG</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-muted-foreground" />
            <span>建議檔案大小：小於 50MB</span>
          </div>
        </div>
      </label>
    </div>
  );
}
