import { Moment } from 'moment';

// This is the data of the portfolio on the single day.
export type PortfolioData = {
  value?: number; // combined portfolio value on a given day
  deposit?: number; // total deposits on a given day
  withdrawal?: number; // total withdrwals on a given day
  income?: number; // total income on a given day
  interest?: number; // total interest on a given day
};

export type Portfolio = {
  date: string;
  value: number; // combined portfolio value on a given day
  deposits: number; // total deposits until this day.
};

export type Security = {
  id: string;
  currency: string;
  symbol: string;
  type: string;
  name: string;
  last_price: number;
  high_date: Date;
  high_price: number;
  low_date: Date;
  low_price: number;
  last_date: string;
  aliases: string[];
};

export type Investment = {
  quantity: number;
  book_value: number;
  currency: string;
};

export type Transaction = {
  date: Moment;
  symbol: string;
  amount: number;
  currency: string;
  type: string;
  price: number;
  shares: number;
  description: string;
  fees?: number;
  account: string;
  splitRatio?: number;
  securityType?: string;
};

export type AccountTransaction = {
  date: Moment;
  amount: number;
  type: string;
  account: string;
  description: string;
};

export type Position = {
  class: string;
  security: Security;
  value: number;
  book_value: number;
  market_value: number;
  quantity: number;
  gain_percent: number;
  gain_currency_amount: number;
  currency: string;
  gain_amount: number;
  investments: Investment[];
  transactions: Transaction[];
};

export type Account = {
  id: string;
  name: string;
  type: string;
  group: string;
  currency: string;
  cash: number;
  value: number;
  currency_value: number;
  created_at: Moment;
  institution: string;
  instutitionName: string;
  positions: (Position & { symbol: string })[];
};
