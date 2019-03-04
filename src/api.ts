import { getDate, getCurrencyInCAD } from "./utils";
import { DATE_FORMAT } from "./constants";
import { PortfolioData } from "./types";

export const parseCurrencyReponse = (response: any) => {
  const date = getDate(response.from);
  return response.data.reduce((hash, value) => {
    if (!!value) {
      hash[date.format(DATE_FORMAT)] = Number(value);
    }
    // Move the date forward.
    date.add(1, "days");
    return hash;
  }, {});
};

export const parsePortfolioResponse = (response: any) => {
  const data = response.history.total;
  const date = getDate(data.from);
  return data.data.reduce((hash, value) => {
    if (!!value) {
      hash[date.format(DATE_FORMAT)] = Number(value);
    }

    // Move the date forward.
    date.add(1, "days");
    return hash;
  }, {});
};

export const parseTransactionsResponse = (
  response: any,
  currencyCache: any
) => {
  return response.reduce((hash, transaction) => {
    const type = transaction.type;
    if (["sell", "buy", "transfer"].includes(type)) {
      return hash;
    }
    const date = getDate(transaction.date);
    const portfolioData = hash[date.format(DATE_FORMAT)]
      ? hash[date.format(DATE_FORMAT)]
      : {
          deposit: 0,
          withdrawal: 0,
          interest: 0,
          income: 0
        };

    let amount = Number(transaction.currency_amount);
    amount =
      transaction.investment && ":usd" in transaction.investment
        ? getCurrencyInCAD(date, amount, currencyCache)
        : amount;

    if (type == "deposit" && portfolioData) {
      portfolioData.deposit += amount;
    } else if (["fee", "interest", "tax"].includes(type)) {
      portfolioData.interest += amount;
    } else if (["income", "dividend", "distribution"].includes(type)) {
      portfolioData.income += amount;
    } else if (type == "withdrawal") {
      portfolioData.withdrawal += amount;
    } else {
      console.error("Unknown type", type);
    }
    return hash;
  }, {});
};
