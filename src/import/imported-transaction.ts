export type SpreadsheetCell = string | number | boolean | null | undefined;

export type SpreadsheetRow = SpreadsheetCell[];

export interface ImportedTransaction {
  date: string;
  category: string;
  amount: number;
  note: string;
  originalData?: SpreadsheetRow;
}
