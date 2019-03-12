import React, { Component } from 'react';

import 'react-table/react-table.css';
import ReactTable from 'react-table';
import Collapsible from 'react-collapsible';

import { Position } from '../types';
import { getSymbol } from '../utils';
// import { getSymbol } from '../utils';

type Props = {
  positions: Position[];
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
        Header: 'Shares',
        accessor: 'position.quantity',
      },
      {
        id: 'currency',
        Header: 'Currency',
        accessor: d => d.position.security.currency.toUpperCase(),
      },
      {
        id: 'lowPrice',
        Header: 'Low Price',
        accessor: d => parseFloat(d.position.security.low_price.toFixed(2)),
      },
      {
        id: 'lastPrice',
        Header: 'Last Price',
        accessor: d => parseFloat(d.position.security.last_price.toFixed(2)),
      },
      {
        id: 'highPrice',
        Header: 'High Price',
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
