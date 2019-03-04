import { parseCurrencyReponse } from '../api';

const CURRENCY_RESPONSE_JSON = {
    "from": "2019-01-01T00:00:00.000Z",
    "to": "2019-01-04T00:00:00.000Z",
    "data": [
        0.73529,
        null,
        null,
        0.73303
    ]
};

test('Verify Currency Response Parsing', () => {
    const cache = parseCurrencyReponse(CURRENCY_RESPONSE_JSON);
    expect(cache).toEqual({
        "2019-01-01": 0.73529,
        "2019-01-04": 0.73303,
    });
});
