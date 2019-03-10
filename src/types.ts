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
  currency: string;
  symbol: string;
  type: string;
  name: string;
  last_price: number;
  high_date: Date;
  high_price: number;
  low_date: Date;
  low_price: number;
  last_date: Date;
  aliases: string[];
};

export type Position = {
  security: Security;
  value: number;
  book_value: number;
  market_value: number;
  quantity: number;
  gain_percent: number;
  gain_currency_amount: number;
  currency: string;
  gain_amount: number;
};