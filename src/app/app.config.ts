import { APP_INITIALIZER, ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { TransactionService } from './services/transaction.service';

function restoreAppDataFactory() {
  const transactionService = inject(TransactionService);

  return async () => {
    try {
      await transactionService.restoreFromBrowser();
    } catch (error) {
      console.error('Failed to restore IndexedDB data on startup', error);
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: restoreAppDataFactory,
    },
  ],
};
