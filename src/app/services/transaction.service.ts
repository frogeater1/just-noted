import { computed, inject, Injectable, signal } from '@angular/core';
import { AppDataBundle } from '../../import/app-data-bundle';
import { CategoryService } from './category.service';
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
  private sqliteExportService = inject(SqliteExportService);
  private categoryService = inject(CategoryService);
  private transactionsSignal = signal<Transaction[]>([]);

  readonly transactions = this.transactionsSignal.asReadonly();

  addTransactions(newTransactions: Transaction[]) {
    this.transactionsSignal.update((current) => [...newTransactions, ...current]);
  }

  loadAppDataFromFile(file: File): Promise<AppDataBundle> {
    return this.sqliteExportService.loadAppData(file);
  }

  saveTransactions() {
    return this.sqliteExportService.saveAppData({
      transactions: this.transactionsSignal(),
      categories: this.categoryService.categories(),
    });
  }

  replaceTransactions(transactions: Transaction[]) {
    this.transactionsSignal.set(transactions);
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
}
