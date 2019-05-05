import { getDate, getCurrencyInCAD } from './utils';
import { DATE_FORMAT } from './constants';
import { Position, Account } from './types';

export const parseCurrencyReponse = (response: any) => {
  const date = getDate(response.from);
  return response.data.reduce((hash, value) => {
    if (!!value) {
      hash[date.format(DATE_FORMAT)] = Number(value);
    }
    // Move the date forward.
    date.add(1, 'days');
    return hash;
  }, {});
};

export const parseInstitutionsResponse = (response: any, groups?: string[], institutions?: string[]): Account[] => {
  const accounts: Account[] = [];
  return response
    .filter(institution => !institutions || institutions.includes(institution.id))
    .reduce((accounts, instutition) => {
      return accounts.concat(
        instutition.investments
          .filter(account => !groups || groups.includes(account.group))
          .map(account => {
            return {
              id: account._id,
              cash: account.cash,
              value: account.value,
              currency: account.currency,
            };
          }),
      );
    }, accounts);
};

export const parsePortfolioResponse = (response: any) => {
  const data = response.history.total;
  const date = getDate(data.from);
  return data.data.reduce((hash, value) => {
    if (!!value) {
      hash[date.format(DATE_FORMAT)] = Number(value);
    }

    // Move the date forward.
    date.add(1, 'days');
    return hash;
  }, {});
};

export const parseTransactionsResponse = (response: any, currencyCache: any) => {
  return response.reduce((hash, transaction) => {
    const type = transaction.type;
    if (['sell', 'buy', 'unknown'].includes(type)) {
      return hash;
    }
    const date = getDate(transaction.date);
    const dateKey = date.format(DATE_FORMAT);
    const portfolioData = hash[dateKey]
      ? hash[dateKey]
      : {
          deposit: 0,
          withdrawal: 0,
          interest: 0,
          income: 0,
        };

    let amount = Number(transaction.currency_amount);
    amount =
      transaction.investment && transaction.investment.includes(':usd')
        ? getCurrencyInCAD(date, amount, currencyCache)
        : amount;

    if (['deposit'].includes(type)) {
      portfolioData.deposit += amount;
    } else if (type === 'transfer') {
      if (transaction.origin_type === 'CON') {
        portfolioData.deposit += amount;
      }
    } else if (['fee', 'interest', 'tax'].includes(type)) {
      portfolioData.interest += Math.abs(amount);
    } else if (['income', 'dividend', 'distribution'].includes(type)) {
      portfolioData.income += amount;
    } else if (type === 'withdrawal') {
      portfolioData.withdrawal += Math.abs(amount);
    } else {
      console.error('Unknown type', type);
    }
    hash[dateKey] = portfolioData;
    return hash;
  }, {});
};

export const parsePositionsResponse = (response: any): Position[] => {
  return response.map(position => {
    return position as Position;
  });
};
