import _ from 'lodash';
import moment, { Moment } from 'moment';
import React, { Component } from 'react';
import Loader from 'react-loader-spinner';
import { TYPE_TO_COLOR } from '../constants';
import { Position, Transaction } from '../types';
import { formatCurrency, getDate } from '../utils';
import Charts from './Charts';

type Props = {
  symbol: string;
  position: Position;
  isPrivateMode: boolean;
  addon?: any;
};

type SecurityHistoryTimeline = {
  timestamp: Moment;
  closePrice: number;
};

type State = {
  loading: boolean;
  data?: SecurityHistoryTimeline[];
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

  parseSecuritiesResponse(response) {
    if (this._mounted) {
      const to = getDate(response.to);
      const data: SecurityHistoryTimeline[] = [];
      let prevPrice;
      response.data
        .filter(closePrice => closePrice)
        .reverse()
        .forEach((closePrice: number) => {
          if (!prevPrice) {
            prevPrice = closePrice;
          }
          const changePercentage = Math.abs((closePrice - prevPrice) / closePrice) * 100;
          if (changePercentage > 200) {
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

      console.debug('Loaded the securities data --', sortedData);
      this.setState({ loading: false, data: sortedData });
    }
  }

  fetchData() {
    if (!this._mounted) {
      return;
    }
    this.setState({ loading: true });

    if (this.props.addon) {
      this.props.addon
        .request({
          query: {},
          method: 'GET',
          endpoint: `securities/${this.props.position.security.id}/history`,
        })
        .then(response => {
          this.parseSecuritiesResponse(response);
        })
        .catch(error => console.log(error));
    } else {
      const url = `https://app.wealthica.com/api/securities/${this.props.position.security.id}/history`;
      console.debug('Fetching stock data..', url);

      fetch(`https://cors-anywhere.herokuapp.com/${url}`, {
        cache: 'force-cache',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(response => {
          this.parseSecuritiesResponse(response);
        })
        .catch(error => console.log(error));
    }
  }

  fetchDataUsingYahoo() {
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

    console.debug('Fetching stock data..', url);

    fetch(`https://cors-anywhere.herokuapp.com/${url}`, {
      cache: 'force-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(response => {
        if (this._mounted) {
          // this.state.data.chart.error.
          // const timestamps = this.state.data.chart.result[0].timestamp;
          // const closePrices = this.state.data.chart.result[0].indicators.quote[0].close;
          this.setState({ loading: false, data: response });
        }
      })
      .catch(error => console.log(error));
  }

  getSeries(): any {
    if (!this.state.data) {
      return [{}];
    }

    const data: { x: number; y: number }[] = [];
    let minPrice, maxPrice, minTimestamp, maxTimestamp;
    this.state.data.forEach((_data, index) => {
      const timestamp = _data.timestamp.valueOf();
      const closePrice = _data.closePrice;

      data.push({ x: timestamp, y: closePrice });

      if (index === 0) {
        maxPrice = minPrice = closePrice;
        minTimestamp = maxTimestamp = timestamp;
      }
      if (closePrice < minPrice) {
        minPrice = closePrice;
        minTimestamp = timestamp;
      }
      if (closePrice > maxPrice) {
        maxPrice = closePrice;
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
            x: minTimestamp,
            title: 'L',
            text: `Low Price: $${formatCurrency(minPrice, 2)}`,
          },
          {
            x: maxTimestamp,
            title: 'H',
            text: `High Price: $${formatCurrency(maxPrice, 2)}`,
          },
        ].sort((a, b) => a.x - b.x),
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
            title: isBuySell ? Math.round(transaction.shares!) : type.charAt(0).toUpperCase(),
            text: isBuySell
              ? `${_.startCase(type)}: ${transaction.shares}@${transaction.price}`
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
        text: this.props.isPrivateMode
          ? 'Shares: -, Value: -, Profit: -'
          : `Shares: ${this.props.position.quantity}, Value: $${formatCurrency(
              this.props.position.book_value,
              2,
            )}, Profit: $${formatCurrency(this.props.position.gain_amount, 2)}`,
        style: {
          color: '#1F2A33',
          fontWeight: 'bold',
        },
      },
      rangeSelector: {
        selected: 1,
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
    return !this.state.data ? (
      <div style={{ textAlign: 'center', margin: '12px' }}>
        <Loader type="Circles" color="#7f3eab" height="75" width="75" />
      </div>
    ) : (
      <Charts constructorType={'stockChart'} options={this.getOptions()} />
    );
  }
}

export default StockTimeline;
