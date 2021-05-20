/* eslint-disable react-hooks/exhaustive-deps */
import ArrowDownOutlined from '@ant-design/icons/ArrowDownOutlined';
import ArrowUpOutlined from '@ant-design/icons/ArrowUpOutlined';
import QuestionCircleTwoTone from '@ant-design/icons/QuestionCircleTwoTone';
import Tooltip from 'antd/es/tooltip';
import Typography from 'antd/es/typography';
import Checkbox from 'antd/lib/checkbox';
import Empty from 'antd/lib/empty';
import Radio from 'antd/lib/radio';
import Statistic from 'antd/lib/statistic';
import Table, { ColumnProps } from 'antd/lib/table';
import * as Highcharts from 'highcharts';
import _ from 'lodash';
import moment, { Moment } from 'moment';
import 'moment-precise-range-plugin';
import React, { useMemo, useState } from 'react';
import { Box, Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { DATE_FORMAT } from '../constants';
import { Account, AccountTransaction, Transaction } from '../types';
import { formatCurrency, formatMoney, getCurrencyInCAD } from '../utils';
import { Charts } from './Charts';
import Collapsible from './Collapsible';
import CompositionGroup, { getGroupKey, GroupType } from './CompositionGroup';

type Props = {
  transactions: Transaction[];
  accountTransactions: AccountTransaction[];
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
  account?: Account;
};

type CurrentPosition = {
  shares: number;
  price: number;
  date: Moment;
};

const DATE_DISPLAY_FORMAT = 'MMM DD, YYYY';

const RealizedPnLTable = React.memo(
  ({ closedPositions, isPrivateMode }: { closedPositions: ClosedPosition[]; isPrivateMode: boolean }) => {
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
          render: (account: Account) => (account ? account.name : 'N/A'),
          filters: Array.from(
            new Set(closedPositions.map((position) => (position.account ? position.account.name : 'N/A'))),
          )
            .map((value) => ({
              text: value,
              value,
            }))
            .sort((a, b) => a.value.localeCompare(b.value)),
          onFilter: (value, position) => (position.account?.name || 'N/A').indexOf(value as any) === 0,
        },
        {
          key: 'symbol',
          title: 'Symbol',
          dataIndex: 'symbol',
          render: (text, position) => (
            <>
              <Typography.Link
                rel="noreferrer noopener"
                href={`https://finance.yahoo.com/quote/${text}`}
                target="_blank"
              >
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
          render: (text) => (isPrivateMode ? '-' : text.toLocaleString('en-US')),
          width: 75,
        },
        {
          key: 'price',
          title: (
            <>
              Buy Price / Sell Price{' '}
              <Tooltip title="This is the Adjusted Cost Base (ACB) which includes the buy/sell transaction fees.">
                <QuestionCircleTwoTone twoToneColor="#bfbfbf" />
              </Tooltip>
            </>
          ),
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
              P&L $%<div style={{ fontSize: 12 }}>(CAD)</div>
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

    return (
      <div className="zero-padding">
        <Collapsible title="Realized P&L History" closed>
          <Table<ClosedPosition>
            pagination={{ pageSize: 5 }}
            dataSource={closedPositions}
            summary={(positions) => {
              const totalPnL = positions.reduce((pnl, position) => pnl + position.pnl, 0);

              return (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right" index={0}>
                      <Typography.Text strong>Total</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} colSpan={3}>
                      <Typography.Text strong style={{ color: totalPnL > 0 ? 'green' : 'red' }}>
                        {formatMoney(totalPnL)} CAD
                      </Typography.Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              );
            }}
            columns={getColumns()}
          />
        </Collapsible>
      </div>
    );
  },
);

const ExpensesTable = React.memo(
  ({
    accountById,
    transactions,
    isPrivateMode,
  }: {
    accountById: { [K: string]: Account };
    transactions: AccountTransaction[];
    isPrivateMode: boolean;
  }) => {
    function getColumns(): ColumnProps<AccountTransaction>[] {
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
          render: (account) => (accountById[account] ? accountById[account].name : 'N/A'),
          width: 250,
        },
        {
          key: 'interest',
          title: 'Interest (CAD)',
          dataIndex: 'amount',
          render: (interest) =>
            isPrivateMode ? '--' : <Typography.Text strong>${formatMoney(interest)}</Typography.Text>,
          align: 'right',
          sorter: (a, b) => a.amount - b.amount,
          width: 200,
        },
        {
          key: 'description',
          title: 'Description',
          dataIndex: 'description',
        },
      ];
    }

    return (
      <div className="zero-padding">
        <Collapsible title="Expenses History" closed>
          <Table<AccountTransaction>
            pagination={{ pageSize: 5 }}
            dataSource={transactions.reverse()}
            columns={getColumns()}
          />
        </Collapsible>
      </div>
    );
  },
);

