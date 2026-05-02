import { ImportedTransaction, SpreadsheetCell, SpreadsheetRow } from '../../import/imported-transaction';

const JD_BILL_HEADERS = ['交易时间', '商户名称', '交易说明', '金额', '收/付款方式', '交易状态', '收/支', '交易分类'] as const;

interface JdBillColumnIndexes {
  time: number;
  merchant: number;
  description: number;
  amount: number;
  status: number;
  incomeExpense: number;
  category: number;
  note: number;
}

export function parseJdBillRows(rows: SpreadsheetRow[]): ImportedTransaction[] {
  const headerRowIndex = rows.findIndex((row) => hasExpectedHeaders(row));
  if (headerRowIndex === -1) {
    throw new Error('未找到京东流水表头。');
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

function parseTransactionRow(row: SpreadsheetRow | undefined, indexes: JdBillColumnIndexes): ImportedTransaction | null {
  if (!row || row.every((cell) => normalizeCell(cell) === '')) {
    return null;
  }

  const date = normalizeDate(row[indexes.time]);
  if (!date) {
    return null;
  }

  const status = normalizeCell(row[indexes.status]);
  if (status && status !== '交易成功') {
    return null;
  }

  const incomeExpense = normalizeCell(row[indexes.incomeExpense]);
  const amount = parseAmount(row[indexes.amount]);
  if (amount === null) {
    return null;
  }

  const signedAmount = signAmount(amount, incomeExpense);
  if (signedAmount === null) {
    return null;
  }

  const merchant = normalizeCell(row[indexes.merchant]);
  const description = normalizeCell(row[indexes.description]);
  const tradeCategory = normalizeCell(row[indexes.category]);
  const note = buildNote(description, merchant, tradeCategory);

  return {
    date,
    category: '',
    amount: signedAmount,
    note,
    originalData: row,
  };
}

function hasExpectedHeaders(row: SpreadsheetRow | undefined): boolean {
  if (!row) {
    return false;
  }

  const normalized = row.map((value) => normalizeCell(value));
  return JD_BILL_HEADERS.every((header) => normalized.includes(header));
}

function resolveColumnIndexes(headers: string[]): JdBillColumnIndexes {
  const indexes: JdBillColumnIndexes = {
    time: headers.indexOf('交易时间'),
    merchant: headers.indexOf('商户名称'),
    description: headers.indexOf('交易说明'),
    amount: headers.indexOf('金额'),
    status: headers.indexOf('交易状态'),
    incomeExpense: headers.indexOf('收/支'),
    category: headers.indexOf('交易分类'),
    note: headers.indexOf('备注'),
  };

  if (
    indexes.time === -1 ||
    indexes.merchant === -1 ||
    indexes.description === -1 ||
    indexes.amount === -1 ||
    indexes.status === -1 ||
    indexes.incomeExpense === -1 ||
    indexes.category === -1
  ) {
    throw new Error('京东流水列缺失，无法导入。');
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

function buildNote(description: string, merchant: string, tradeCategory: string): string {
  if (description) {
    return description;
  }

  if (merchant) {
    return merchant;
  }

  return tradeCategory;
}
