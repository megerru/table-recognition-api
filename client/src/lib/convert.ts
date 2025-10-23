import * as OpenCC from 'opencc-js';

// 初始化簡體轉繁體轉換器
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

/**
 * 將簡體中文轉換為繁體中文
 */
export function convertToTraditional(text: string): string {
  if (!text) return text;
  return converter(text);
}

/**
 * 將表格數據（二維數組）中的所有文字從簡體轉為繁體
 */
export function convertTableToTraditional(rows: string[][]): string[][] {
  return rows.map(row => 
    row.map(cell => convertToTraditional(cell))
  );
}
