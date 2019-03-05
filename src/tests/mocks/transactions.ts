export const CURRENCY_RESPONSE_JSON = {
  from: "2019-01-01T00:00:00.000Z",
  to: "2019-01-04T00:00:00.000Z",
  data: [null, 0.73529, null, 0.73303]
};

export const PORTFOLIO_RESPONSE_JSON = {
  history: {
    total: {
      from: "2019-01-01T00:00:00.000Z",
      to: "2019-01-04T00:00:00.000Z",
      data: [88954.36194428605, null, null, 92172.01774180311]
    }
  }
};

export const TRANSACTIONS_RESPONSE_JSON = [
  {
    date: "2019-01-02T00:00:00.000Z",
    settlement_date: "2019-01-02T00:00:00.000Z",
    origin_type: "DIV",
    fee: 0,
    type: "dividend",
    processing_date: "2019-01-02T00:00:00.000Z",
    currency_amount: 4.42,
    investment: "27038389:margin:usd"
  },
  {
    date: "2019-01-03T00:00:00.000Z",
    settlement_date: "2019-01-03T00:00:00.000Z",
    origin_type: "CON",
    description: "PAD CONT 5187115711",
    quantity: 0,
    fee: 0,
    type: "deposit",
    processing_date: "2019-01-03T00:00:00.000Z",
    currency_amount: 1000,
    investment: "51871157:tfsa:cad"
  },
  {
    date: "2019-01-03T00:00:00.000Z",
    settlement_date: "2019-01-03T00:00:00.000Z",
    origin_type: "CON",
    description: "PAD CONT 5187115612",
    quantity: 0,
    fee: 0,
    type: "deposit",
    processing_date: "2019-01-03T00:00:00.000Z",
    currency_amount: 1000,
    investment: "51871156:tfsa:cad"
  }
];
