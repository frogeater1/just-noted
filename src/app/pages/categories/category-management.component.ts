import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { CategoryDefinition, CategoryType } from '../../../import/category-definition';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './category-management.component.html',
  styleUrls: ['./category-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryManagementComponent {
  private fb = inject(FormBuilder);
  readonly categoryService = inject(CategoryService);
  readonly transactionService = inject(TransactionService);

  readonly addCategoryForm = this.fb.group({
    name: ['', [Validators.required]],
    type: ['expense' as CategoryType, [Validators.required]],
  });

  readonly expenseCategories = this.categoryService.expenseCategories;
  readonly incomeCategories = this.categoryService.incomeCategories;
  readonly hasCategories = computed(() => this.categoryService.categories().length > 0);

  addCategory() {
    if (this.addCategoryForm.invalid) {
      return;
    }

    const value = this.addCategoryForm.getRawValue();
    this.categoryService.addCategory(value.name ?? '', value.type ?? 'expense');
    this.addCategoryForm.reset({
      name: '',
      type: value.type ?? 'expense',
    });
  }

  deleteCategory(category: CategoryDefinition) {
    if (confirm(`确定删除分类“${category.name}”吗？`)) {
      this.categoryService.deleteCategory(category.id);
    }
  }

  getCategoryNotes(categoryName: string): string[] {
    return this.transactionService.getNotesByCategory(categoryName);
  }

  trackByCategory(_: number, category: CategoryDefinition) {
    return category.id;
  }

  trackByNote(_: number, note: string) {
    return note;
  }
}
