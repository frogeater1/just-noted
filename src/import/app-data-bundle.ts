import { CategoryDefinition } from './category-definition';
import { Transaction } from '../app/services/transaction.service';

export interface AppDataBundle {
  transactions: Transaction[];
  categories: CategoryDefinition[];
}
