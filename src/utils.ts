import { PortfolioData, Security } from './types';
import moment, { Moment } from 'moment';
import { DATE_FORMAT } from './constants';

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

export const getSymbol = (security: Security): string => {
  return `${security.symbol}${security.currency === 'usd' ? '' : '.TO'}`;
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
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
    { value: 1e9, symbol: 'G' },
    { value: 1e12, symbol: 'T' },
    { value: 1e15, symbol: 'P' },
    { value: 1e18, symbol: 'E' },
  ];
  var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var i;
  for (i = si.length - 1; i > 0; i--) {
    if (amount >= si[i].value) {
      break;
    }
  }
  return (amount / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol;
};
