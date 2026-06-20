export type Delimiter = ',' | '\t';

export interface ParseResult<T extends Record<string, string> = Record<string, string>> {
  headers: (keyof T & string)[];
  rows: T[];
  delim: Delimiter;
}

export interface ColumnResult<T extends Record<string, string> = Record<string, string>> {
  headers: (keyof T & string)[];
  columns: Record<keyof T & string, string[]>;
  delim: Delimiter;
}
