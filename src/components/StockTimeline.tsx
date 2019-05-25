import _ from 'lodash';
import moment from 'moment';
import React, { Component } from 'react';
import Loader from 'react-loader-spinner';
import { TYPE_TO_COLOR } from '../constants';
import { Position, Transaction } from '../types';
import { formatCurrency } from '../utils';
import Charts from './Charts';

type Props = {
  symbol: string;
  position: Position;
};

type State = {
  loading: boolean;
  data?: any;
};

class StockTimeline extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: true,
    };
    this._mounted = false;
  }
  _mounted: boolean;

  componentDidMount() {
    this._mounted = true;
    this.fetchData();
  }

  componentDidUpdate(nextProps: Props) {
    if (this.props.symbol != nextProps.symbol) {
      this.fetchData();
    }
  }
  componentWillUnmount() {
    this._mounted = false;
  }

  fetchData() {
    if (!this._mounted) {
      return;
    }

    this.setState({ loading: true });
    const startDate = (this.props.position.transactions && this.props.position.transactions.length
      ? this.props.position.transactions[0].date
      : moment()
    )
      .clone()
      .subtract('months', 1);
    const endDate = moment().unix();

    const url = `https://query1.finance.yahoo.com/v7/finance/chart/${
      this.props.symbol
    }?period1=${startDate.unix()}&period2=${endDate}&interval=1d&events=history`;

    console.log('Fetching stock data..', url);

    fetch(`https://cors-anywhere.herokuapp.com/${url}`, {
      cache: 'force-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(response => {
        if (this._mounted) {
          this.setState({ loading: false, data: response });
        }
      })
      .catch(error => console.log(error));
  }

  getSeries(): any {
    if (this.state.data.chart.error) {
      return [{}];
    }
    const timestamps = this.state.data.chart.result[0].timestamp;
    const closePrices = this.state.data.chart.result[0].indicators.quote[0].close;

    const data: { x: number; y: number }[] = [];
    let minPrice, maxPrice, minTimestamp, maxTimestamp;
    timestamps.forEach((timestamp, index) => {
      data.push({
        x: timestamp * 1000,
        y: closePrices[index],
      });
      if (index === 0) {
        maxPrice = minPrice = closePrices[index];
        minTimestamp = maxTimestamp = timestamp;
      }
      if (closePrices[index] < minPrice) {
        minPrice = closePrices[index];
        minTimestamp = timestamp;
      }
      if (closePrices[index] > maxPrice) {
        maxPrice = closePrices[index];
        maxTimestamp = timestamp;
      }
    });

    return [
      {
        id: 'dataseries',
        name: this.props.symbol,
        data,
        type: 'line',

        tooltip: {
          valueDecimals: 2,
        },
      },
      {
        name: 'High/Low',
        shape: 'circlepin',
        type: 'flags',

        tooltip: {
          pointFormat: '<b>{point.text}</b>',
          valueDecimals: 2,
          split: true,
        },

        data: [
          {
            x: minTimestamp * 1000,
            title: 'L',
            text: `Low Price: $${formatCurrency(minPrice, 2)}`,
          },
          {
            x: maxTimestamp * 1000,
            title: 'H',
            text: `High Price: $${formatCurrency(maxPrice, 2)}`,
          },
        ],
        color: '#7cb5ec',
        fillColor: '#7cb5ec',
        style: {
          color: 'white',
        },
      },
      this.getFlags('buy'),
      this.getFlags('sell'),
      this.getFlags('income', true),
      this.getFlags('dividend', true),
      this.getFlags('distribution', true),
      this.getFlags('tax', true),
      this.getFlags('fee', true),
    ];
  }

  getFlags = (type: string, onSeries?: boolean): any => {
    const isBuySell = ['buy', 'sell'].includes(type);

    return {
      name: _.startCase(type),
      shape: 'squarepin',
      type: 'flags',
      onSeries: onSeries ? undefined : 'dataseries',
      width: 25,

      tooltip: {
        pointFormat: '<b>{point.text}</b>',
        valueDecimals: 2,
        split: true,
      },

      data: this.props.position.transactions
        .filter(t => t.type === type)
        .sort((a, b) => a.date.valueOf() - b.date.valueOf())
        .reduce(
          (array, transaction) => {
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
          },
          [] as Transaction[],
        )
        .map(transaction => {
          return {
            transaction,
            x: transaction.date.valueOf(),
            title: isBuySell ? transaction.shares : type.charAt(0).toUpperCase(),
            text: isBuySell
              ? `${transaction.shares}@${transaction.price}`
              : `${_.startCase(type)}: $${formatCurrency(transaction.amount, 2)}`,
          };
        }),
      color: TYPE_TO_COLOR[type],
      fillColor: TYPE_TO_COLOR[type],
      style: {
        color: 'white', // text style
      },
    };
  };

  getOptions(): Highcharts.Options {
    return {
      title: {
        text: `${this.props.symbol}`,
        style: {
          color: '#1F2A33',
          textDecoration: 'underline',
          fontWeight: 'bold',
        },
      },
      subtitle: {
        text: `Shares: ${this.props.position.quantity}, Value: $${formatCurrency(
          this.props.position.book_value,
          2,
        )}, Profit: $${formatCurrency(this.props.position.gain_amount, 2)}`,
        style: {
          color: '#1F2A33',
          fontWeight: 'bold',
        },
      },
      rangeSelector: {
        selected: 5,
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

      yAxis: [
        {
          title: {
            text: 'Price ($)',
          },
          opposite: false,
        },
        {
          linkedTo: 0,
        },
      ],
      tooltip: {
        pointFormat: '{series.name}: <b>${point.y}',
        valueDecimals: 2,
        split: true,
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
              navigator: {
                enabled: false,
              },
            },
          },
        ],
      },
      series: this.getSeries(),
      legend: {
        enabled: true,
      },
    };
  }

  render() {
    return this.state.loading ? (
      <div style={{ textAlign: 'center', margin: '12px' }}>
        <Loader type="Circles" color="#7f3eab" height="75" width="75" />
      </div>
    ) : (
      <Charts constructorType={'stockChart'} options={this.getOptions()} />
    );
  }
}

export default StockTimeline;
