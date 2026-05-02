import { computed, inject, Injectable, signal } from '@angular/core';
import { AppDataBundle } from '../../import/app-data-bundle';
import { CategoryService } from './category.service';
import { IndexeddbStorageService } from './indexeddb-storage.service';
import { SqliteExportService } from './sqlite-export.service';

export interface Transaction {
  id: number;
  date: string;
  category: string;
  note: string;
  amount: number;
}

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private indexeddbStorageService = inject(IndexeddbStorageService);
  private sqliteExportService = inject(SqliteExportService);
  private categoryService = inject(CategoryService);
  private transactionsSignal = signal<Transaction[]>([]);

  readonly transactions = this.transactionsSignal.asReadonly();

  addTransactions(newTransactions: Transaction[]) {
    this.transactionsSignal.update((current) => this.sortTransactionsByDateDesc([...current, ...newTransactions]));
  }

  loadAppDataFromFile(file: File): Promise<AppDataBundle> {
    return this.sqliteExportService.loadAppData(file);
  }

  async restoreFromBrowser(): Promise<boolean> {
    const data = await this.indexeddbStorageService.loadAppData();
    if (!data) {
      return false;
    }

    this.categoryService.replaceCategories(data.categories);
    this.transactionsSignal.set(data.transactions);
    return true;
  }

  saveTransactions() {
    return this.sqliteExportService.saveAppData({
      transactions: this.transactionsSignal(),
      categories: this.categoryService.categories(),
    });
  }

  saveTransactionsToBrowser() {
    return this.indexeddbStorageService.saveAppData({
      transactions: this.transactionsSignal(),
      categories: this.categoryService.categories(),
    });
  }

  replaceTransactions(transactions: Transaction[]) {
    this.transactionsSignal.set(this.sortTransactionsByDateDesc(transactions));
  }

  updateTransaction(updatedTransaction: Transaction) {
    this.transactionsSignal.update((current) =>
      current.map((transaction) => (transaction.id === updatedTransaction.id ? updatedTransaction : transaction)),
    );
  }

  deleteTransaction(id: number) {
    this.transactionsSignal.update((current) => current.filter((transaction) => transaction.id !== id));
  }

  clearTransactions() {
    this.transactionsSignal.set([]);
  }

  getNotesByCategory(categoryName: string): string[] {
    const notes = this.transactionsSignal()
      .filter((transaction) => transaction.category === categoryName)
      .map((transaction) => transaction.note.trim())
      .filter((note) => note.length > 0);

    return Array.from(new Set(notes));
  }

  isSameImportedOrder(importedTransaction: Pick<Transaction, 'date' | 'amount' | 'note'>): boolean {
    const importedTime = new Date(importedTransaction.date).getTime();
    if (Number.isNaN(importedTime)) {
      return false;
    }

    const normalizedNote = importedTransaction.note.trim();

    return this.transactionsSignal().some((transaction) => {
      const existingTime = new Date(transaction.date).getTime();
      if (Number.isNaN(existingTime)) {
        return false;
      }

      const withinOneMinute = Math.abs(existingTime - importedTime) <= 60_000;
      const sameAmount = Math.abs(transaction.amount - importedTransaction.amount) < 0.000001;
      const sameNote = transaction.note.trim() === normalizedNote;

      return withinOneMinute && sameAmount && sameNote;
    });
  }

  resolveCategoryByNote(note: string): string {
    const normalizedNote = note.trim();
    if (!normalizedNote) {
      return '';
    }

    const matched = this.transactionsSignal().find(
      (transaction) => transaction.note.trim() === normalizedNote && transaction.category.trim().length > 0,
    );

    return matched?.category ?? '';
  }

  readonly totalIncome = computed(() =>
    this.transactionsSignal()
      .filter((transaction) => transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );

  readonly totalExpense = computed(() =>
    Math.abs(
      this.transactionsSignal()
        .filter((transaction) => transaction.amount < 0)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    ),
  );

  readonly netAssets = computed(() => this.transactionsSignal().reduce((sum, transaction) => sum + transaction.amount, 0));

  private sortTransactionsByDateDesc(transactions: Transaction[]): Transaction[] {
    return [...transactions].sort((left, right) => {
      const leftTime = new Date(left.date).getTime();
      const rightTime = new Date(right.date).getTime();

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return right.id - left.id;
    });
  }
}
