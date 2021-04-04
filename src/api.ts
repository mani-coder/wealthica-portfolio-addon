import { DATE_FORMAT } from './constants';
import { Account, Position, Transaction } from './types';
import { getCurrencyInCAD, getDate, getSymbol, normalizeAccountType } from './utils';

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

export const parseGroupNameByIdReponse = (response: any): { [K: string]: string } =>
  (response || []).reduce((hash, group) => {
    hash[group._id] = group.name;
    return hash;
  }, {});

export const parseInstitutionsResponse = (response: any, groups?: string[], institutions?: string[]): Account[] => {
  const accounts: Account[] = [];
  return response
    .filter((institution) => !institutions || !institutions.length || institutions.includes(institution.id))
    .reduce((accounts, instutition) => {
      return accounts.concat(
        instutition.investments
          .filter((account) => (!groups || !groups.length || groups.includes(account.group)) && !account.ignored)
          .map((account) => {
            return {
              id: account._id,
              institution: instutition.id,
              name: instutition.name,
              created_at: getDate(instutition.creation_date),
              type: normalizeAccountType(
                account.name && account.name.includes('-') ? account.name.split('-')[1].trim() : account.name,
              ),
              group: account.group,
              cash: account.cash,
              value: account.value,
              currency_value: account.currency_value,
              currency: account.currency,
              positions: (account.positions || []).map((position) => ({
                ...position,
                symbol: getSymbol(position.security),
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
  return response
    .filter((t) => !t.deleted)
    .reduce((hash, transaction) => {
      const type = transaction.type;
      if (['sell', 'buy', 'unknown'].includes(type)) {
        return hash;
      }
      let date = getDate(transaction.date);
      if (['deposit', 'transfer', 'withdrawal'].includes(type)) {
        // adjust the date of transaction, so that portfolio isn't screw'd up.
        const account = accounts.find((account) => account.institution === transaction.institution);
        if (account && account.created_at > date) {
          // console.debug('Aligning transaction date with the account creation date', account, transaction);
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
        if (
          // FX and journal over shouldn't be treated as deposits.
          !['FXT', 'BRW'].includes(transaction.origin_type) &&
          // Security transfer over..
          !transaction.symbol
        ) {
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
    .filter((t) => !t.deleted && t.type)
    .filter(
      (transaction) =>
        ['sell', 'buy', 'income', 'dividend', 'distribution', 'tax', 'fee'].includes(transaction.type.toLowerCase()) &&
        (transaction.security || transaction.symbol),
    )
    .map((transaction) => {
      const date = getDate(transaction.date);

      let amount = Number(transaction.currency_amount);
      amount =
        transaction.investment && transaction.investment.includes(':usd')
          ? getCurrencyInCAD(date, amount, currencyCache)
          : amount;

      return {
        date,
        account: transaction.investment,
        symbol: transaction.security ? getSymbol(transaction.security) : transaction.symbol,
        price:
          transaction.currency_amount && transaction.quantity
            ? Number(Math.abs(transaction.currency_amount / transaction.quantity).toFixed(3))
            : 0,
        type: transaction.type,
        amount: Math.abs(amount),
        currency: transaction.security ? transaction.security.currency : 'USD',
        shares: transaction.quantity || 0,
        fees: transaction.fee,
      };
    });
};

export const parsePositionsResponse = (response: any): Position[] => {
  return response.map((position) => {
    return position as Position;
  });
};
