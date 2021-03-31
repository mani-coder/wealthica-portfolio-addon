import moment, { Moment } from 'moment';
import { DATE_FORMAT } from './constants';
import { PortfolioData, Security } from './types';

export const isValidPortfolioData = (data: PortfolioData): boolean => {
  return Boolean(data.deposit || data.income || data.interest || data.value || data.withdrawal);
};

export const getDate = (date: string): Moment => {
  return moment(date.slice(0, 10), DATE_FORMAT);
};

export const getCurrencyInCAD = (date: Moment, value: number, currencyCache: any): number => {
  const multiplier = currencyCache[date.format(DATE_FORMAT)];
  return multiplier ? value / multiplier : value;
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

export const getSymbol = (security: Security): string => {
  return `${security.symbol || security.name}${security.currency === 'usd' ? '' : '.TO'}`;
};

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
