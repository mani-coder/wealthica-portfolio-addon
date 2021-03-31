import { Card, Typography } from 'antd';
import Table, { ColumnProps } from 'antd/lib/table';
import moment, { Moment } from 'moment';
import 'moment-precise-range-plugin';
import React, { useMemo } from 'react';
import { Box } from 'rebass';
import { Account, Transaction } from '../types';
import { formatMoney, getCurrencyInCAD } from '../utils';

type Props = {
  transactions: Transaction[];
  accounts: Account[];
  isPrivateMode: boolean;
  fromDate: string;
  currencyCache: { [K: string]: number };
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

type CurrentPosition = {
  shares: number;
  price: number;
  date: Moment;
};

export default function RealizedPnL({ currencyCache, transactions, accounts, isPrivateMode, fromDate }: Props) {
  console.debug('Realized pnl', { fromDate });
  function getAccount(account: string) {
    const account_obj = accounts.find((_account) => account === _account.id);
    return account_obj ? `${account_obj.name} ${account_obj.type}` : 'N/A';
  }

  function closePosition(position: CurrentPosition, transaction: Transaction) {
    const closedShares = Math.min(Math.abs(position.shares), Math.abs(transaction.shares));
    const buyRecord = transaction.type === 'buy' ? transaction : position;
    const sellRecord = transaction.type === 'sell' ? transaction : position;

    const buyValue = closedShares * buyRecord.price;
    const sellValue = closedShares * sellRecord.price;

    const pnl = sellValue - buyValue;
    const pnlRatio = (pnl / buyValue) * 100;

    const closedPosition = {
      date: transaction.date,
      account: getAccount(transaction.account),
      symbol: transaction.symbol,
      currency: transaction.currency,
      shares: closedShares,

      buyDate: buyRecord.date,
      buyPrice: buyRecord.price,

      sellDate: sellRecord.date,
      sellPrice: sellRecord.price,

      pnl: transaction.currency === 'usd' ? getCurrencyInCAD(transaction.date, pnl, currencyCache) : pnl,
      pnlRatio,
    };

    const openShares = position.shares + transaction.shares;
    position.shares = openShares;
    if (openShares > 0) {
      position.price = buyRecord.price;
      position.date = buyRecord.date;
    } else if (openShares < 0) {
      position.price = sellRecord.price;
      position.date = sellRecord.date;
    } else {
      position.price = 0;
    }

    return closedPosition;
  }

  function openPosition(position: CurrentPosition, transaction: Transaction) {
    const shares = position.shares + transaction.shares;
    position.price = (position.price * position.shares + transaction.price * transaction.shares) / shares;
    position.shares = shares;
    position.date = transaction.date;
  }

  function computeClosedPositions(): ClosedPosition[] {
    const closedPositions: ClosedPosition[] = [];
    const book: { [K: string]: CurrentPosition } = {};
    transactions.forEach((transaction) => {
      const key = `${transaction.account}-${transaction.symbol}`;
      let position = book[key];
      if (!position) {
        position = { shares: 0, price: 0, date: transaction.date };
        book[key] = position;
      }

      if (transaction.type === 'buy') {
        if (position.shares < 0) {
          closedPositions.push(closePosition(position, transaction));
        } else {
          openPosition(position, transaction);
        }
      } else if (transaction.type === 'sell') {
        if (position.shares > 0) {
          closedPositions.push(closePosition(position, transaction));
        } else {
          openPosition(position, transaction);
        }
      }
    });
    const startDate = moment(fromDate);
    return closedPositions.filter((position) => position.date.isSameOrAfter(startDate)).reverse();
  }

  function getColumns(): ColumnProps<ClosedPosition>[] {
    return [
      {
        key: 'date',
        title: 'Date',
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
        render: (text) => (isPrivateMode ? '-' : formatMoney(text, 0)),
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
      },
      {
        key: 'gain',
        title: (
          <>
            P&L<div style={{ fontSize: 12 }}>(CAD)</div>
          </>
        ),
        render: (text, position) => (
          <Box style={{ color: position.pnl < 0 ? 'red' : 'green' }}>
            <Typography.Text strong style={{ color: 'inherit', fontSize: 14 }}>
              {isPrivateMode ? '-' : formatMoney(position.pnl)}
            </Typography.Text>
            <Box />
            <Typography.Text style={{ color: 'inherit', fontSize: 13 }}>
              {formatMoney(position.pnlRatio)}%
            </Typography.Text>
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
        title: 'Holding Period',
        render: (text, position) =>
          position.buyDate.diff(position.sellDate)
            ? moment.duration(position.buyDate.diff(position.sellDate)).humanize()
            : 'Same Day',
      },
    ];
  }

  const closedPositions = useMemo(() => {
    return computeClosedPositions();
  }, [transactions, accounts, fromDate]);

  return (
    <Card
      // title="Realized P&L"
      // headStyle={{ paddingLeft: 16, fontSize: 18, fontWeight: 'bold' }}
      // style={{ marginTop: 16, marginBottom: 16 }}
      bodyStyle={{ padding: 0 }}
    >
      <Table<ClosedPosition> dataSource={closedPositions} columns={getColumns()} />
    </Card>
  );
}
