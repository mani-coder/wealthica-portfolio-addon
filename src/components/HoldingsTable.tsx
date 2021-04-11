/* eslint-disable react-hooks/exhaustive-deps */
import Typography from 'antd/es/typography';
import { ColumnProps } from 'antd/lib/table';
import React from 'react';
import { Box } from 'rebass';
import { Position } from '../types';
import { formatMoney, getSymbol } from '../utils';
import Collapsible from './Collapsible';
import VirtualTable from './VirtualTable';

type Props = {
  positions: Position[];
  isPrivateMode: boolean;
};

function HoldingsTable(props: Props) {
  const marketValue = props.positions.reduce((sum, position) => {
    return sum + position.market_value;
  }, 0);
  function getColumns(): ColumnProps<Position>[] {
    return [
      {
        key: 'symbol',
        title: 'Symbol',
        dataIndex: 'security.name',
        render: (text, position) => (
          <Typography.Link
            rel="noreferrer noopener"
            href={`https://finance.yahoo.com/quote/${getSymbol(position.security)}`}
            target="_blank"
          >
            {getSymbol(position.security)}
          </Typography.Link>
        ),
        width: 200,
        sorter: (a, b) => getSymbol(a.security).localeCompare(getSymbol(b.security)),
      },
      {
        key: 'country',
        title: 'Country',
        dataIndex: 'security.currency',
        render: (text, position) => (position.security.currency === 'usd' ? 'US' : 'CA'),
        sorter: (a, b) => a.security.currency.localeCompare(b.security.currency),
        width: 120,
      },
      {
        key: 'lastPrice',
        title: 'Last Price',
        align: 'right',
        dataIndex: 'security.last_price',
        render: (text, position) => (
          <>
            {formatMoney(position.security.last_price)}
            <div style={{ fontSize: 11 }}>{position.security.currency.toUpperCase()}</div>
          </>
        ),
        sorter: (a, b) => a.security.last_price - b.security.last_price,
      },
      {
        key: 'shares',
        title: 'Shares',
        dataIndex: 'quantity',
        render: (text) => <Typography.Text strong>{formatMoney(text, 0)}</Typography.Text>,
        align: 'right',
        sorter: (a, b) => a.quantity - b.quantity,
      },
      {
        key: 'buyPrice',
        title: 'Avg Cost / Share',
        dataIndex: 'quantity',
        render: (text, position) => (
          <>
            <Typography.Text strong>
              {formatMoney(
                position.investments.reduce((cost, investment) => {
                  return cost + investment.book_value;
                }, 0) / position.quantity,
              )}{' '}
            </Typography.Text>
            <div style={{ fontSize: 11 }}>{position.security.currency.toUpperCase()}</div>
          </>
        ),
        align: 'right',
      },
      {
        key: 'gainPercent',
        title: (
          <>
            Profit / Loss %<div style={{ fontSize: 12 }}>CAD</div>
          </>
        ),
        dataIndex: 'gain_percent',
        render: (text, position) => (
          <Box style={{ color: position.gain_percent < 0 ? 'red' : 'green' }}>
            <Typography.Text strong style={{ color: 'inherit', fontSize: 14 }}>
              {formatMoney(position.gain_percent * 100)}%
            </Typography.Text>
            <Box />
            <Typography.Text style={{ color: 'inherit', fontSize: 13 }}>
              {formatMoney(position.gain_amount)}
            </Typography.Text>
          </Box>
        ),
        align: 'right',
        sorter: (a, b) => a.gain_percent - b.gain_percent,
      },
      {
        key: 'marketValue',
        title: (
          <>
            Market Value<div style={{ fontSize: 12 }}>CAD</div>
          </>
        ),
        dataIndex: 'market_value',
        render: (text) => (
          <>
            <Typography.Text strong>{props.isPrivateMode ? '-' : formatMoney(text)}</Typography.Text>
            <div style={{ fontSize: 13 }}>{text ? formatMoney((text / marketValue) * 100, 1) : 0}%</div>
          </>
        ),
        align: 'right',
        sorter: (a, b) => a.market_value - b.market_value,
      },
    ];
  }

  return (
    <div className="zero-padding">
      <Collapsible title="Holdings Table">
        <VirtualTable scroll={{ y: 600 }} dataSource={props.positions} columns={getColumns() as any} />
      </Collapsible>
    </div>
  );
}

export default React.memo(HoldingsTable);
