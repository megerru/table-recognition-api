import { useState } from "react";
import { TableRecognitionResult } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TableDisplayProps {
  tables: TableRecognitionResult[];
  className?: string;
}

export function TableDisplay({ tables, className }: TableDisplayProps) {
  const [activeTab, setActiveTab] = useState("0");

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
        <Badge variant="secondary" className="text-sm" data-testid="badge-count">
          {tables.length} 個表格
        </Badge>
      </div>

      {tables.length === 1 ? (
        <TableCard table={tables[0]} index={0} />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-muted/50 p-2">
            {tables.map((_, index) => (
              <TabsTrigger
                key={index}
                value={index.toString()}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid={`tab-table-${index}`}
              >
                表格 {index + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          {tables.map((table, index) => (
            <TabsContent key={index} value={index.toString()} className="mt-4">
              <TableCard table={table} index={index} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function TableCard({ table, index }: { table: TableRecognitionResult; index: number }) {
  return (
    <Card data-testid={`card-table-${index}`}>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>表格 {index + 1}</CardTitle>
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
