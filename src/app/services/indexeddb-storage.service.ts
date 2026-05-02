import { Injectable } from '@angular/core';
import { AppDataBundle } from '../../import/app-data-bundle';

interface PersistedAppDataRecord extends AppDataBundle {
  id: 'current';
  savedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class IndexeddbStorageService {
  private readonly databaseName = 'just-noted';
  private readonly databaseVersion = 1;
  private readonly storeName = 'app_data';

  async saveAppData(data: AppDataBundle): Promise<void> {
    const database = await this.openDatabase();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      store.put({
        id: 'current',
        savedAt: new Date().toISOString(),
        transactions: data.transactions,
        categories: data.categories,
      } satisfies PersistedAppDataRecord);

      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error ?? new Error('保存到浏览器失败。'));
      };
      transaction.onabort = () => {
        database.close();
        reject(transaction.error ?? new Error('保存到浏览器失败。'));
      };
    });
  }

  async loadAppData(): Promise<AppDataBundle | null> {
    const database = await this.openDatabase();

    return new Promise<AppDataBundle | null>((resolve, reject) => {
      const transaction = database.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get('current');

      request.onsuccess = () => {
        const record = request.result as PersistedAppDataRecord | undefined;
        database.close();

        if (!record) {
          resolve(null);
          return;
        }

        resolve({
          transactions: record.transactions ?? [],
          categories: record.categories ?? [],
        });
      };

      request.onerror = () => {
        database.close();
        reject(request.error ?? new Error('读取浏览器保存数据失败。'));
      };
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.databaseName, this.databaseVersion);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('无法打开浏览器本地数据库。'));
      request.onblocked = () => reject(new Error('浏览器本地数据库被占用，请关闭其他页面后重试。'));
    });
  }
}
