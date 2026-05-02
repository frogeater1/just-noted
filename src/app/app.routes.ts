import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { CategoryManagementComponent } from './pages/categories/category-management.component';
import { TransactionListComponent } from './pages/transactions/transaction-list.component';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: DashboardComponent },
            { path: 'transactions', component: TransactionListComponent },
            { path: 'categories', component: CategoryManagementComponent }
        ]
    },
    { path: '**', redirectTo: '' }
];
