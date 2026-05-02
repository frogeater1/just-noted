import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../services/transaction.service';

interface MonthlyExpenseChartItem {
  key: string;
  label: string;
  amount: number;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  readonly transactionService = inject(TransactionService);

  readonly totalAssets = this.transactionService.netAssets;
  readonly currentIncome = this.transactionService.totalIncome;
  readonly currentExpense = this.transactionService.totalExpense;

  readonly chartData = computed<MonthlyExpenseChartItem[]>(() => {
    const monthlyTotals = new Map<string, number>();

    for (const transaction of this.transactionService.transactions()) {
      if (transaction.amount >= 0) {
        continue;
      }

      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        continue;
      }

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + Math.abs(transaction.amount));
    }

    const sortedEntries = Array.from(monthlyTotals.entries()).sort(([left], [right]) => left.localeCompare(right));
    if (sortedEntries.length === 0) {
      return [];
    }

    const recentEntries = sortedEntries.slice(-6);
    const maxAmount = Math.max(...recentEntries.map(([, amount]) => amount));
    const shouldShowYear = new Set(recentEntries.map(([key]) => key.slice(0, 4))).size > 1;

    return recentEntries.map(([key, amount]) => {
      const [year, month] = key.split('-');
      const monthLabel = `${Number(month)}月`;

      return {
        key,
        label: shouldShowYear ? `${year}/${monthLabel}` : monthLabel,
        amount,
        value: maxAmount > 0 ? (amount / maxAmount) * 100 : 0,
      };
    });
  });
}
