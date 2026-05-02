import { Injectable } from '@angular/core';
import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import { AppDataBundle } from '../../import/app-data-bundle';
import { CategoryDefinition } from '../../import/category-definition';
import { Transaction } from './transaction.service';

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

  async saveAppData(data: AppDataBundle): Promise<string> {
    const bytes = await this.buildDatabaseBytes(data);
    const suggestedName = this.buildSuggestedFileName();

    if (this.supportsFilePicker()) {
      return this.saveWithFilePicker(bytes, suggestedName);
    }

    this.downloadBytes(bytes, suggestedName);
    return suggestedName;
  }

  async loadAppData(file: File): Promise<AppDataBundle> {
    const bytes = await this.readFileBytes(file);
    const SQL = await this.getSqlJs();
    const database = new SQL.Database(bytes);

    try {
      return {
        transactions: this.readTransactions(database),
        categories: this.readCategories(database),
      };
    } finally {
      database.close();
    }
  }

  private async buildDatabaseBytes(data: AppDataBundle): Promise<Uint8Array> {
    const SQL = await this.getSqlJs();
    const database = new SQL.Database();

    try {
      this.createSchema(database);
      this.insertTransactions(database, data.transactions);
      this.insertCategories(database, data.categories);
      return database.export();
    } finally {
      database.close();
    }
  }

  private async getSqlJs(): Promise<SqlJsStatic> {
    this.sqlJsPromise ??= initSqlJs({
      locateFile: (file) => (file.endsWith('.wasm') ? 'sql-wasm.wasm' : file),
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

      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      );

      CREATE TABLE category_notes (
        category_id TEXT NOT NULL,
        note TEXT NOT NULL
      );

      CREATE INDEX idx_transactions_date ON transactions(date DESC);
      CREATE INDEX idx_category_notes_category_id ON category_notes(category_id);
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
          [transaction.id, transaction.date, transaction.category, transaction.note, transaction.amount],
        );
      }

      database.run('COMMIT;');
    } catch (error) {
      database.run('ROLLBACK;');
      throw error;
    }
  }

  private insertCategories(database: Database, categories: CategoryDefinition[]) {
    database.run('BEGIN TRANSACTION;');

    try {
      for (const category of categories) {
        database.run(
          `
            INSERT INTO categories (id, name, type)
            VALUES (?, ?, ?);
          `,
          [category.id, category.name, category.type],
        );

        for (const note of category.notes) {
          database.run(
            `
              INSERT INTO category_notes (category_id, note)
              VALUES (?, ?);
            `,
            [category.id, note],
          );
        }
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

  private readCategories(database: Database): CategoryDefinition[] {
    const categoriesResult = database.exec(`
      SELECT id, name, type
      FROM categories
      ORDER BY type, name;
    `);

    if (categoriesResult.length === 0) {
      return [];
    }

    const notesResult = database.exec(`
      SELECT category_id, note
      FROM category_notes
      ORDER BY category_id, note;
    `);

    const notesMap = new Map<string, string[]>();
    for (const row of notesResult[0]?.values ?? []) {
      const [categoryId, note] = row;
      const key = this.toStringValue(categoryId, 'category_id');
      const current = notesMap.get(key) ?? [];
      current.push(this.toStringValue(note, 'note'));
      notesMap.set(key, current);
    }

    return categoriesResult[0].values.map((row) => {
      const [id, name, type] = row;
      const categoryId = this.toStringValue(id, 'id');

      return {
        id: categoryId,
        name: this.toStringValue(name, 'name'),
        type: this.toCategoryType(type),
        notes: notesMap.get(categoryId) ?? [],
      };
    });
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
      throw new Error(`SQLite 文件中的 ${field} 字段无效。`);
    }

    return value;
  }

  private toStringValue(value: unknown, field: string): string {
    if (typeof value !== 'string') {
      throw new Error(`SQLite 文件中的 ${field} 字段无效。`);
    }

    return value;
  }

  private toOptionalString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    return typeof value === 'string' ? value : String(value);
  }

  private toCategoryType(value: unknown): 'expense' | 'income' {
    const type = this.toStringValue(value, 'type');
    if (type !== 'expense' && type !== 'income') {
      throw new Error('SQLite 文件中的分类类型无效。');
    }

    return type;
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
      throw new Error('当前浏览器不支持文件保存对话框。');
    }

    this.fileHandle = await picker({
      suggestedName,
      excludeAcceptAllOption: true,
      types: [
        {
          description: 'SQLite 数据库',
          accept: {
            'application/vnd.sqlite3': ['.sqlite', '.db'],
          },
        },
      ],
    });

    return this.fileHandle;
  }

  private async saveWithFilePicker(bytes: Uint8Array, suggestedName: string): Promise<string> {
    try {
      const handle = await this.getOrCreateFileHandle(suggestedName);
      await this.writeToHandle(handle, bytes);
      return handle.name;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'InvalidStateError') {
        this.fileHandle = undefined;
        const handle = await this.getOrCreateFileHandle(suggestedName);
        await this.writeToHandle(handle, bytes);
        return handle.name;
      }

      throw error;
    }
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
