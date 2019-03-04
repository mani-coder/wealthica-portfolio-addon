import { PortfolioData } from './types';
import moment, { Moment } from 'moment';
import { DATE_FORMAT } from './constants';


export const isValidPortfolioData = (data: PortfolioData): boolean => {
    return Boolean(data.deposit || data.income || data.interest || data.value || data.withdrawal);
};


export const getDate = (date: string): Moment => {
    return moment(date.slice(0, 10), DATE_FORMAT);
};


export const getCurrencyInCAD = (date: Moment, value: number, currencyCache: any): number => {
    return value / currencyCache.get(date);
}
