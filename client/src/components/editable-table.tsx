import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calculator, Copy, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface EditableTableProps {
  initialData: string[][];
  tableIndex: number;
  confidence?: number;
  onDataChange?: (data: string[][]) => void;
}

export function EditableTable({ initialData, tableIndex, confidence, onDataChange }: EditableTableProps) {
  const [data, setData] = useState<string[][]>(initialData);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const { toast } = useToast();

  const handleCellChange = useCallback((row: number, col: number, value: string) => {
    const newData = data.map((r, i) =>
      i === row ? r.map((c, j) => (j === col ? value : c)) : r
    );
    setData(newData);
    onDataChange?.(newData);
  }, [data, onDataChange]);

  const handleCellClick = useCallback((row: number, col: number, isDoubleClick: boolean) => {
    if (isDoubleClick) {
      setEditingCell({ row, col });
      setSelection(null);
    } else {
      setEditingCell(null);
      setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    }
  }, []);

  const handleMouseDown = useCallback((row: number, col: number) => {
    setIsSelecting(true);
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    setEditingCell(null);
  }, []);

  const handleMouseEnter = useCallback((row: number, col: number) => {
    if (isSelecting && selection) {
      setSelection({
        ...selection,
        endRow: row,
        endCol: col,
      });
    }
  }, [isSelecting, selection]);

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const getSelectedCells = useCallback((): string[] => {
    if (!selection) return [];
    
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    
    const cells: string[] = [];
    for (let i = minRow; i <= maxRow; i++) {
      for (let j = minCol; j <= maxCol; j++) {
        const value = data[i]?.[j];
        if (value) cells.push(value);
      }
    }
    return cells;
  }, [selection, data]);

  const calculateStats = useCallback(() => {
    const cells = getSelectedCells();
    const numbers = cells
      .map(c => parseFloat(c.replace(/[,]/g, '')))
      .filter(n => !isNaN(n));
    
    if (numbers.length === 0) return null;
    
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const max = Math.max(...numbers);
    const min = Math.min(...numbers);
    
    return { sum, avg, max, min, count: numbers.length };
  }, [getSelectedCells]);

  const stats = selection ? calculateStats() : null;

  const isCellSelected = useCallback((row: number, col: number): boolean => {
    if (!selection) return false;
    const { startRow, startCol, endRow, endCol } = selection;
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selection]);

  const copySelection = useCallback(() => {
    const cells = getSelectedCells();
    const text = cells.join('\t');
    navigator.clipboard.writeText(text);
    toast({
      title: "已複製",
      description: `已複製 ${cells.length} 個儲存格`,
    });
  }, [getSelectedCells, toast]);

  return (
    <Card data-testid={`card-table-${tableIndex}`}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              表格 {tableIndex + 1}
              <Badge variant="outline" className="text-xs">
                可編輯
              </Badge>
            </CardTitle>
            <CardDescription>
              {data.length} 行 × {data[0]?.length || 0} 列
              {confidence !== undefined && ` • 置信度：${(confidence * 100).toFixed(1)}%`}
            </CardDescription>
          </div>
          {selection && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copySelection}
                data-testid="button-copy-selection"
              >
                <Copy className="w-4 h-4 mr-2" />
                複製選取
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg flex-wrap" data-testid="stats-bar">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">選取統計：</span>
            </div>
            <Badge variant="secondary" data-testid="stat-count">計數：{stats.count}</Badge>
            <Badge variant="secondary" data-testid="stat-sum">總和：{stats.sum.toFixed(2)}</Badge>
            <Badge variant="secondary" data-testid="stat-avg">平均：{stats.avg.toFixed(2)}</Badge>
            <Badge variant="secondary" data-testid="stat-max">最大：{stats.max.toFixed(2)}</Badge>
            <Badge variant="secondary" data-testid="stat-min">最小：{stats.min.toFixed(2)}</Badge>
          </div>
        )}
        
        <div className="overflow-auto max-h-[600px] rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                <th className="px-2 py-2 text-center font-semibold text-muted-foreground border-r border-b border-border w-12">
                  #
                </th>
                {data[0]?.map((_, colIndex) => (
                  <th
                    key={colIndex}
                    className="px-3 py-2 text-left font-semibold text-muted-foreground border-b border-border min-w-[120px]"
                  >
                    {String.fromCharCode(65 + colIndex)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border">
                  <td className="px-2 py-1 text-center text-xs text-muted-foreground bg-muted/30 border-r border-border font-medium">
                    {rowIndex + 1}
                  </td>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={cn(
                        "px-1 py-1 border-r border-border relative cursor-cell",
                        isCellSelected(rowIndex, cellIndex) && "bg-primary/20",
                        editingCell?.row === rowIndex && editingCell?.col === cellIndex && "bg-background"
                      )}
                      onMouseDown={() => handleMouseDown(rowIndex, cellIndex)}
                      onMouseEnter={() => handleMouseEnter(rowIndex, cellIndex)}
                      onDoubleClick={() => handleCellClick(rowIndex, cellIndex, true)}
                      data-testid={`cell-table-${tableIndex}-${rowIndex}-${cellIndex}`}
                    >
                      {editingCell?.row === rowIndex && editingCell?.col === cellIndex ? (
                        <Input
                          autoFocus
                          value={cell}
                          onChange={(e) => handleCellChange(rowIndex, cellIndex, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingCell(null);
                            } else if (e.key === 'Escape') {
                              setEditingCell(null);
                            }
                          }}
                          className="h-8 text-xs border-primary"
                          data-testid={`input-cell-${tableIndex}-${rowIndex}-${cellIndex}`}
                        />
                      ) : (
                        <div className="px-2 py-1.5 min-h-[32px] text-xs">
                          {cell || "-"}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 雙擊儲存格進行編輯，按 Enter 或點擊其他地方完成編輯</p>
          <p>• 點擊並拖動滑鼠選取多個儲存格，查看統計數據</p>
        </div>
      </CardContent>
    </Card>
  );
}
