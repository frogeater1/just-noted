import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction, TransactionService } from '../../services/transaction.service';

interface MonthlyExpenseChartItem {
  key: string;
  label: string;
  amount: number;
  value: number;
}

interface CategoryPieItem {
  label: string;
  amount: number;
  percent: number;
  color: string;
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

  readonly startDate = signal('');
  readonly endDate = signal('');

  readonly pieColors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

  readonly filteredTransactions = computed(() => {
    const start = this.startDate();
    const end = this.endDate();

    return this.transactionService.transactions().filter((transaction) => this.isInRange(transaction, start, end));
  });

  readonly currentIncome = computed(() =>
    this.filteredTransactions()
      .filter((transaction) => transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );

  readonly currentExpense = computed(() =>
    Math.abs(
      this.filteredTransactions()
        .filter((transaction) => transaction.amount < 0)
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    ),
  );

  readonly chartData = computed<MonthlyExpenseChartItem[]>(() => {
    const monthlyTotals = new Map<string, number>();

    for (const transaction of this.filteredTransactions()) {
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

    const maxAmount = Math.max(...sortedEntries.map(([, amount]) => amount));
    const shouldShowYear = new Set(sortedEntries.map(([key]) => key.slice(0, 4))).size > 1;

    return sortedEntries.map(([key, amount]) => {
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

  readonly pieData = computed<CategoryPieItem[]>(() => {
    const categoryTotals = new Map<string, number>();

    for (const transaction of this.filteredTransactions()) {
      if (transaction.amount >= 0) {
        continue;
      }

      const category = transaction.category || '未分类';
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + Math.abs(transaction.amount));
    }

    const entries = Array.from(categoryTotals.entries()).sort((left, right) => right[1] - left[1]);
    if (entries.length === 0) {
      return [];
    }

    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

    return entries.map(([label, amount], index) => ({
      label,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
      color: this.pieColors[index % this.pieColors.length],
    }));
  });

  readonly pieGradient = computed(() => {
    const items = this.pieData();
    if (items.length === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let currentAngle = 0;
    const segments = items.map((item) => {
      const startAngle = currentAngle;
      const endAngle = currentAngle + (item.percent / 100) * 360;
      currentAngle = endAngle;
      return `${item.color} ${startAngle}deg ${endAngle}deg`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  });

  onStartDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);
  }

  onEndDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
  }

  clearDateRange() {
    this.startDate.set('');
    this.endDate.set('');
  }

  private isInRange(transaction: Transaction, start: string, end: string): boolean {
    const transactionDate = new Date(transaction.date);
    if (Number.isNaN(transactionDate.getTime())) {
      return false;
    }

    if (start) {
      const startDate = new Date(`${start}T00:00:00`);
      if (transactionDate < startDate) {
        return false;
      }
    }

    if (end) {
      const endDate = new Date(`${end}T23:59:59`);
      if (transactionDate > endDate) {
        return false;
      }
    }

    return true;
  }
}
