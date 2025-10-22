import { CheckCircle2, XCircle, Loader2, FileText } from "lucide-react";
import { ProcessingStatus } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProcessingIndicatorProps {
  status: ProcessingStatus;
  className?: string;
}

export function ProcessingIndicator({ status, className }: ProcessingIndicatorProps) {
  const getStatusIcon = () => {
    switch (status.status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-chart-3" data-testid="icon-success" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" data-testid="icon-error" />;
      case "idle":
        return <FileText className="w-5 h-5 text-muted-foreground" />;
      default:
        return <Loader2 className="w-5 h-5 text-chart-4 animate-spin" data-testid="icon-loading" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "completed":
        return "bg-chart-3/20 text-chart-3 border-chart-3/30";
      case "error":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "idle":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-chart-4/20 text-chart-4 border-chart-4/30";
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case "uploading":
        return "上傳中";
      case "converting":
        return "轉換中";
      case "recognizing":
        return "識別中";
      case "completed":
        return "完成";
      case "error":
        return "錯誤";
      default:
        return "等待中";
    }
  };

  if (status.status === "idle") {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="processing-indicator">
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium",
        getStatusColor()
      )}>
        {getStatusIcon()}
        <span data-testid="text-status">{getStatusText()}</span>
      </div>

      {status.status !== "idle" && status.status !== "completed" && status.status !== "error" && (
        <div className="space-y-2">
          <Progress value={status.progress} className="h-1" data-testid="progress-bar" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground" data-testid="text-message">{status.message}</span>
            <span className="text-foreground font-medium" data-testid="text-progress">{Math.round(status.progress)}%</span>
          </div>
          {status.currentStep && (
            <p className="text-xs text-muted-foreground" data-testid="text-current-step">
              當前步驟：{status.currentStep}
            </p>
          )}
        </div>
      )}

      {status.status === "completed" && (
        <p className="text-sm text-muted-foreground" data-testid="text-completed">
          {status.message}
        </p>
      )}

      {status.status === "error" && (
        <p className="text-sm text-destructive" data-testid="text-error">
          {status.message}
        </p>
      )}
    </div>
  );
}