const IncomeTable = React.memo(
  ({
    accountById,
    transactions,
    isPrivateMode,
  }: {
    accountById: { [K: string]: Account };
    transactions: Transaction[];
    isPrivateMode: boolean;
  }) => {
    function getColumns(): ColumnProps<Transaction>[] {
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
          render: (account) => (accountById[account] ? accountById[account].name : 'N/A'),
          width: 250,
        },
        {
          key: 'symbol',
          title: 'Symbol',
          dataIndex: 'symbol',
          render: (text, transaction) => (
            <>
              <Typography.Link
                rel="noreferrer noopener"
                href={`https://finance.yahoo.com/quote/${text}`}
                target="_blank"
              >
                {text}
              </Typography.Link>
              <div style={{ fontSize: 10 }}>{transaction.currency === 'usd' ? 'USD' : 'CAD'}</div>
            </>
          ),
          width: 125,
          filters: Array.from(new Set(transactions.map((t) => t.symbol)))
            .map((value) => ({
              text: value,
              value,
            }))
            .sort((a, b) => a.value.localeCompare(b.value)),
          onFilter: (value, transaction) => transaction.symbol.indexOf(value as any) === 0,
          sorter: (a, b) => a.symbol.localeCompare(b.symbol),
        },
        {
          key: 'type',
          title: 'Type',
          dataIndex: 'type',
          render: (type) => <Typography.Text strong>{_.startCase(type || '-')}</Typography.Text>,
        },
        {
          key: 'income',
          title: 'Income (CAD)',
          dataIndex: 'amount',
          render: (amount) => (isPrivateMode ? '--' : <Typography.Text strong>${formatMoney(amount)}</Typography.Text>),
          align: 'right',
          sorter: (a, b) => a.amount - b.amount,
        },
        {
          key: 'description',
          title: 'Description',
          dataIndex: 'description',
        },
      ];
    }

    return (
      <div className="zero-padding">
        <Collapsible title="Income History" closed>
          <Table<Transaction> pagination={{ pageSize: 5 }} dataSource={transactions.reverse()} columns={getColumns()} />
        </Collapsible>
      </div>
    );
  },
);

type TransactionType = 'income' | 'pnl' | 'expense';

