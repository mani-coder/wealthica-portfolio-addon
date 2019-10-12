import { getDate, getCurrencyInCAD, getSymbol } from './utils';
import { DATE_FORMAT } from './constants';
import { Position, Account, Transaction } from './types';

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
    .filter(institution => !institutions || !institutions.length || institutions.includes(institution.id))
    .reduce((accounts, instutition) => {
      return accounts.concat(
        instutition.investments
          .filter(account => (!groups || !groups.length || groups.includes(account.group)) && !account.ignored)
          .map(account => {
            return {
              id: account._id,
              institution: instutition.id,
              name: instutition.name,
              created_at: getDate(instutition.creation_date),
              type: account.name && account.name.includes('-') ? account.name.split('-')[1].trim() : account.name,
              cash: account.cash,
              value: account.value,
              currency: account.currency,
              positions: (account.positions || []).map(position => ({
                symbol: getSymbol(position.security),
                quantity: position.quantity,
              })),
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

export const parseTransactionsResponse = (response: any, currencyCache: any, accounts: Account[]) => {
  return response.reduce((hash, transaction) => {
    const type = transaction.type;
    if (['sell', 'buy', 'unknown'].includes(type)) {
      return hash;
    }
    let date = getDate(transaction.date);
    if (['deposit', 'transfer', 'withdrawal'].includes(type)) {
      // adjust the date of transaction, so that portfolio isn't screw'd up.
      const account = accounts.find(account => account.institution === transaction.institution);
      if (account && account.created_at > date) {
        console.debug('Aligning transaction date with the account creation date', account, transaction);
        date = account.created_at;
      }
    }

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
      console.debug('Unhandled type', type);
    }
    hash[dateKey] = portfolioData;
    return hash;
  }, {});
};

export const parseSecurityTransactionsResponse = (response: any, currencyCache: any): Transaction[] => {
  return response
    .filter(
      transaction =>
        ['sell', 'buy', 'income', 'dividend', 'distribution', 'tax', 'fee'].includes(transaction.type.toLowerCase()) &&
        transaction.security,
    )
    .map(transaction => {
      const date = getDate(transaction.date);

      let amount = Number(transaction.currency_amount);
      amount =
        transaction.investment && transaction.investment.includes(':usd')
          ? getCurrencyInCAD(date, amount, currencyCache)
          : amount;

      return {
        date,
        symbol: getSymbol(transaction.security),
        price: Math.abs(transaction.currency_amount / transaction.quantity).toFixed(3),
        type: transaction.type,
        amount: Math.abs(amount),
        currency: transaction.security.currency,
        shares: transaction.quantity,
        fees: transaction.fee,
      };
    });
};

export const parsePositionsResponse = (response: any): Position[] => {
  return response.map(position => {
    return position as Position;
  });
};
