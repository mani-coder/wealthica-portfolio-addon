import _ from 'lodash';
import moment from 'moment';
import React, { Component } from 'react';
import Loader from 'react-loader-spinner';
import { TYPE_TO_COLOR } from '../constants';
import { Position } from '../types';
import Charts from './Charts';
import { formatCurrency } from '../utils';

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
    const startDate = this.props.position.transactions[0].date.clone().subtract('months', 1);
    const endDate = moment()
      .startOf('day')
      .unix();

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
    const timestamps = this.state.data.chart.result[0].timestamp;
    const closePrices = this.state.data.chart.result[0].indicators.quote[0].close;

    const data: { x: number; y: number }[] = [];
    // let minPrice, maxPrice, minTimestamp, maxTimestamp;
    timestamps.forEach((timestamp, index) => {
      data.push({
        x: timestamp * 1000,
        y: closePrices[index],
      });
      // if (index === 0) {
      //   maxPrice = minPrice = closePrices[index];
      //   minTimestamp = maxTimestamp = timestamp;
      // }
      // if (closePrices[index] < minPrice) {
      //   minPrice = closePrices[index];
      //   minTimestamp = timestamp;
      // }
      // if (closePrices[index] > maxPrice) {
      //   maxPrice = closePrices[index];
      //   maxTimestamp = timestamp;
      // }
    });
    // console.log(minTimestamp, maxTimestamp);

    return [
      {
        id: 'dataseries',
        name: this.props.symbol,
        data,
        type: 'spline',

        tooltip: {
          valueDecimals: 2,
        },
      },
      // {
      //   name: 'High/Low',
      //   shape: 'squarepin',
      //   type: 'flags',
      //   onSeries: 'dataseries',
      //   width: 25,

      //   data: [
      //     {
      //       x: minTimestamp * 1000,
      //       title: 'L',
      //       text: 'Low Price',
      //     },
      //     {
      //       x: maxTimestamp * 1000,
      //       title: 'H',
      //       text: 'High Price',
      //     },
      //   ],
      // color: 'purple',
      // fillColor: 'purple',
      // style: {
      //   color: 'white',
      // },
      // },
      this.getFlags('buy'),
      this.getFlags('sell'),
      this.getFlags('income'),
      this.getFlags('dividend'),
      this.getFlags('distribution'),
      this.getFlags('tax'),
      this.getFlags('fee'),
    ];
  }

  getFlags = (type: string): any => {
    const isBuySell = ['buy', 'sell'].includes(type);

    return {
      name: _.startCase(type),
      shape: 'squarepin',
      type: 'flags',
      onSeries: 'dataseries',
      width: 25,

      tooltip: {
        pointFormat: '<b>{point.text}</b>',
        valueDecimals: 2,
        split: true,
      },

      data: this.props.position.transactions
        .filter(t => t.type === type)
        .map(transaction => {
          return {
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
          opposite: false,
          plotLines: [
            {
              value: 0,
              width: 1,
              color: 'silver',
            },
          ],
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
    };
  }

  render() {
    console.log('Props -- ', this.props, this.state);
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
