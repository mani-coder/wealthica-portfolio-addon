import moment, { Moment } from 'moment';
import { DATE_FORMAT } from './constants';
import { PortfolioData, Position, Security } from './types';

export const isValidPortfolioData = (data: PortfolioData): boolean => {
  return Boolean(data.deposit || data.income || data.interest || data.value || data.withdrawal);
};

export const getDate = (date: string): Moment => {
  return moment(date.slice(0, 10), DATE_FORMAT);
};

export const getCurrencyInCAD = (date: Moment | string, value: number, currencyCache: any): number => {
  const multiplier = currencyCache[typeof date === 'string' ? date : date.format(DATE_FORMAT)];
  if (multiplier) {
    return value / multiplier;
  } else {
    const latestDate = Object.keys(currencyCache).sort((a, b) => b.localeCompare(a))[0];
    return latestDate ? value / currencyCache[latestDate] : value;
  }
};

export const formatMoney = (amount?: number, precision?: number): string => {
  precision = precision === undefined || precision === null ? 2 : precision;
  if (amount === undefined || amount === null) {
    return '-';
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

function getRandomInt(n) {
  return Math.floor(Math.random() * n);
}
export function shuffle(s: string) {
  var arr = s.split(''); // Convert String to array
  var n = arr.length; // Length of the array

  for (var i = 0; i < n - 1; ++i) {
    var j = getRandomInt(n); // Get random of [0, n-1]

    var temp = arr[i]; // Swap arr[i] and arr[j]
    arr[i] = arr[j];
    arr[j] = temp;
  }

  s = arr.join(''); // Convert Array to string
  return s; // Return shuffled string
}

export const getSymbol = (security: Security): string => {
  return `${security.symbol || security.name}${security.currency === 'usd' || security.type === 'crypto' ? '' : '.TO'}`;
};

export const getNasdaqTicker = (security: Security): string =>
  security.currency === 'cad' ? `TSE:${security.symbol}` : security.symbol;

export const getSymbolFromNasdaqTicker = (ticker: string) =>
  ticker.startsWith('TSE:') ? `${ticker.replace('TSE:', '')}.TO` : ticker;

export const min = (data: any[], field: string): any => {
  return data.reduce((min, p) => (p[field] < min[field] ? p : min), data[0]);
};

export const max = (data: any[], field: string): any => {
  return data.reduce((max, p) => (p[field] > max[field] ? p : max), data[0]);
};

export const formatCurrency = (amount: number, digits: number) => {
  var si = [
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'K' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var i;
  for (i = si.length - 1; i > 0; i--) {
    if (Math.abs(amount) >= si[i].value) {
      break;
    }
  }
  const formattedAmount = (Math.abs(amount) / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol;
  return amount < 0 ? `-${formattedAmount}` : formattedAmount;
};

export const getURLParams = (values: { [id: string]: string }): string => {
  return Object.keys(values)
    .map(function (key) {
      return key + '=' + values[key];
    })
    .join('&');
};

export function buildCorsFreeUrl(target: string): string {
  return `https://cors.bridged.cc/${target}`;
}

export function getPreviousWeekday(date) {
  const referenceDate = moment(date);
  let day = referenceDate.day();
  let diff = 1; // returns yesterday
  if (day === 0 || day === 1) {
    // is Sunday or Monday
    diff = day + 2; // returns Friday
  }
  return referenceDate.subtract(diff, 'days');
}

export function setLocalCache(name, value) {
  try {
    window.localStorage.setItem(name, value);
  } catch {}
}

export function getLocalCache(name) {
  try {
    return window.localStorage.getItem(name);
  } catch {}
}

export function normalizeAccountType(type: string): string {
  type = type ? type.toUpperCase() : '';
  if (type.includes('SRRSP')) {
    return 'SRRSP';
  } else if (type.includes('RRSP') || type.includes('REGISTERED RETIREMENT SAVINGS PLAN')) {
    return 'RRSP';
  } else if (type.includes('TFSA') || type.includes('TAX FREE SAVINGS PLAN')) {
    return 'TFSA';
  } else if (type.toLocaleUpperCase() === 'CASH' || type.toLocaleUpperCase() === 'MARGIN') {
    return 'Margin';
  } else {
    return type;
  }
}

export function computeBookValue(position: Position) {
  const transactions = position.transactions;
  if (!transactions || !transactions.length || position.book_value) {
    return;
  }
  const book = transactions
    .filter((t) => ['buy', 'sell'].includes(t.type))
    .reduce(
      (book, t) => {
        if (t.type === 'buy') {
          book.value += t.price * t.shares;
          book.shares += t.shares;
          book.price = book.shares ? book.value / book.shares : t.price;
        } else {
          book.value += (book.price || t.price) * t.shares;
          book.shares += t.shares;
        }
        return book;
      },
      { price: 0, shares: 0, value: 0 } as { price: number; shares: number; value: number },
    );

  position.book_value = book.value;
  position.gain_amount = position.market_value - book.value;
  position.gain_percent = position.gain_amount / position.book_value;
  const investment = position.investments ? position.investments[0] : undefined;
  if (investment && !investment.book_value) {
    investment.book_value = position.book_value;
  }
}
