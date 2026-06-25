import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ImportedTransaction, SpreadsheetRow } from '../../import/imported-transaction';
import { parseAlipayBillRows } from './alipay-bill-parser';
import { parseJdBillRows } from './jd-bill-parser';
import { parseMeituanBillRows } from './meituan-bill-parser';
import { parseWechatBillRows } from './wechat-bill-parser';

@Injectable({
  providedIn: 'root',
})
export class ImportService {
  async parseWechatFile(file: File): Promise<ImportedTransaction[]> {
    const rows = file.name.toLowerCase().endsWith('.csv') ? await this.readCsvRows(file) : await this.readSpreadsheetRows(file);
    const transactions = this.parseSupportedRows(rows);
    if (transactions.length === 0) {
      throw new Error('未解析到任何账单记录。');
    }

    return transactions;
  }

  private parseSupportedRows(rows: SpreadsheetRow[]): ImportedTransaction[] {
    const parsers = [parseWechatBillRows, parseJdBillRows, parseAlipayBillRows, parseMeituanBillRows];

    for (const parser of parsers) {
      try {
        const transactions = parser(rows);
        if (transactions.length > 0) {
          return transactions;
        }
      } catch {
        // Try the next supported format.
      }
    }

    throw new Error('暂不支持这种账单格式。');
  }

  private readCsvRows(file: File): Promise<SpreadsheetRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const result = event.target?.result;
          if (typeof result !== 'string') {
            throw new Error('无法读取 CSV 文件内容。');
          }

          const workbook = XLSX.read(result, { type: 'string', raw: true });
          resolve(this.extractRows(workbook, true));
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败。'));
      reader.readAsText(file);
    });
  }

  private readSpreadsheetRows(file: File): Promise<SpreadsheetRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const result = event.target?.result;
          if (!(result instanceof ArrayBuffer)) {
            throw new Error('无法读取文件内容。');
          }

          const workbook = XLSX.read(new Uint8Array(result), { type: 'array' });
          resolve(this.extractRows(workbook, false));
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('文件读取失败。'));
      reader.readAsArrayBuffer(file);
    });
  }

  private extractRows(workbook: XLSX.WorkBook, raw: boolean): SpreadsheetRow[] {
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('文件中没有可读取的工作表。');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, {
      header: 1,
      raw,
    });
  }
}
