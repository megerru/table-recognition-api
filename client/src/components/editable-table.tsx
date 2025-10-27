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

interface SelectionRange {
  id: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface EditableTableProps {
  initialData: string[][];
  tableIndex: number;
  confidence?: number;
  pageNumber?: number;
  onDataChange?: (data: string[][]) => void;
  onSelectionChange?: (cells: string[]) => void;
}

export function EditableTable({ initialData, tableIndex, confidence, pageNumber, onDataChange, onSelectionChange }: EditableTableProps) {
  const [data, setData] = useState<string[][]>(initialData);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selections, setSelections] = useState<SelectionRange[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
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

  const handleMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
    setIsSelecting(true);
    setSelection({ startRow: row, startCol: col, endRow: row, endCol: col });
    setEditingCell(null);
    
    // 如果不是多選模式，清除之前的選取範圍
    if (!multiSelectMode && !event.ctrlKey && !event.metaKey) {
      setSelections([]);
    }
  }, [multiSelectMode]);

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
    
    // 當鬆開滑鼠時，如果是多選模式或按住 Ctrl/Cmd，將當前選取加入到 selections
    if (selection && multiSelectMode) {
      const newRange: SelectionRange = {
        id: Date.now().toString(),
        ...selection
      };
      setSelections(prev => [...prev, newRange]);
      setSelection(null);
    }
  }, [selection, multiSelectMode]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const getSelectedCells = useCallback((): string[] => {
    const cells: string[] = [];
    
    // 收集所有選取範圍的儲存格
    const allRanges: SelectionRange[] = [...selections];
    if (selection) {
      allRanges.push({
        id: 'current',
        ...selection
      });
    }
    
    allRanges.forEach(range => {
      const minRow = Math.min(range.startRow, range.endRow);
      const maxRow = Math.max(range.startRow, range.endRow);
      const minCol = Math.min(range.startCol, range.endCol);
      const maxCol = Math.max(range.startCol, range.endCol);
      
      for (let i = minRow; i <= maxRow; i++) {
        for (let j = minCol; j <= maxCol; j++) {
          const value = data[i]?.[j];
          if (value && value !== '-') cells.push(value);
        }
      }
    });
    
    return cells;
  }, [selection, selections, data]);

  // 當選取變化時，通知父組件
  useEffect(() => {
    const cells = getSelectedCells();
    onSelectionChange?.(cells);
  }, [selection, selections, data, getSelectedCells, onSelectionChange]);

  const calculateStats = useCallback(() => {
    const cells = getSelectedCells();
    console.log("🔍 選取的儲存格:", cells);
    
    // 提取數字：移除 $, ¥, € 等貨幣符號和逗號
    const numbers = cells
      .map(c => {
        // 移除貨幣符號和逗號
        const cleaned = c.replace(/[\$¥€£₩,]/g, '').replace(/NT\$/g, '');
        return parseFloat(cleaned);
      })
      .filter(n => !isNaN(n));
    
    console.log("🔍 提取的數字:", numbers);
    console.log("🔍 數字數量:", numbers.length);
    
    if (numbers.length === 0) return null;
    
    const sum = Math.round(numbers.reduce((a, b) => a + b, 0));
    const dividedBy105 = Math.round(sum / 1.05);
    
    console.log("🔍 統計結果:", { sum, dividedBy105, count: numbers.length });
    
    return { sum, dividedBy105, count: numbers.length };
  }, [getSelectedCells]);

  const stats = (selection || selections.length > 0) ? calculateStats() : null;
  
  const clearSelections = useCallback(() => {
    setSelections([]);
    setSelection(null);
  }, []);

  const isCellSelected = useCallback((row: number, col: number): boolean => {
    // 檢查當前選取範圍
    if (selection) {
      const { startRow, startCol, endRow, endCol } = selection;
      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);
      if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
        return true;
      }
    }
    
    // 檢查之前的選取範圍
    return selections.some(range => {
      const minRow = Math.min(range.startRow, range.endRow);
      const maxRow = Math.max(range.startRow, range.endRow);
      const minCol = Math.min(range.startCol, range.endCol);
      const maxCol = Math.max(range.startCol, range.endCol);
      return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    });
  }, [selection, selections]);

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
              {pageNumber && (
                <Badge variant="secondary" className="text-xs">
                  第 {pageNumber} 頁
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                可編輯
              </Badge>
            </CardTitle>
            <CardDescription>
              {data.length} 行 × {data[0]?.length || 0} 列
              {confidence !== undefined && ` • 置信度：${(confidence * 100).toFixed(1)}%`}
            </CardDescription>
          </div>
          {(selection || selections.length > 0) && (
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={multiSelectMode ? "default" : "outline"}
                onClick={() => setMultiSelectMode(!multiSelectMode)}
                data-testid="button-toggle-multiselect"
              >
                {multiSelectMode ? "✓ 多選模式" : "單選模式"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={copySelection}
                data-testid="button-copy-selection"
              >
                <Copy className="w-4 h-4 mr-2" />
                複製選取
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelections}
                data-testid="button-clear-selections"
              >
                清除選取
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="flex items-center gap-4 p-4 bg-primary/10 border-2 border-primary/30 rounded-lg flex-wrap" data-testid="stats-bar">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <span className="text-base font-semibold text-primary">選取統計：</span>
              {selections.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selections.length + (selection ? 1 : 0)} 個範圍
                </Badge>
              )}
            </div>
            <Badge variant="default" className="text-sm px-3 py-1.5" data-testid="stat-count">
              總數量：{stats.count}
            </Badge>
            <Badge variant="default" className="text-sm px-3 py-1.5" data-testid="stat-sum">
              總和：{stats.sum.toLocaleString('zh-TW')}
            </Badge>
            <Badge variant="default" className="text-sm px-3 py-1.5" data-testid="stat-divided">
              除以1.05：{stats.dividedBy105.toLocaleString('zh-TW')}
            </Badge>
          </div>
        )}
        
        <div className="overflow-auto max-h-[800px] rounded-lg border border-border">
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
                        "px-1 py-1 border-r border-border relative cursor-cell select-none",
                        isCellSelected(rowIndex, cellIndex) && "bg-primary/20",
                        editingCell?.row === rowIndex && editingCell?.col === cellIndex && "bg-background"
                      )}
                      onMouseDown={(e) => handleMouseDown(rowIndex, cellIndex, e)}
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
