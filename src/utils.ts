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
