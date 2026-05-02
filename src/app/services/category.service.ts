import { computed, Injectable, signal } from '@angular/core';
import { CategoryDefinition, CategoryType } from '../../import/category-definition';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private categoriesSignal = signal<CategoryDefinition[]>([]);

  readonly categories = this.categoriesSignal.asReadonly();

  readonly expenseCategories = computed(() => this.categoriesSignal().filter((category) => category.type === 'expense'));
  readonly incomeCategories = computed(() => this.categoriesSignal().filter((category) => category.type === 'income'));

  addCategory(name: string, type: CategoryType) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    const duplicate = this.categoriesSignal().some(
      (category) => category.type === type && category.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      return;
    }

    this.categoriesSignal.update((current) => [
      ...current,
      {
        id: this.createId(type, trimmedName),
        name: trimmedName,
        type,
        notes: [],
      },
    ]);
  }

  deleteCategory(categoryId: string) {
    this.categoriesSignal.update((current) => current.filter((category) => category.id !== categoryId));
  }

  replaceCategories(categories: CategoryDefinition[]) {
    this.categoriesSignal.set(categories.map((category) => ({ ...category, notes: [] })));
  }

  private createId(type: CategoryType, name: string): string {
    const base = name.toLowerCase().replace(/\s+/g, '-');
    return `${type}-${base}-${Date.now()}`;
  }
}
