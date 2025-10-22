import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableRecognitionResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ExportButtonsProps {
  tables: TableRecognitionResult[];
  filename: string;
  className?: string;
}

export function ExportButtons({ tables, filename, className }: ExportButtonsProps) {
  const { toast } = useToast();

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = () => {
    try {
      let csvContent = "";
      
      tables.forEach((table, index) => {
        if (tables.length > 1) {
          csvContent += `表格 ${index + 1}\n`;
        }
        
        table.rows.forEach(row => {
          const escapedRow = row.map(cell => {
            const cellStr = cell || "";
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          });
          csvContent += escapedRow.join(",") + "\n";
        });
        
        if (tables.length > 1 && index < tables.length - 1) {
          csvContent += "\n";
        }
      });

      const baseName = filename.replace(/\.pdf$/i, "");
      downloadFile(csvContent, `${baseName}_tables.csv`, "text/csv;charset=utf-8;");
      
      toast({
        title: "匯出成功",
        description: `已匯出為 ${baseName}_tables.csv`,
      });
    } catch (error) {
      toast({
        title: "匯出失敗",
        description: "匯出 CSV 時出現錯誤",
        variant: "destructive",
      });
    }
  };

  const exportToHTML = () => {
    try {
      let htmlContent = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${filename} - 表格識別結果</title>
  <style>
    body { font-family: 'Noto Sans SC', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 10px; }
    .meta { color: #666; margin-bottom: 30px; }
    .table-wrapper { margin-bottom: 40px; }
    .table-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
    th { background: #f8f9fa; font-weight: 600; color: #555; }
    tr:hover { background: #f8f9fa; }
  </style>
</head>
<body>
  <div class="container">
    <h1>表格識別結果</h1>
    <div class="meta">檔案名稱：${filename} | 識別表格數：${tables.length}</div>
`;

      tables.forEach((table, index) => {
        htmlContent += `    <div class="table-wrapper">
      <div class="table-title">表格 ${index + 1} (${table.rows.length} 行 × ${table.rows[0]?.length || 0} 列)</div>
      <table>
        <tbody>
`;
        table.rows.forEach(row => {
          htmlContent += "          <tr>\n";
          row.forEach(cell => {
            const escapedCell = (cell || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            htmlContent += `            <td>${escapedCell}</td>\n`;
          });
          htmlContent += "          </tr>\n";
        });
        htmlContent += `        </tbody>
      </table>
    </div>
`;
      });

      htmlContent += `  </div>
</body>
</html>`;

      const baseName = filename.replace(/\.pdf$/i, "");
      downloadFile(htmlContent, `${baseName}_tables.html`, "text/html;charset=utf-8;");
      
      toast({
        title: "匯出成功",
        description: `已匯出為 ${baseName}_tables.html`,
      });
    } catch (error) {
      toast({
        title: "匯出失敗",
        description: "匯出 HTML 時出現錯誤",
        variant: "destructive",
      });
    }
  };

  if (!tables || tables.length === 0) {
    return null;
  }

  return (
    <div className={className} data-testid="export-buttons">
      <h3 className="text-lg font-semibold mb-4">匯出選項</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={exportToCSV}
          variant="default"
          className="gap-2"
          data-testid="button-export-csv"
        >
          <FileSpreadsheet className="w-4 h-4" />
          匯出為 CSV
        </Button>
        <Button
          onClick={exportToHTML}
          variant="outline"
          className="gap-2"
          data-testid="button-export-html"
        >
          <FileText className="w-4 h-4" />
          匯出為 HTML
        </Button>
      </div>
    </div>
  );
}
