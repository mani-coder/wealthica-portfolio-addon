import React, { Component } from 'react';

import 'react-table/react-table.css';
import ReactTable from 'react-table';
import Collapsible from 'react-collapsible';

import { Position } from '../types';
import { getSymbol } from '../utils';

type Props = {
  positions: Position[];
  isPrivateMode: boolean;
};

export default class HoldingsTable extends Component<Props> {
  getData() {
    return this.props.positions.map(position => {
      return {
        position,
      };
    });
  }
  getColumns() {
    return [
      {
        id: 'symbol',
        Header: 'Symbol',
        accessor: d => getSymbol(d.position.security),
        filterable: true,
      },
      {
        id: 'currency',
        Header: 'Currency',
        accessor: d => d.position.security.currency.toUpperCase(),
      },
      {
        id: 'shares',
        Header: 'Shares',
        accessor: d => (this.props.isPrivateMode ? '-' : d.position.quantity),
        className: 'right',
      },
      {
        id: 'marketValue',
        Header: 'Market Value',
        accessor: d => (this.props.isPrivateMode ? '-' : Math.round(d.position.market_value)),
        className: 'right',
      },
      {
        id: 'gainPercent',
        Header: 'Gain %',
        accessor: d => Math.round(d.position.gain_percent * 100),
        className: 'right',
      },
      {
        id: 'gainAmount',
        Header: 'Gain Amount',
        accessor: d => (this.props.isPrivateMode ? '-' : Math.round(d.position.gain_amount)),
        className: 'right',
      },
      {
        id: 'buyPrice',
        Header: 'Buy Price',
        className: 'right',
        accessor: d =>
          this.props.isPrivateMode
            ? '-'
            : (
                d.position.investments.reduce((cost, investment) => {
                  return cost + investment.book_value / investment.quantity;
                }, 0) / d.position.investments.length
              ).toLocaleString(),
      },
      {
        id: 'lowPrice',
        Header: 'Low Price',
        className: 'right',
        accessor: d => parseFloat(d.position.security.low_price.toFixed(2)),
      },
      {
        id: 'lastPrice',
        Header: 'Last Price',
        className: 'right',
        accessor: d => parseFloat(d.position.security.last_price.toFixed(2)),
      },
      {
        id: 'highPrice',
        Header: 'High Price',
        className: 'right',
        accessor: d => parseFloat(d.position.security.high_price.toFixed(2)),
      },
    ];
  }
  render() {
    return (
      <Collapsible trigger="Holdings Table" open>
        <ReactTable data={this.getData()} columns={this.getColumns()} />
      </Collapsible>
    );
  }
}
