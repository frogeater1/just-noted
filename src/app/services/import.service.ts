import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ImportedTransaction, SpreadsheetRow } from '../../import/imported-transaction';
import { parseWechatBillRows } from './wechat-bill-parser';

@Injectable({
  providedIn: 'root',
})
export class ImportService {
  async parseWechatFile(file: File): Promise<ImportedTransaction[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const result = event.target?.result;
          if (!(result instanceof ArrayBuffer)) {
            throw new Error('无法读取文件内容');
          }

          const workbook = XLSX.read(new Uint8Array(result), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            throw new Error('Excel 中没有可读取的工作表');
          }

          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, {
            header: 1,
            raw: false,
          });

          const transactions = parseWechatBillRows(rows);
          if (transactions.length === 0) {
            throw new Error('未解析到任何账单记录');
          }

          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  }
}
