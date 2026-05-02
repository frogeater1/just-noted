import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  // Stats
  totalAssets;
  currentIncome;
  currentExpense;
  chartData;
  recentTransactions;

  constructor(public transactionService: TransactionService) {
    this.totalAssets = this.transactionService.netAssets;
    this.currentIncome = this.transactionService.totalIncome;
    this.currentExpense = this.transactionService.totalExpense;

    this.chartData = computed(() => {
      const txs = this.transactionService.transactions();
      const map = new Map<string, number>();

      txs.filter(t => t.amount < 0).forEach(t => {
        const date = new Date(t.date);
        const label = `${date.getMonth() + 1}月`;
        const current = map.get(label) || 0;
        map.set(label, current + Math.abs(t.amount)); // Chart shows positive magnitude of expense
      });

      if (map.size === 0) return [];

      return Array.from(map.entries()).map(([label, val]) => ({
        label,
        value: val > 0 ? (val / 5000) * 100 : 0,
        amount: val
      }));
    });

    this.recentTransactions = computed(() => {
      return this.transactionService.transactions().slice(0, 5);
    });
  }
}
