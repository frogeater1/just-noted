import { computed, inject, Injectable, signal } from '@angular/core';
import { SqliteExportService } from './sqlite-export.service';

export interface Transaction {
    id: number;
    date: string;
    category: string;
    note: string;
    amount: number; // Positive for Income, Negative for Expense
}

@Injectable({
    providedIn: 'root'
})
export class TransactionService {
    private sqliteExportService = inject(SqliteExportService);
    private transactionsSignal = signal<Transaction[]>([]);

    readonly transactions = this.transactionsSignal.asReadonly();

    addTransactions(newTransactions: Transaction[]) {
        this.transactionsSignal.update(current => [...newTransactions, ...current]);
    }

    loadTransactionsFromFile(file: File) {
        return this.sqliteExportService.loadTransactions(file);
    }

    saveTransactions() {
        return this.sqliteExportService.saveTransactions(this.transactionsSignal());
    }

    replaceTransactions(transactions: Transaction[]) {
        this.transactionsSignal.set(transactions);
    }

    updateTransaction(updatedTransaction: Transaction) {
        this.transactionsSignal.update(current =>
            current.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
        );
    }

    deleteTransaction(id: number) {
        this.transactionsSignal.update(current => current.filter(t => t.id !== id));
    }

    clearTransactions() {
        this.transactionsSignal.set([]);
    }

    // Dashboard Helpers
    readonly totalIncome = computed(() =>
        this.transactionsSignal()
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0)
    );

    readonly totalExpense = computed(() =>
        Math.abs(this.transactionsSignal() // Expense is usually displayed as positive magnitude
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + t.amount, 0))
    );

    readonly netAssets = computed(() =>
        this.transactionsSignal()
            .reduce((sum, t) => sum + t.amount, 0)
    );
}
