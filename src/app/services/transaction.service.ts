import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
    private transactionsSignal = signal<Transaction[]>([]);

    readonly transactions = this.transactionsSignal.asReadonly();

    constructor() { }

    private http = inject(HttpClient);

    addTransactions(newTransactions: Transaction[]) {
        this.transactionsSignal.update(current => [...newTransactions, ...current]);
    }

    saveTransactions() {
        return this.http.get('http://10.198.11.187:8084/api/test');
        // return this.http.post('http://10.198.11.187:8084/api/transaction', this.transactionsSignal());
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
