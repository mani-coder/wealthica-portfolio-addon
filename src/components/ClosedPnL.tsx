import { Card, Typography } from 'antd';
import Table, { ColumnProps } from 'antd/lib/table';
import moment, { Moment } from 'moment';
import React, { useMemo } from 'react';
import { Box } from 'rebass';
import { Account, Transaction } from '../types';
import { formatMoney } from '../utils';
import 'moment-precise-range-plugin';

type Props = {
  transactions: Transaction[];
  accounts: Account[];
  isPrivateMode: boolean;
};

type ClosedPosition = {
  date: Moment;
  symbol: string;
  currency: string;
  shares: number;

  buyDate: Moment;
  buyPrice: number;
  sellDate: Moment;
  sellPrice: number;

  pnl: number;
  pnlRatio: number;
  account: string;
};

type CurrentPosition = { shares: number; price: number; date: Moment };

export default function ClosedPnL({ transactions, accounts, isPrivateMode }: Props) {
  function getAccount(transaction: Transaction) {
    const account = accounts.find((account) => transaction.account === account.id);
    return account ? `${account.name} ${account.type}` : 'N/A';
  }

  function computeClosedPositions(): ClosedPosition[] {
    const closedPositions: ClosedPosition[] = [];
    const book: { [K: string]: CurrentPosition } = {};
    transactions.forEach((transaction) => {
      if (!transaction.price || !transaction.shares) {
        return;
      }

      const key = `${transaction.account}-${transaction.symbol}`;
      let position = book[key];
      if (!position) {
        position = { shares: 0, price: 0, date: transaction.date };
        book[key] = position;
      }

      const log = transaction.symbol === 'ABNB' && transaction.account === '27082310:margin:usd';
      if (log) {
        console.log('mani is cool', { ...position, transaction });
      }

      if (transaction.type === 'buy') {
        if (position.shares < 0) {
          const shares = Math.abs(position.shares);
          const closedShares = shares > transaction.shares ? transaction.shares : shares;
          const buyValue = closedShares * transaction.price;
          const sellValue = closedShares * position.price;
          const pnl = sellValue - buyValue;
          const pnlRatio = (pnl / buyValue) * 100;

          const closedPosition = {
            date: transaction.date,
            symbol: transaction.symbol,
            currency: transaction.currency,
            shares: closedShares,

            buyDate: transaction.date,
            buyPrice: transaction.price,

            sellDate: position.date,
            sellPrice: position.price,

            pnl,
            pnlRatio,
            account: getAccount(transaction),
          };
          closedPositions.push(closedPosition);
          const openShares = position.shares + transaction.shares;
          if (log) {
            console.log('mani is cool closing---', { closedPosition, openShares, closedShares });
          }

          if (openShares > 0) {
            position.shares = openShares;
            position.price = transaction.price;
            position.date = transaction.date;
          } else if (openShares < 0) {
            // reduce the filled out position.
            position.shares -= closedShares;
          } else {
            position.shares = position.price = 0;
          }

          return;
        }

        const shares = position.shares + transaction.shares;
        position.price = (position.price * position.shares + transaction.price * transaction.shares) / shares;
        position.shares = shares;
        position.date = transaction.date;
      } else if (transaction.type === 'sell') {
        if (position.shares > 0) {
          // closing a position.
          const shares = Math.abs(transaction.shares);
          const closedShares = position.shares < shares ? position.shares : shares;
          const buyValue = closedShares * position.price;
          const sellValue = closedShares * transaction.price;
          const pnl = sellValue - buyValue;
          const pnlRatio = ((transaction.price - position.price) / position.price) * 100;

          const closedPosition = {
            date: transaction.date,
            symbol: transaction.symbol,
            currency: transaction.currency,
            shares: closedShares,
            buyDate: position.date,
            buyPrice: position.price,

            sellDate: transaction.date,
            sellPrice: transaction.price,

            pnl,
            pnlRatio,
            account: getAccount(transaction),
          };
          closedPositions.push(closedPosition);

          const openShares = position.shares + transaction.shares;
          if (log) {
            console.log('mani is cool closing---', { closedPosition, openShares, closedShares });
          }

          if (openShares < 0) {
            position.shares = openShares;
            position.price = transaction.price;
            position.date = transaction.date;
          } else if (openShares > 0) {
            // reduce the filled out position.
            position.shares -= closedShares;
          } else {
            position.shares = position.price = 0;
          }
          return;
        }

        const shares = position.shares + transaction.shares;
        position.price = (position.price * position.shares + transaction.price * transaction.shares) / shares;
        position.shares = shares;
        position.date = transaction.date;
      }

      if (transaction.symbol === 'ABNB' && transaction.account === '27082310:margin:usd') {
        console.log('mani is cool post position', { ...position, transaction });
      }
    });
    return closedPositions;
  }

  function getColumns(): ColumnProps<ClosedPosition>[] {
    return [
      {
        key: 'date',
        title: 'Closed Date',
        dataIndex: 'date',
        render: (text) => text.format('YYYY-MM-DD'),
        sorter: (a, b) => a.date.valueOf() - b.date.valueOf(),
        width: 150,
      },
      {
        key: 'account',
        title: 'Account',
        dataIndex: 'account',
        width: 150,
        sorter: (a, b) => a.account.localeCompare(b.account),
      },
      {
        key: 'symbol',
        title: 'Symbol',
        dataIndex: 'symbol',
        render: (text, position) => (
          <>
            <Typography.Link rel="noreferrer noopener" href={`https://finance.yahoo.com/quote/${text}`} target="_blank">
              {text}
            </Typography.Link>
            <div style={{ fontSize: 10 }}>{position.currency === 'usd' ? 'USD' : 'CAD'}</div>
          </>
        ),
        width: 125,
        filters: Array.from(new Set(closedPositions.map((position) => position.symbol)))
          .map((value) => ({
            text: value,
            value,
          }))
          .sort((a, b) => a.value.localeCompare(b.value)),
        onFilter: (value, position) => position.symbol.indexOf(value as any) === 0,
        sorter: (a, b) => a.symbol.localeCompare(b.symbol),
      },
      {
        key: 'shares',
        title: 'Shares',
        dataIndex: 'shares',
        align: 'right',
        render: (text) => formatMoney(text, 0),
        width: 75,
      },
      {
        key: 'price',
        title: 'Buy / Sell Price',
        align: 'right',
        render: (text, position) => (
          <>
            {formatMoney(position.buyPrice)} / {formatMoney(position.sellPrice)}
          </>
        ),
        width: 200,
      },
      {
        key: 'gain',
        title: (
          <>
            Profit / Loss %<div style={{ fontSize: 12 }}>CAD</div>
          </>
        ),
        render: (text, position) => (
          <Box style={{ color: position.pnl < 0 ? 'red' : 'green' }}>
            <Typography.Text strong style={{ color: 'inherit', fontSize: 14 }}>
              {formatMoney(position.pnlRatio)}%
            </Typography.Text>
            <Box />
            <Typography.Text style={{ color: 'inherit', fontSize: 13 }}>{formatMoney(position.pnl)}</Typography.Text>
          </Box>
        ),
        align: 'right',
        sorter: (a, b) => a.pnlRatio - b.pnlRatio,
      },
      {
        key: 'openDate',
        title: 'Open Date',
        render: (text, position) =>
          (position.buyDate.isAfter(position.sellDate) ? position.sellDate : position.buyDate).format('YYYY-MM-DD'),
      },
      {
        key: 'holding-period',
        title: 'Period',
        render: (text, position) =>
          position.buyDate.diff(position.sellDate)
            ? moment.duration(position.buyDate.diff(position.sellDate)).humanize()
            : 'Same Day',
      },
    ];
  }

  const closedPositions = useMemo(() => {
    return computeClosedPositions();
  }, [transactions, accounts]);

  console.log('mani is cool', closedPositions);
  return (
    <Card
      // title="Closed P&L"
      // headStyle={{ paddingLeft: 16, fontSize: 18, fontWeight: 'bold' }}
      // style={{ marginTop: 16, marginBottom: 16 }}
      bodyStyle={{ padding: 0 }}
    >
      <Table<ClosedPosition> dataSource={closedPositions} columns={getColumns()} />
    </Card>
  );
}
