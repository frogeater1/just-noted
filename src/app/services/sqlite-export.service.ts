import { Injectable } from '@angular/core';
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import type { Transaction } from './transaction.service';

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
}

interface FileSystemWritableFileStreamLike {
  write(data: Blob | BufferSource): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandleLike {
  name: string;
  createWritable(): Promise<FileSystemWritableFileStreamLike>;
}

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandleLike>;
};

@Injectable({
  providedIn: 'root',
})
export class SqliteExportService {
  private sqlJsPromise?: Promise<SqlJsStatic>;
  private fileHandle?: FileSystemFileHandleLike;

  async saveTransactions(transactions: Transaction[]): Promise<string> {
    const bytes = await this.buildDatabaseBytes(transactions);
    const suggestedName = this.buildSuggestedFileName();

    if (this.supportsFilePicker()) {
      const handle = await this.getOrCreateFileHandle(suggestedName);
      await this.writeToHandle(handle, bytes);
      return handle.name;
    }

    this.downloadBytes(bytes, suggestedName);
    return suggestedName;
  }

  async loadTransactions(file: File): Promise<Transaction[]> {
    const bytes = await this.readFileBytes(file);
    const SQL = await this.getSqlJs();
    const database = new SQL.Database(bytes);

    try {
      return this.readTransactions(database);
    } finally {
      database.close();
    }
  }

  private async buildDatabaseBytes(transactions: Transaction[]): Promise<Uint8Array> {
    const SQL = await this.getSqlJs();
    const database = new SQL.Database();

    try {
      this.createSchema(database);
      this.insertTransactions(database, transactions);
      return database.export();
    } finally {
      database.close();
    }
  }

  private async getSqlJs(): Promise<SqlJsStatic> {
    this.sqlJsPromise ??= initSqlJs({
      locateFile: (file) => file === 'sql-wasm.wasm' ? 'sql-wasm.wasm' : file,
    });

    return this.sqlJsPromise;
  }

  private async readFileBytes(file: File): Promise<Uint8Array> {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private createSchema(database: Database) {
    database.run(`
      CREATE TABLE transactions (
        id REAL PRIMARY KEY,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        amount REAL NOT NULL
      );

      CREATE INDEX idx_transactions_date ON transactions(date DESC);
    `);
  }

  private insertTransactions(database: Database, transactions: Transaction[]) {
    database.run('BEGIN TRANSACTION;');

    try {
      for (const transaction of transactions) {
        database.run(
          `
            INSERT INTO transactions (id, date, category, note, amount)
            VALUES (?, ?, ?, ?, ?);
          `,
          [
            transaction.id,
            transaction.date,
            transaction.category,
            transaction.note,
            transaction.amount,
          ],
        );
      }

      database.run('COMMIT;');
    } catch (error) {
      database.run('ROLLBACK;');
      throw error;
    }
  }

  private readTransactions(database: Database): Transaction[] {
    const results = database.exec(`
      SELECT id, date, category, note, amount
      FROM transactions
      ORDER BY date DESC, id DESC;
    `);

    const rows = results[0]?.values ?? [];
    return rows.map((row) => this.mapTransactionRow(row));
  }

  private mapTransactionRow(row: unknown[]): Transaction {
    const [id, date, category, note, amount] = row;

    return {
      id: this.toNumber(id, 'id'),
      date: this.toStringValue(date, 'date'),
      category: this.toStringValue(category, 'category'),
      note: this.toOptionalString(note),
      amount: this.toNumber(amount, 'amount'),
    };
  }

  private toNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error(`SQLite file has an invalid ${field} field.`);
    }

    return value;
  }

  private toStringValue(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new Error(`SQLite file has an invalid ${field} field.`);
    }

    return value;
  }

  private toOptionalString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return typeof value === 'string' ? value : String(value);
  }

  private supportsFilePicker(): boolean {
    return typeof (window as SaveFilePickerWindow).showSaveFilePicker === 'function';
  }

  private async getOrCreateFileHandle(suggestedName: string): Promise<FileSystemFileHandleLike> {
    if (this.fileHandle) {
      return this.fileHandle;
    }

    const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
    if (!picker) {
      throw new Error('当前浏览器不支持文件保存对话框');
    }

    this.fileHandle = await picker({
      suggestedName,
      excludeAcceptAllOption: true,
      types: [
        {
          description: 'SQLite Database',
          accept: {
            'application/vnd.sqlite3': ['.sqlite', '.db'],
          },
        },
      ],
    });

    return this.fileHandle;
  }

  private async writeToHandle(handle: FileSystemFileHandleLike, bytes: Uint8Array) {
    const writable = await handle.createWritable();
    await writable.write(this.toArrayBuffer(bytes));
    await writable.close();
  }

  private downloadBytes(bytes: Uint8Array, filename: string) {
    const blob = new Blob([this.toArrayBuffer(bytes)], { type: 'application/vnd.sqlite3' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  private buildSuggestedFileName(): string {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '-',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    return `just-noted-${stamp}.sqlite`;
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
  }
}
