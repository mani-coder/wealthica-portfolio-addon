/* eslint-disable no-template-curly-in-string */
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';
import _ from 'lodash';
import moment, { Moment } from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { TYPE_TO_COLOR } from '../constants';
import { Position, Transaction } from '../types';
import { buildCorsFreeUrl, formatCurrency, formatMoney, getDate } from '../utils';
import Charts from './Charts';

type Props = {
  symbol: string;
  position: Position;
  isPrivateMode: boolean;
  addon?: any;
};

type StockPrice = {
  timestamp: Moment;
  closePrice: number;
};

function StockPnLTimeline({ isPrivateMode, symbol, position, addon }: Props) {
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<StockPrice[]>([]);

  function parseSecuritiesResponse(response) {
    const to = getDate(response.to);
    const data: StockPrice[] = [];
    let prevPrice;
    response.data
      .filter((closePrice) => closePrice)
      .reverse()
      .forEach((closePrice: number) => {
        if (!prevPrice) {
          prevPrice = closePrice;
        }
        const changePercentage = Math.abs((closePrice - prevPrice) / closePrice) * 100;
        if (changePercentage > 100) {
          closePrice = prevPrice;
        }
        // Only weekdays.
        if (to.isoWeekday() <= 5) {
          data.push({ timestamp: to.clone(), closePrice });
        }

        // Move the date forward.
        to.subtract(1, 'days');
        prevPrice = closePrice;
      });

    const sortedData = data.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf());
    setPrices(sortedData);
  }

  useEffect(() => {
    if (symbol) {
      setLoading(true);

      trackEvent('stock-pnl-timeline');

      const startDate =
        position.transactions && position.transactions.length ? position.transactions[0].date : moment();
      if (addon) {
        addon
          .request({
            query: {},
            method: 'GET',
            endpoint: `securities/${position.security.id}/history?from=${startDate.format('YYYY-MM-DD')}`,
          })
          .then((response) => parseSecuritiesResponse(response))
          .catch((error) => {
            console.log('Failed to load stock prices.', error);
            setPrices([]);
          })
          .finally(() => setLoading(false));
      } else {
        const url = `https://app.wealthica.com/api/securities/${position.security.id}/history?from=${startDate.format(
          'YYYY-MM-DD',
        )}`;
        fetch(buildCorsFreeUrl(url), {
          cache: 'force-cache',
          headers: { 'Content-Type': 'application/json' },
        })
          .then((response) => response.json())
          .then((response) => parseSecuritiesResponse(response))
          .catch((error) => {
            console.log('Failed to load stock prices.', error);
            setPrices([]);
          })
          .finally(() => setLoading(false));
      }
    }
  }, [symbol, addon, position]);

  function getNextWeekday(date) {
    const referenceDate = moment(date);
    let day = referenceDate.day();
    let diff = day === 6 ? 2 : day === 0 ? 1 : 0;
    return (diff ? referenceDate.add(diff, 'days') : referenceDate).format('YYYY-MM-DD');
  }

  function getSeries(): any[] {
    const book: { [K: string]: { shares: number; price: number } } = {};
    let prevEntry;
    position.transactions
      .filter((t) => ['buy', 'sell'].includes(t.type))
      .forEach((t) => {
        const date = getNextWeekday(t.date.clone());
        let entry = book[date];
        if (!prevEntry) {
          entry = { shares: t.shares, price: t.price };
        } else if (entry) {
          const shares = entry.shares + t.shares;
          entry = {
            price: shares ? (entry.price * entry.shares + t.price * t.shares) / shares : t.price,
            shares,
          };
        } else {
          const shares = prevEntry.shares + t.shares;
          entry = {
            price: shares ? (prevEntry.price * prevEntry.shares + t.price * t.shares) / shares : t.price,
            shares,
          };
        }
        book[date] = entry;
        prevEntry = entry.shares ? entry : undefined;
      });

    const data: { x: number; y: number; pnl: string; currency: string }[] = [];
    let _entry;
    prices.forEach((price) => {
      const entry = book[price.timestamp.format('YYYY-MM-DD')];
      _entry = entry ? entry : _entry;
      if (_entry && _entry.shares) {
        const bookValue = _entry.price * _entry.shares;
        const marketValue = price.closePrice * _entry.shares;
        data.push({
          x: price.timestamp.valueOf(),
          y: ((price.closePrice - _entry.price) / _entry.price) * 100,
          pnl: isPrivateMode ? '-' : formatMoney(marketValue - bookValue),
          currency: position.security.currency.toUpperCase(),
        });
      }
    });

    return [
      {
        id: 'dataseries',
        name: symbol,
        data,
        type: 'spline',

        tooltip: {
          pointFormat: '<b>{point.y:.2f}%</b> <br /><br /> {point.pnl} {point.currency}',
          valueDecimals: 2,
          split: true,
        },
      },
      ...['buy', 'sell', 'income', 'dividend', 'distribution', 'tax', 'fee'].map((type) => getFlags(type)),
    ];
  }

  function getFlags(type: string): any {
    const isBuySell = ['buy', 'sell'].includes(type);

    return {
      name: _.startCase(type),
      shape: 'squarepin',
      type: 'flags',
      width: 25,

      tooltip: {
        pointFormat: '<b>{point.text}</b>',
        valueDecimals: 2,
        split: true,
      },

      data: position.transactions
        .filter((t) => t.type === type)
        .sort((a, b) => a.date.valueOf() - b.date.valueOf())
        .reduce((array, transaction) => {
          const lastTransaction = array.pop();
          if (lastTransaction && lastTransaction.date.valueOf() === transaction.date.valueOf()) {
            array.push({
              ...lastTransaction,
              shares:
                transaction.shares && lastTransaction.shares
                  ? lastTransaction.shares + transaction.shares
                  : lastTransaction.shares,
              amount: transaction.amount + lastTransaction.amount,
              price:
                transaction.price && lastTransaction.price
                  ? (Number(transaction.price) + Number(lastTransaction.price)) / 2
                  : lastTransaction.price,
            });
          } else {
            if (lastTransaction) {
              array.push(lastTransaction);
            }
            array.push(transaction);
          }
          return array;
        }, [] as Transaction[])
        .map((transaction) => {
          return {
            transaction,
            x: transaction.date.valueOf(),
            title: isBuySell ? Math.round(transaction.shares!) : type.charAt(0).toUpperCase(),
            text: isBuySell
              ? `${_.startCase(type)}: ${transaction.shares}@${formatMoney(transaction.price)}`
              : `${_.startCase(type)}: $${formatCurrency(transaction.amount, 2)}`,
          };
        }),
      color: TYPE_TO_COLOR[type],
      fillColor: TYPE_TO_COLOR[type],
      style: {
        color: 'white', // text style
      },
    };
  }

  function getOptions(series: Highcharts.SeriesLineOptions[]): Highcharts.Options {
    const dividends = position.transactions
      .filter((transaction) => transaction.type === 'dividend')
      .reduce((dividend, transaction) => dividend + transaction.amount, 0);

    return {
      title: {
        text: `P/L Timeline for ${symbol}`,
        style: {
          color: '#1F2A33',
          textDecoration: 'underline',
          fontWeight: 'bold',
        },
      },
      subtitle: {
        text: isPrivateMode
          ? 'Shares: -, Value: -, P/L: -'
          : `Shares: ${position.quantity}@${formatMoney(
              position.investments.reduce((cost, investment) => {
                return cost + investment.book_value;
              }, 0) / position.quantity,
            )}, Value: $${formatCurrency(position.book_value, 2)}, P/L: $${formatCurrency(position.gain_amount, 2)}${
              dividends ? `, Dividends: $${formatCurrency(dividends, 2)}` : ''
            }`,
        style: {
          color: '#1F2A33',
          fontWeight: 'bold',
        },
      },

      rangeSelector: {
        selected: 1,
        enabled: true,
        inputEnabled: false,
      },

      scrollbar: {
        barBackgroundColor: 'gray',
        barBorderRadius: 7,
        barBorderWidth: 0,
        buttonBackgroundColor: 'gray',
        buttonBorderWidth: 0,
        buttonBorderRadius: 7,
        trackBackgroundColor: 'none',
        trackBorderWidth: 1,
        trackBorderRadius: 8,
        trackBorderColor: '#CCC',
      },

      plotOptions: {
        spline: {
          gapSize: 15,
          zones: [
            {
              value: -0.00000001,
              color: '#FF897C',
            },
            {
              color: '#84C341',
            },
          ],
        },
      },

      yAxis: [
        {
          crosshair: {
            dashStyle: 'Dash',
          },
          labels: {
            format: '{value}%',
          },
          title: {
            text: 'P/L %',
          },
          opposite: false,
        },
      ],
      navigator: {
        enabled: false,
      },
      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              chart: {
                height: 300,
              },
              subtitle: {
                text: undefined,
              },
            },
          },
        ],
      },
      series,
      legend: {
        enabled: true,
      },
    };
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getOptions(getSeries()), [symbol, position, prices]);

  return (
    <>
      <hr />
      {loading ? (
        <Flex justifyContent="center" height={300} alignItems="center">
          <Spin size="large" />
        </Flex>
      ) : !prices || !prices.length ? (
        <Empty description={`Can't load stock price for ${symbol}`} />
      ) : (
        <Charts constructorType={'stockChart'} options={options} />
      )}
      <hr />
    </>
  );
}

export default React.memo(StockPnLTimeline);
