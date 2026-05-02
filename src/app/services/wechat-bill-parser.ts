import { ImportedTransaction, SpreadsheetCell, SpreadsheetRow } from '../../import/imported-transaction';

const WECHAT_BILL_HEADERS = ['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额(元)'] as const;
const EXPENSE_KEYWORDS = ['餐饮', '美团', '饿了么', '超市', '购物', '出行', '滴滴', '铁路', '商户消费'] as const;

interface WechatBillColumnIndexes {
  time: number;
  tradeType: number;
  counterparty: number;
  product: number;
  incomeExpense: number;
  amount: number;
}

export function parseWechatBillRows(rows: SpreadsheetRow[]): ImportedTransaction[] {
  const headerRowIndex = rows.findIndex((row) => hasExpectedHeaders(row));
  if (headerRowIndex === -1) {
    throw new Error('未找到微信账单表头');
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

function parseTransactionRow(row: SpreadsheetRow | undefined, indexes: WechatBillColumnIndexes): ImportedTransaction | null {
  if (!row || row.every((cell) => normalizeCell(cell) === '')) {
    return null;
  }

  const date = normalizeDate(row[indexes.time]);
  const amount = parseAmount(row[indexes.amount]);
  if (!date || amount === null) {
    return null;
  }

  const tradeType = normalizeCell(row[indexes.tradeType]);
  const counterparty = normalizeCell(row[indexes.counterparty]);
  const product = normalizeCell(row[indexes.product]);
  const incomeExpense = normalizeCell(row[indexes.incomeExpense]);

  const signedAmount = signAmount(amount, incomeExpense, tradeType);
  const note = buildNote(product, tradeType, counterparty);
  const category = guessCategory(signedAmount, tradeType, note);

  return {
    date,
    category,
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
  return WECHAT_BILL_HEADERS.every((header) => normalized.includes(header));
}

function resolveColumnIndexes(headers: string[]): WechatBillColumnIndexes {
  const indexes: WechatBillColumnIndexes = {
    time: headers.indexOf('交易时间'),
    tradeType: headers.indexOf('交易类型'),
    counterparty: headers.indexOf('交易对方'),
    product: headers.indexOf('商品'),
    incomeExpense: headers.indexOf('收/支'),
    amount: headers.indexOf('金额(元)'),
  };

  if (Object.values(indexes).some((index) => index === -1)) {
    throw new Error('微信账单列缺失，无法导入');
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

  const normalized = normalizeCell(value).replace(/[¥￥,\s]/g, '').replace(/^[-+]/, '');
  if (!normalized) {
    return null;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isNaN(amount) ? null : Math.abs(amount);
}

function signAmount(amount: number, incomeExpense: string, tradeType: string): number {
  if (incomeExpense === '收入') {
    return Math.abs(amount);
  }

  if (incomeExpense === '支出') {
    return -Math.abs(amount);
  }

  if (tradeType.includes('退款')) {
    return Math.abs(amount);
  }

  return -Math.abs(amount);
}

function buildNote(product: string, tradeType: string, counterparty: string): string {
  const base = product && product !== '/' ? product : tradeType;
  return counterparty && counterparty !== '/' ? `${base} - ${counterparty}` : base;
}

function guessCategory(amount: number, tradeType: string, note: string): string {
  if (amount > 0) {
    return tradeType.includes('工资') ? '工资' : '其他';
  }

  const fullText = `${tradeType} ${note}`.toLowerCase();
  const isConsumption = EXPENSE_KEYWORDS.some((keyword) => fullText.includes(keyword.toLowerCase()));
  return isConsumption ? '消费' : '其他';
}
