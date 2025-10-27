import { useState, useEffect } from "react";
import { TableRecognitionResult } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Eye, Layers, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableTable } from "@/components/editable-table";

interface TableDisplayProps {
  tables: TableRecognitionResult[];
  className?: string;
  onGlobalSelectionChange?: (allCells: string[]) => void;
}

type ViewMode = "tabs" | "all";

export function TableDisplay({ tables, className, onGlobalSelectionChange }: TableDisplayProps) {
  const [activeTab, setActiveTab] = useState("0");
  const [editMode, setEditMode] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("tabs");
  const [editedTables, setEditedTables] = useState<string[][][]>(tables.map(t => t.rows));
  const [tableSelections, setTableSelections] = useState<Map<number, string[]>>(new Map());

  const handleTableDataChange = (index: number, newData: string[][]) => {
    const updated = [...editedTables];
    updated[index] = newData;
    setEditedTables(updated);
  };

  const handleTableSelectionChange = (tableIndex: number, cells: string[]) => {
    setTableSelections(prev => {
      const newMap = new Map(prev);
      if (cells.length > 0) {
        newMap.set(tableIndex, cells);
      } else {
        newMap.delete(tableIndex);
      }
      return newMap;
    });
  };

  // 使用 useEffect 通知父組件，避免無限循環
  useEffect(() => {
    const allCells: string[] = [];
    tableSelections.forEach(tableCells => {
      allCells.push(...tableCells);
    });
    onGlobalSelectionChange?.(allCells);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSelections]);

  if (!tables || tables.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="table-display">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold">識別結果</h2>
          <p className="text-sm text-muted-foreground mt-1">
            共識別到 {tables.length} 個表格
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge 
            variant={editMode ? "default" : "outline"} 
            className="text-sm px-3 py-1"
            data-testid="badge-current-mode"
          >
            {editMode ? "📝 目前：編輯模式" : "👁️ 目前：檢視模式"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditMode(!editMode)}
            data-testid="button-toggle-edit-mode"
          >
            {editMode ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                切換到檢視模式
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                切換到編輯模式
              </>
            )}
          </Button>
          {tables.length > 1 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode(viewMode === "tabs" ? "all" : "tabs")}
              data-testid="button-toggle-view-mode"
            >
              {viewMode === "tabs" ? (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  全部顯示
                </>
              ) : (
                <>
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  標籤切換
                </>
              )}
            </Button>
          )}
          <Badge variant="secondary" className="text-sm" data-testid="badge-count">
            {tables.length} 個表格
          </Badge>
        </div>
      </div>

      {editMode ? (
        tables.length === 1 ? (
          <div className="space-y-4">
            {tables[0].pageNumber && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">第 {tables[0].pageNumber} 頁</Badge>
              </div>
            )}
            <EditableTable
              initialData={editedTables[0]}
              tableIndex={0}
              confidence={tables[0].confidence}
              onDataChange={(data) => handleTableDataChange(0, data)}
              onSelectionChange={(cells) => handleTableSelectionChange(0, cells)}
            />
          </div>
        ) : viewMode === "all" ? (
          <div className="space-y-6">
            {tables.map((table, index) => {
              const prevTable = index > 0 ? tables[index - 1] : null;
              const isNewPage = prevTable && table.pageNumber && prevTable.pageNumber !== table.pageNumber;
              
              return (
                <div key={index}>
                  {isNewPage && (
                    <div className="flex items-center gap-3 my-8">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      <Badge variant="secondary" className="px-4 py-2">
                        第 {table.pageNumber} 頁
                      </Badge>
                      <div className="flex-1 h-px bg-gradient-to-r from-border via-transparent to-transparent" />
                    </div>
                  )}
                  <EditableTable
                    initialData={editedTables[index]}
                    tableIndex={index}
                    confidence={table.confidence}
                    pageNumber={table.pageNumber}
                    onDataChange={(data) => handleTableDataChange(index, data)}
                    onSelectionChange={(cells) => handleTableSelectionChange(index, cells)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-muted/50 p-2">
              {tables.map((table, index) => (
                <TabsTrigger
                  key={index}
                  value={index.toString()}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`tab-table-${index}`}
                >
                  表格 {index + 1}
                  {table.pageNumber && (
                    <span className="ml-2 opacity-70 text-xs">
                      (第 {table.pageNumber} 頁)
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tables.map((table, index) => (
              <TabsContent key={index} value={index.toString()} className="mt-4">
                <EditableTable
                  initialData={editedTables[index]}
                  tableIndex={index}
                  confidence={table.confidence}
                  pageNumber={table.pageNumber}
                  onDataChange={(data) => handleTableDataChange(index, data)}
                  onSelectionChange={(cells) => handleTableSelectionChange(index, cells)}
                />
              </TabsContent>
            ))}
          </Tabs>
        )
      ) : (
        tables.length === 1 ? (
          <ReadOnlyTable table={{...tables[0], rows: editedTables[0]}} index={0} />
        ) : viewMode === "all" ? (
          <div className="space-y-6">
            {tables.map((table, index) => {
              const prevTable = index > 0 ? tables[index - 1] : null;
              const isNewPage = prevTable && table.pageNumber && prevTable.pageNumber !== table.pageNumber;
              
              return (
                <div key={index}>
                  {isNewPage && (
                    <div className="flex items-center gap-3 my-8">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                      <Badge variant="secondary" className="px-4 py-2">
                        第 {table.pageNumber} 頁
                      </Badge>
                      <div className="flex-1 h-px bg-gradient-to-r from-border via-transparent to-transparent" />
                    </div>
                  )}
                  <ReadOnlyTable table={{...table, rows: editedTables[index]}} index={index} />
                </div>
              );
            })}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-muted/50 p-2">
              {tables.map((table, index) => (
                <TabsTrigger
                  key={index}
                  value={index.toString()}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-testid={`tab-table-${index}`}
                >
                  表格 {index + 1}
                  {table.pageNumber && (
                    <span className="ml-2 opacity-70 text-xs">
                      (第 {table.pageNumber} 頁)
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {tables.map((table, index) => (
              <TabsContent key={index} value={index.toString()} className="mt-4">
                <ReadOnlyTable table={{...table, rows: editedTables[index]}} index={index} />
              </TabsContent>
            ))}
          </Tabs>
        )
      )}
    </div>
  );
}

function ReadOnlyTable({ table, index }: { table: TableRecognitionResult; index: number }) {
  return (
    <Card data-testid={`card-table-${index}`}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              表格 {index + 1}
              {table.pageNumber && (
                <Badge variant="secondary" className="text-xs">
                  第 {table.pageNumber} 頁
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {table.rows.length} 行 × {table.rows[0]?.length || 0} 列
            </CardDescription>
          </div>
          {table.confidence !== undefined && (
            <Badge variant="outline" data-testid={`badge-confidence-${index}`}>
              置信度：{(table.confidence * 100).toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto max-h-96 rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                {table.rows[0]?.map((_, colIndex) => (
                  <th
                    key={colIndex}
                    className="px-4 py-3 text-left font-semibold text-muted-foreground uppercase tracking-wide border-b border-border"
                  >
                    欄 {colIndex + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                  data-testid={`row-table-${index}-${rowIndex}`}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 font-mono text-xs"
                      data-testid={`cell-table-${index}-${rowIndex}-${cellIndex}`}
                    >
                      {cell || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