export default function RealizedPnL({
  currencyCache,
  accountTransactions,
  transactions,
  accounts,
  isPrivateMode,
  fromDate,
}: Props) {
  const [timeline, setTimeline] = useState<'month' | 'year' | 'week' | 'day'>('month');
  const { expenseTransactions, totalExpense } = useMemo(() => {
    const expenseTransactions = accountTransactions.filter(
      (transaction) => ['interest', 'fee'].includes(transaction.type) && transaction.date.isSameOrAfter(fromDate),
    );
    return {
      expenseTransactions,
      totalExpense: expenseTransactions.reduce((expense, t) => expense + t.amount, 0),
    };
  }, [transactions, fromDate]);

  const { incomeTransactions, totalIncome } = useMemo(() => {
    const incomeTransactions = transactions.filter(
      (transaction) =>
        ['income', 'dividend', 'distribution'].includes(transaction.type) && transaction.date.isSameOrAfter(fromDate),
    );
    return {
      incomeTransactions,
      totalIncome: incomeTransactions.reduce((expense, t) => expense + t.amount, 0),
    };
  }, [transactions, fromDate]);
  const [compositionGroup, setCompositionGroup] = useState<GroupType>('type');

  const accountById = useMemo(() => {
    return accounts.reduce((hash, account) => {
      hash[account.id] = account;
      return hash;
    }, {} as { [K: string]: Account });
  }, [accounts]);

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
      account: accountById[transaction.account],
      symbol: transaction.symbol,
      currency: transaction.currency,
      shares: closedShares,

      buyDate: buyRecord.date,
      buyPrice: buyRecord.price,

      sellDate: sellRecord.date,
      sellPrice: sellRecord.price,

      pnl:
        transaction.currency === 'usd' && transaction.securityType !== 'crypto'
          ? getCurrencyInCAD(transaction.date, pnl, currencyCache)
          : pnl,
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
    if (position.shares === 0) {
      position.date = transaction.date;
    }
    position.price = (position.price * position.shares + transaction.price * transaction.shares) / shares;
    position.shares = shares;
  }

  function handleSplit(position: CurrentPosition, transaction: Transaction) {
    // there are two type of split transactions, one negates the full book and one adds the new shares.
    // we are interested in the first one.
    if (transaction.shares > 0) {
      return;
    }
    const splitRatio = transaction.splitRatio || 1;
    const shares = Math.floor(position.shares / splitRatio);
    position.shares = shares;
    position.price = position.price * splitRatio;
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
      } else if (transaction.type === 'split') {
        handleSplit(position, transaction);
      } else if (transaction.type === 'reinvest') {
        // acquire this position at zero cost, since it's a re-investment.
        openPosition(position, { ...transaction, price: 0 });
      }
    });

    const startDate = moment(fromDate);
    return closedPositions.filter((position) => position.date.isSameOrAfter(startDate)).reverse();
  }

  const getOptions = ({
    series,
  }: {
    series: Highcharts.SeriesColumnOptions[] | Highcharts.SeriesPieOptions[];
  }): Highcharts.Options => {
    return {
      series,
      legend: {
        enabled: true,
      },

      tooltip: {
        outside: true,

        useHTML: true,
        backgroundColor: '#FFF',
        style: {
          color: '#1F2A33',
        },
      },

      title: {
        text: undefined,
      },
      xAxis: {
        type: 'category',
        labels: {
          style: {
            fontSize: '13px',
            fontFamily: 'Verdana, sans-serif',
          },
        },
      },

      yAxis: {
        labels: {
          enabled: !isPrivateMode,
        },
        title: {
          text: '$ (CAD)',
        },
      },
    };
  };

  const getBarLabel = (date: string) => {
    const startDate = moment(date);

    switch (timeline) {
      case 'month':
        return startDate.format('MMM YY');
      case 'week':
        return `${startDate.format('MMM DD')} - ${moment(date).endOf(timeline).format('MMM DD')}, ${startDate.format(
          'YY',
        )}`;
      case 'year':
        return startDate.format('YYYY');
      case 'day':
        return startDate.format('MMM DD, YYYY');
    }
  };

  const getData = (closedPositions: ClosedPosition[]): Highcharts.SeriesColumnOptions[] => {
    function getSeries(type: TransactionType | 'all', values: { [K: string]: number }) {
      const data = Object.keys(values)
        .map((date) => ({ date, label: getBarLabel(date), pnl: values[date] }))
        .filter((value) => value.pnl)
        .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf())
        .map((value) => {
          return {
            date: value.date,
            label: value.label,
            pnl: value.pnl,
            startDate: moment(value.date).startOf(timeline).format(DATE_DISPLAY_FORMAT),
            endDate: moment(value.date).endOf(timeline).format(DATE_DISPLAY_FORMAT),
          };
        });

      const name =
        type === 'pnl'
          ? 'Realized P&L'
          : type === 'expense'
          ? 'Expenses (Interest, Fee)'
          : type === 'income'
          ? 'Income (Dividends)'
          : `${types.includes('pnl') ? `P&L  ${types.includes('income') ? '+' : ''} ` : ''}${
              types.includes('income') ? 'Income' : ''
            }${types.includes('expense') ? ' - Expenses' : ''}`;
      const color =
        type === 'pnl' ? '#b37feb' : type === 'expense' ? '#ff7875' : type === 'income' ? '#95de64' : '#5cdbd3';
      const _series: Highcharts.SeriesColumnOptions = {
        name,
        type: 'column',
        color,
        data: data.map((value) => ({
          key: value.label,
          name: value.label,
          label: value.label,
          y: value.pnl,
          pnl: !isPrivateMode ? formatMoney(value.pnl) : '-',
          pnlHuman: !isPrivateMode ? formatCurrency(value.pnl, 2) : '-',
          startDate: value.startDate,
          endDate: value.endDate,
        })),
        tooltip: {
          headerFormat: `<span style="font-size: 13px; font-weight: 700;">${name}</span>`,
          pointFormat: `<hr /><span style="font-size: 12px;font-weight: 500;">{point.startDate} - {point.endDate}</span>
          <br />
          <b style="font-size: 13px; font-weight: 700">{point.pnl} CAD</b><br />`,
        },
        dataLabels: { enabled: true, format: '{point.pnlHuman}' },
        showInLegend: true,
      };
      return _series;
    }

    const gains = {} as { [K: string]: number };
    const pnls = {} as { [K: string]: number };
    const expenses = {} as { [K: string]: number };
    const incomes = {} as { [K: string]: number };

    if (types.includes('pnl')) {
      closedPositions.forEach((value) => {
        const key = value.date.clone().startOf(timeline).format(DATE_FORMAT);
        pnls[key] = pnls[key] ? pnls[key] + value.pnl : value.pnl;
      });
    }

    if (types.includes('expense')) {
      expenseTransactions.forEach((value) => {
        const key = value.date.clone().startOf(timeline).format(DATE_FORMAT);
        expenses[key] = expenses[key] ? expenses[key] + value.amount : value.amount;
      });
    }

    if (types.includes('income')) {
      incomeTransactions.forEach((value) => {
        const key = value.date.clone().startOf(timeline).format(DATE_FORMAT);
        incomes[key] = incomes[key] ? incomes[key] + value.amount : value.amount;
      });
    }

    const allDates = new Set(Object.keys(expenses).concat(Object.keys(pnls)).concat(Object.keys(incomes)));
    allDates.forEach((key) => {
      gains[key] = (pnls[key] || 0) - (expenses[key] || 0) + (incomes[key] || 0);
    });

    const individualSeries: Highcharts.SeriesColumnOptions[] = [];
    types.forEach((type) => {
      const values = type === 'pnl' ? pnls : type === 'income' ? incomes : expenses;
      if (Object.keys(values).length) {
        individualSeries.push(getSeries(type, values));
      }
    });

    return individualSeries.length === 1 ? individualSeries : [getSeries('all', gains)].concat(individualSeries);
  };

  const getClosedPnLByAccountSeries = (
    closedPositions: ClosedPosition[],
    closedPnL: number,
    group: GroupType,
  ): Highcharts.SeriesPieOptions[] => {
    const pnls = {} as { [K: string]: { name: string; pnl: number } };
    if (types.includes('pnl')) {
      closedPositions.forEach((position) => {
        const name = getGroupKey(group, position.account);
        let mergedAccount = pnls[name];
        if (!mergedAccount) {
          mergedAccount = { name, pnl: 0 };
          pnls[name] = mergedAccount;
        }
        mergedAccount.pnl += position.pnl;
      });
    }

    if (types.includes('expense')) {
      expenseTransactions.forEach((t) => {
        const name = getGroupKey(group, accountById[t.account]);
        let mergedAccount = pnls[name];
        if (!mergedAccount) {
          mergedAccount = { name, pnl: 0 };
          pnls[name] = mergedAccount;
        }
        mergedAccount.pnl -= t.amount;
      });
    }

    if (types.includes('income')) {
      incomeTransactions.forEach((t) => {
        const name = getGroupKey(group, accountById[t.account]);
        let mergedAccount = pnls[name];
        if (!mergedAccount) {
          mergedAccount = { name, pnl: 0 };
          pnls[name] = mergedAccount;
        }
        mergedAccount.pnl += t.amount;
      });
    }

    const data = Object.values(pnls);
    const accountsSeries: Highcharts.SeriesPieOptions = {
      type: 'pie' as 'pie',
      id: 'accounts',
      name: 'Accounts',
      dataLabels: {
        enabled: true,
        format:
          '<b style="font-size: 12px;">{point.name}: <span style="color: {point.pnlColor};">{point.percentage:.1f}%</span></b>',
        style: {
          color: 'black',
        },
      },
      data: data
        .filter((account) => account.pnl)
        .sort((a, b) => b.pnl - a.pnl)
        .map((account) => {
          return {
            name: account.name,
            y: Math.abs(account.pnl),
            negative: account.pnl < 0,
            displayValue: isPrivateMode ? '-' : account.pnl ? formatMoney(account.pnl) : account.pnl,
            totalValue: isPrivateMode ? '-' : formatMoney(closedPnL),
            pnlColor: account.pnl < 0 ? 'red' : 'green',
          };
        }),

      tooltip: {
        headerFormat: `<b>{point.key}<br />{point.percentage:.1f}%</b><hr />`,
        pointFormatter() {
          const point = this.options as any;
          return `<table>
          <tr><td>P/L</td><td class="position-tooltip-value">${point.displayValue} CAD</td></tr>
          <tr><td>Total P/L</td><td class="position-tooltip-value">${point.totalValue} CAD</td></tr>
        </table>`;
        },
      },
    };

    return [accountsSeries];
  };

  const closedPositions = useMemo(() => {
    return computeClosedPositions();
  }, [transactions, accounts, fromDate]);

  function getDefaultTypes(): TransactionType[] {
    return [closedPositions.length ? 'pnl' : incomeTransactions.length ? 'income' : 'expense'];
  }
  const [types, setTypes] = useState<TransactionType[]>(getDefaultTypes);

  const { closedPnL, realizedPnL } = useMemo(() => {
    const realizedPnL = closedPositions.reduce((pnl, position) => pnl + position.pnl, 0);
    const closedPnL =
      (types.includes('pnl') ? realizedPnL : 0) -
      (types.includes('expense') ? totalExpense : 0) +
      (types.includes('income') ? totalIncome : 0);
    return { realizedPnL, closedPnL };
  }, [closedPositions, types, totalExpense, totalIncome]);

  const options = useMemo(() => {
    return getOptions({ series: getData(closedPositions) });
  }, [closedPositions, timeline, types]);

  const accountSeriesOptions = useMemo(() => {
    return getOptions({ series: getClosedPnLByAccountSeries(closedPositions, closedPnL, compositionGroup) });
  }, [closedPositions, closedPnL, compositionGroup, types]);

  const typesOptions = useMemo(() => {
    const options: { disabled?: boolean; label: string | React.ReactNode; value: TransactionType }[] = [];

    options.push({
      label: (
        <>
          Realized P&L{' '}
          <Typography.Text type={realizedPnL > 0 ? 'success' : realizedPnL < 0 ? 'danger' : 'secondary'} strong>
            {formatMoney(realizedPnL)} CAD
          </Typography.Text>
        </>
      ),
      value: 'pnl',
      disabled: !closedPositions.length,
    });

    options.push({
      label: (
        <>
          Income (Dividends){' '}
          <Typography.Text type={totalIncome ? 'success' : 'secondary'} strong={totalIncome > 0}>
            {formatMoney(totalIncome)} CAD
          </Typography.Text>
        </>
      ),
      value: 'income',
      disabled: !incomeTransactions.length,
    });

    options.push({
      label: (
        <>
          Expenses (Interest, Fee){' '}
          <Typography.Text type={totalExpense ? 'danger' : 'secondary'} strong={totalExpense > 0}>
            {formatMoney(totalExpense)} CAD
          </Typography.Text>
        </>
      ),
      value: 'expense',
      disabled: !expenseTransactions.length,
    });

    return options;
  }, [closedPositions, incomeTransactions, expenseTransactions]);

  const show = closedPositions.length > 0 || incomeTransactions.length > 0 || expenseTransactions.length > 0;
  return show ? (
    <>
      <Flex mt={2} mb={3} justifyContent="center">
        <Statistic
          value={isPrivateMode ? '--' : closedPnL}
          precision={2}
          suffix="CAD"
          valueStyle={{ color: closedPnL >= 0 ? 'green' : 'red' }}
          prefix={closedPnL >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        />
      </Flex>

      <Flex
        mb={3}
        mt={2}
        width={1}
        justifyContent="center"
        alignContent="center"
        justifyItems="center"
        alignItems="center"
      >
        <Checkbox.Group
          options={typesOptions}
          value={types}
          onChange={(checkedValues) => {
            setTypes(checkedValues as TransactionType[]);
            trackEvent('realized-pnl-types', { types: checkedValues });
          }}
        />
      </Flex>

      <Charts key={timeline} options={options} />

      <Flex width={1} justifyContent="center" py={2} mb={4}>
        <Radio.Group
          defaultValue={timeline}
          size="large"
          buttonStyle="solid"
          onChange={(e) => {
            trackEvent('realized-pnl-chart', { timeline: e.target.value });
            setTimeline(e.target.value);
          }}
          options={[
            { label: 'Day', value: 'day' },
            { label: 'Week', value: 'week' },
            { label: 'Month', value: 'month' },
            { label: 'Year', value: 'year' },
          ]}
          optionType="button"
        />
      </Flex>

      <Collapsible title="Realized P&L Composition">
        <Charts key={timeline} options={accountSeriesOptions} />{' '}
        <CompositionGroup changeGroup={setCompositionGroup} group={compositionGroup} tracker="realized-pnl-group" />
      </Collapsible>

      {closedPositions.length > 0 && (
        <RealizedPnLTable closedPositions={closedPositions} isPrivateMode={isPrivateMode} />
      )}
      {incomeTransactions.length > 0 && (
        <IncomeTable transactions={incomeTransactions} isPrivateMode={isPrivateMode} accountById={accountById} />
      )}
      {expenseTransactions.length > 0 && (
        <ExpensesTable transactions={expenseTransactions} isPrivateMode={isPrivateMode} accountById={accountById} />
      )}
    </>
  ) : (
    <Empty description="No realized gains/loss/income/expenses for the selected time period." />
  );
}
