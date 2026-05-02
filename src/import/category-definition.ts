export type CategoryType = 'expense' | 'income';

export interface CategoryDefinition {
  id: string;
  name: string;
  type: CategoryType;
  notes: string[];
}
