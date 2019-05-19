export const CURRENCY_RESPONSE_JSON = {
  from: '2019-01-01T00:00:00.000Z',
  to: '2019-01-04T00:00:00.000Z',
  data: [null, 0.73529, null, 0.73303],
};

export const PORTFOLIO_RESPONSE_JSON = {
  history: {
    total: {
      from: '2019-01-01T00:00:00.000Z',
      to: '2019-01-04T00:00:00.000Z',
      data: [88954.36194428605, null, null, 92172.01774180311],
    },
  },
};

export const TRANSACTIONS_RESPONSE_JSON = [
  {
    date: '2018-07-16T00:00:00.000Z',
    settlement_date: '2018-07-16T00:00:00.000Z',
    origin_type: 'Interest',
    quantity: 0,
    fee: 0,
    type: 'interest',
    processing_date: '2018-07-16T00:00:00.000Z',
    currency_amount: -10.55,
    investment: '56356346:test:usd',
  },
  {
    date: '2018-07-27T00:00:00.000Z',
    settlement_date: '2018-07-27T00:00:00.000Z',
    origin_type: 'EFT',
    description: 'ELECTRONIC FUND TRANSFER',
    quantity: 0,
    fee: 0,
    type: 'withdrawal',
    processing_date: '2018-07-27T00:00:00.000Z',
    currency_amount: -50,
    investment: '56356346:test:cad',
  },
  {
    date: '2019-01-02T00:00:00.000Z',
    settlement_date: '2019-01-02T00:00:00.000Z',
    origin_type: 'DIV',
    fee: 0,
    type: 'dividend',
    processing_date: '2019-01-02T00:00:00.000Z',
    currency_amount: 4.42,
    investment: '56356346:test:usd',
  },
  {
    date: '2019-01-03T00:00:00.000Z',
    settlement_date: '2019-01-03T00:00:00.000Z',
    origin_type: 'CON',
    description: 'PAD CONT 452345511',
    quantity: 0,
    fee: 0,
    type: 'deposit',
    processing_date: '2019-01-03T00:00:00.000Z',
    currency_amount: 100,
    investment: '6356345:demo:cad',
  },
  {
    date: '2019-01-03T00:00:00.000Z',
    settlement_date: '2019-01-03T00:00:00.000Z',
    origin_type: 'CON',
    description: 'PAD CONT 452345512',
    quantity: 0,
    fee: 0,
    type: 'deposit',
    processing_date: '2019-01-03T00:00:00.000Z',
    currency_amount: 100,
    investment: '4523455:tfsa:cad',
  },
];
