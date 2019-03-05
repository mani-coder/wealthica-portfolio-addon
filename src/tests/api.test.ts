import {
  parseCurrencyReponse,
  parsePortfolioResponse,
  parseTransactionsResponse
} from "../api";
import {
  CURRENCY_RESPONSE_JSON,
  PORTFOLIO_RESPONSE_JSON,
  TRANSACTIONS_RESPONSE_JSON
} from "./mocks/response-data";

test("Verify Currency Response Parsing", () => {
  const cache = parseCurrencyReponse(CURRENCY_RESPONSE_JSON);
  expect(cache).toEqual({
    "2019-01-02": 0.73529,
    "2019-01-04": 0.73303
  });
});

test("Verify Portfolio Response Parsing", () => {
  const data = parsePortfolioResponse(PORTFOLIO_RESPONSE_JSON);
  expect(data).toEqual({
    "2019-01-01": 88954.36194428605,
    "2019-01-04": 92172.01774180311
  });
});

test("Verify Transactions Response Parsing", () => {
  const data = parseTransactionsResponse(
    TRANSACTIONS_RESPONSE_JSON,
    parseCurrencyReponse(CURRENCY_RESPONSE_JSON)
  );
  expect(data).toEqual({
    "2018-07-16": {
      deposit: 0,
      withdrawal: 0,
      income: 0,
      interest: 10.55
    },
    "2018-07-27": {
      deposit: 0,
      withdrawal: 50,
      income: 0,
      interest: 0
    },
    "2019-01-02": {
      deposit: 0,
      withdrawal: 0,
      income: 6.011233662908512,
      interest: 0
    },
    "2019-01-03": {
      deposit: 2000,
      withdrawal: 0,
      income: 0,
      interest: 0
    }
  });
});
