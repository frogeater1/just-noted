import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AutofocusDirective } from '../../directives/autofocus.directive';
import { ImportedTransaction } from '../../../import/imported-transaction';
import { ImportService } from '../../services/import.service';
import { Transaction, TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AutofocusDirective],
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListComponent {
  private fb = inject(FormBuilder);
  private importService = inject(ImportService);
  readonly transactionService = inject(TransactionService);

  showAddModal = signal(false);
  transactions = this.transactionService.transactions;
  editingCell: { id: number; field: string } | null = null;

  addTransactionForm: FormGroup = this.fb.group({
    uiType: ['expense'],
    amount: ['', [Validators.required]],
    category: ['消费', Validators.required],
    date: [this.getNowString(), Validators.required],
    note: [''],
  });

  constructor() {
    this.addTransactionForm.get('uiType')?.valueChanges.subscribe((value) => {
      this.addTransactionForm.patchValue({
        category: value === 'expense' ? '消费' : '工资',
      });
    });
  }

  startEdit(id: number, field: string, event: MouseEvent) {
    event.stopPropagation();
    this.editingCell = { id, field };
  }

  onEditChange(transaction: Transaction, field: keyof Transaction, event: Event) {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const nextValue = this.coerceFieldValue(field, input.value);
    const currentValue = transaction[field];

    if (nextValue !== currentValue) {
      this.transactionService.updateTransaction({
        ...transaction,
        [field]: nextValue,
      });
    }

    this.editingCell = null;
  }

  onEditBlur() {
    this.editingCell = null;
  }

  openAddModal() {
    this.addTransactionForm.reset({
      uiType: 'expense',
      category: '消费',
      date: this.getNowString(),
      note: '',
      amount: '',
    });
    this.showAddModal.set(true);
  }

  openEditModal(transaction: Transaction) {
    this.addTransactionForm.patchValue({
      uiType: transaction.amount < 0 ? 'expense' : 'income',
      amount: Math.abs(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      note: transaction.note,
    });
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  onSubmit() {
    if (!this.addTransactionForm.valid) {
      return;
    }

    const value = this.addTransactionForm.getRawValue();
    const amount = this.normalizeFormAmount(value.amount, value.uiType);
    const transaction: Transaction = {
      id: Date.now(),
      category: value.category,
      date: value.date,
      amount,
      note: value.note ?? '',
    };

    this.transactionService.addTransactions([transaction]);
    this.closeAddModal();
  }

  async saveAll() {
    try {
      const fileName = await this.transactionService.saveTransactions();
      alert(`已保存到 ${fileName}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error(error);
      alert('保存 SQLite 文件失败，请查看控制台。');
    }
  }

  async onSqliteSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const transactions = await this.transactionService.loadTransactionsFromFile(file);
      if (!confirm(`确定从 ${file.name} 恢复 ${transactions.length} 条记录吗？当前列表会被替换。`)) {
        return;
      }

      this.transactionService.replaceTransactions(transactions);
      alert(`已从 ${file.name} 恢复 ${transactions.length} 条记录。`);
    } catch (error) {
      console.error('SQLite restore failed', error);
      alert('恢复 SQLite 文件失败，请查看控制台。');
    } finally {
      input.value = '';
    }
  }

  deleteTransaction(id: number) {
    if (confirm('确定删除这条记录吗？')) {
      this.transactionService.deleteTransaction(id);
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const importedTransactions = await this.importService.parseWechatFile(file);
      const latestDate = this.getLatestTransactionDate();
      const newItems = this.filterNewImportedTransactions(importedTransactions, latestDate);
      const skippedCount = importedTransactions.length - newItems.length;

      if (newItems.length === 0) {
        alert(`没有发现新记录。共扫描 ${importedTransactions.length} 条，全部早于或等于当前最新记录（${latestDate}）。`);
        return;
      }

      this.transactionService.addTransactions(this.toTransactions(newItems));
      alert(`成功导入 ${newItems.length} 条新记录，跳过 ${skippedCount} 条旧记录。`);
    } catch (error) {
      console.error('Import failed', error);
      alert('导入文件失败，请检查格式。');
    } finally {
      input.value = '';
    }
  }

  private coerceFieldValue(field: keyof Transaction, value: string): Transaction[keyof Transaction] {
    if (field === 'amount') {
      return Number.parseFloat(value);
    }

    if (field === 'id') {
      return Number.parseInt(value, 10);
    }

    return value;
  }

  private normalizeFormAmount(rawAmount: unknown, uiType: string): number {
    const amount = Math.abs(Number.parseFloat(String(rawAmount)));
    return uiType === 'expense' ? -amount : amount;
  }

  private getLatestTransactionDate(): string {
    return this.transactionService
      .transactions()
      .reduce((latest, transaction) => (transaction.date > latest ? transaction.date : latest), '');
  }

  private filterNewImportedTransactions(importedTransactions: ImportedTransaction[], latestDate: string): ImportedTransaction[] {
    return importedTransactions.filter((transaction) => transaction.date > latestDate);
  }

  private toTransactions(importedTransactions: ImportedTransaction[]): Transaction[] {
    return importedTransactions.map((transaction) => ({
      id: Math.random(),
      date: transaction.date,
      category: transaction.category,
      note: transaction.note,
      amount: transaction.amount,
    }));
  }

  private getNowString(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 19);
  }
}
