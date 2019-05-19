import moment from 'moment';
import React, { Component } from 'react';
import Loader from 'react-loader-spinner';
import { Position } from '../types';

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
    console.log(props);
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(nextProps: Props) {
    if (this.props.symbol != nextProps.symbol) {
      this.fetchData();
    }
  }

  fetchData() {
    this.setState({ loading: true });
    const startDate = this.props.position.transactions[0].date;

    const url = `https://query1.finance.yahoo.com/v7/finance/chart/${
      this.props.symbol
    }?period1=${startDate.unix()}&period2=${moment().unix()}&interval=1d&events=history`;
    console.log('URL to fetch --', url);

    fetch(`https://cors-anywhere.herokuapp.com/${url}`, {
      // method: 'GET',
      // mode: 'cors',
      // referrer: 'https://ca.finance.yahoo.com',
      // cache: 'force-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(response => {
        this.setState({ loading: false, data: response });
        console.log(response);
      })
      .catch(error => console.log(error));
  }

  getSeries(): any {
    // const data = this.state.data.map(portfolio => {
    //   return {
    //     // x: ,
    //     y: ((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100,
    //     pnlValue: this.props.isPrivateMode
    //       ? '-'
    //       : formatCurrency(portfolio.value - portfolio.deposits, 2).toLocaleString(),
    //   };
    // });
    return [
      // {
      //   id: 'dataseries',
      //   name: 'P/L %',
      //   data: data,
      //   tooltip: {
      //     valueDecimals: 2,
      //   },
      //   type: 'line',
      // },
      // {
      //   type: 'flags',
      //   name: 'Max Gain/Loss',
      //   data: [
      //     {
      //       ...min(data, 'y'),
      //       title: 'L',
      //       text: 'Max Loss',
      //     },
      //     {
      //       ...max(data, 'y'),
      //       title: 'G',
      //       text: 'Max Loss',
      //     },
      //   ],
      //   onSeries: 'dataseries',
      //   shape: 'squarepin',
      //   width: 16,
      // },
    ];
  }

  render() {
    console.log(this.props);
    return this.state.loading ? <Loader type="Circles" color="#7f3eab" height="75" width="75" /> : <></>;
  }
}

export default StockTimeline;
