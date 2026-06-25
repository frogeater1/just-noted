import { ImportedTransaction, SpreadsheetCell, SpreadsheetRow } from '../../import/imported-transaction';

const MEITUAN_BILL_HEADERS = ['交易创建时间', '交易成功时间', '交易类型', '订单标题', '收/支', '订单金额', '实付金额'] as const;

interface MeituanBillColumnIndexes {
  createdTime: number;
  successTime: number;
  tradeType: number;
  title: number;
  incomeExpense: number;
  orderAmount: number;
  paidAmount: number;
  note: number;
}

export function parseMeituanBillRows(rows: SpreadsheetRow[]): ImportedTransaction[] {
  const headerRowIndex = rows.findIndex((row) => hasExpectedHeaders(row));
  if (headerRowIndex === -1) {
    throw new Error('未找到美团账单表头。');
  }

  const headers = rows[headerRowIndex].map((value) => normalizeCell(value));
  const indexes = resolveColumnIndexes(headers);

  return rows.slice(headerRowIndex + 1).reduce<ImportedTransaction[]>((transactions, row) => {
    const transaction = parseTransactionRow(row, indexes);
    if (transaction) {
      transactions.push(transaction);
    }

    return transactions;
  }, []);
}

function parseTransactionRow(row: SpreadsheetRow | undefined, indexes: MeituanBillColumnIndexes): ImportedTransaction | null {
  if (!row || row.every((cell) => normalizeCell(cell) === '')) {
    return null;
  }

  const date = normalizeDate(row[indexes.successTime]) || normalizeDate(row[indexes.createdTime]);
  const amount = parseAmount(row[indexes.paidAmount]) ?? parseAmount(row[indexes.orderAmount]);
  const incomeExpense = normalizeCell(row[indexes.incomeExpense]);
  const signedAmount = amount === null ? null : signAmount(amount, incomeExpense);
  if (!date || signedAmount === null) {
    return null;
  }

  const tradeType = normalizeCell(row[indexes.tradeType]);
  const title = normalizeCell(row[indexes.title]);
  const note = normalizeCell(row[indexes.note]);

  return {
    date,
    category: '',
    amount: signedAmount,
    note: buildNote(note, title, tradeType),
    originalData: row,
  };
}

function hasExpectedHeaders(row: SpreadsheetRow | undefined): boolean {
  if (!row) {
    return false;
  }

  const normalized = row.map((value) => normalizeCell(value));
  return MEITUAN_BILL_HEADERS.every((header) => normalized.includes(header));
}

function resolveColumnIndexes(headers: string[]): MeituanBillColumnIndexes {
  const indexes: MeituanBillColumnIndexes = {
    createdTime: headers.indexOf('交易创建时间'),
    successTime: headers.indexOf('交易成功时间'),
    tradeType: headers.indexOf('交易类型'),
    title: headers.indexOf('订单标题'),
    incomeExpense: headers.indexOf('收/支'),
    orderAmount: headers.indexOf('订单金额'),
    paidAmount: headers.indexOf('实付金额'),
    note: headers.indexOf('备注'),
  };

  if (
    indexes.createdTime === -1 ||
    indexes.successTime === -1 ||
    indexes.tradeType === -1 ||
    indexes.title === -1 ||
    indexes.incomeExpense === -1 ||
    indexes.orderAmount === -1 ||
    indexes.paidAmount === -1
  ) {
    throw new Error('美团账单列缺失，无法导入。');
  }

  return indexes;
}

function normalizeCell(value: SpreadsheetCell): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeDate(value: SpreadsheetCell): string {
  const text = normalizeCell(value);
  return text ? text.replace(' ', 'T') : '';
}

function parseAmount(value: SpreadsheetCell): number | null {
  if (typeof value === 'number') {
    return Math.abs(value);
  }

  const normalized = normalizeCell(value).replace(/[¥,\s]/g, '').replace(/^[-+]/, '');
  if (!normalized) {
    return null;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? null : Math.abs(amount);
}

function signAmount(amount: number, incomeExpense: string): number | null {
  if (incomeExpense === '收入') {
    return Math.abs(amount);
  }

  if (incomeExpense === '支出') {
    return -Math.abs(amount);
  }

  return null;
}

function buildNote(note: string, title: string, tradeType: string): string {
  if (note && note !== '/') {
    return note;
  }

  return title || tradeType;
}
