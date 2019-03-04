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
  value?: number; // combined portfolio value on a given day
  deposit?: number; // total deposits until this day.
};
