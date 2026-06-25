import { ImportedTransaction, SpreadsheetCell, SpreadsheetRow } from '../../import/imported-transaction';

const ALIPAY_BILL_HEADERS = ['交易时间', '交易分类', '交易对方', '商品说明', '收/支', '金额', '交易状态'] as const;

interface AlipayBillColumnIndexes {
  time: number;
  tradeCategory: number;
  counterparty: number;
  product: number;
  incomeExpense: number;
  amount: number;
  status: number;
  note: number;
}

export function parseAlipayBillRows(rows: SpreadsheetRow[]): ImportedTransaction[] {
  const headerRowIndex = rows.findIndex((row) => hasExpectedHeaders(row));
  if (headerRowIndex === -1) {
    throw new Error('未找到支付宝账单表头。');
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

function parseTransactionRow(row: SpreadsheetRow | undefined, indexes: AlipayBillColumnIndexes): ImportedTransaction | null {
  if (!row || row.every((cell) => normalizeCell(cell) === '')) {
    return null;
  }

  const status = normalizeCell(row[indexes.status]);
  if (status === '交易关闭') {
    return null;
  }

  const incomeExpense = normalizeCell(row[indexes.incomeExpense]);
  const amount = parseAmount(row[indexes.amount]);
  const signedAmount = amount === null ? null : signAmount(amount, incomeExpense);
  const date = normalizeDate(row[indexes.time]);
  if (!date || signedAmount === null) {
    return null;
  }

  const tradeCategory = normalizeCell(row[indexes.tradeCategory]);
  const counterparty = normalizeCell(row[indexes.counterparty]);
  const product = normalizeCell(row[indexes.product]);
  const note = normalizeCell(row[indexes.note]);

  return {
    date,
    category: '',
    amount: signedAmount,
    note: buildNote(note, product, counterparty, tradeCategory),
    originalData: row,
  };
}

function hasExpectedHeaders(row: SpreadsheetRow | undefined): boolean {
  if (!row) {
    return false;
  }

  const normalized = row.map((value) => normalizeCell(value));
  return ALIPAY_BILL_HEADERS.every((header) => normalized.includes(header));
}

function resolveColumnIndexes(headers: string[]): AlipayBillColumnIndexes {
  const indexes: AlipayBillColumnIndexes = {
    time: headers.indexOf('交易时间'),
    tradeCategory: headers.indexOf('交易分类'),
    counterparty: headers.indexOf('交易对方'),
    product: headers.indexOf('商品说明'),
    incomeExpense: headers.indexOf('收/支'),
    amount: headers.indexOf('金额'),
    status: headers.indexOf('交易状态'),
    note: headers.indexOf('备注'),
  };

  if (
    indexes.time === -1 ||
    indexes.tradeCategory === -1 ||
    indexes.counterparty === -1 ||
    indexes.product === -1 ||
    indexes.incomeExpense === -1 ||
    indexes.amount === -1 ||
    indexes.status === -1
  ) {
    throw new Error('支付宝账单列缺失，无法导入。');
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

function buildNote(note: string, product: string, counterparty: string, tradeCategory: string): string {
  if (note) {
    return note;
  }

  const base = product && product !== '/' ? product : tradeCategory;
  if (!counterparty || counterparty === '/' || counterparty === base) {
    return base;
  }

  return `${base} - ${counterparty}`;
}
