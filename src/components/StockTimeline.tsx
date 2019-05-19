import React, { Component } from 'react';
import { Moment } from 'moment';

type Props = {
  symbol: string;
  startDate: Moment;
};

type State = {
  loading: boolean;
  data?: any;
};

class StockTimeline extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
    };
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
    const url = `https://query1.finance.yahoo.com/v7/finance/chart/${
      this.props.symbol
    }?period1=1557730800&period2=1558244681&interval=1d&events=history`;
    fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      referrer: 'https://ca.finance.yahoo.com',
      cache: 'force-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => console.log('response --', response))
      .then(response => {
        this.setState({ loading: false });
        console.log(response);
      })
      .catch(error => console.log(error));
  }
  render() {
    console.log(this.props);
    return <></>;
  }
}

export default StockTimeline;
