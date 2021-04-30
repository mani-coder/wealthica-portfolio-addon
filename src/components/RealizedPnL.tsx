/* eslint-disable react-hooks/exhaustive-deps */
import ArrowDownOutlined from '@ant-design/icons/ArrowDownOutlined';
import ArrowUpOutlined from '@ant-design/icons/ArrowUpOutlined';
import QuestionCircleTwoTone from '@ant-design/icons/QuestionCircleTwoTone';
import Tooltip from 'antd/es/tooltip';
import Typography from 'antd/es/typography';
import Card from 'antd/lib/card';
import Empty from 'antd/lib/empty';
import Radio from 'antd/lib/radio';
import Statistic from 'antd/lib/statistic';
import Table, { ColumnProps } from 'antd/lib/table';
import * as Highcharts from 'highcharts';
import moment, { Moment } from 'moment';
import 'moment-precise-range-plugin';
import React, { useMemo, useState } from 'react';
import { Box, Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { DATE_FORMAT } from '../constants';
import { Account, Transaction } from '../types';
import { formatCurrency, formatMoney, getCurrencyInCAD } from '../utils';
import { Charts } from './Charts';
import Collapsible from './Collapsible';
import CompositionGroup, { getGroupKey, GroupType } from './CompositionGroup';

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
          render: (text) => (isPrivateMode ? '-' : formatMoney(text, 0)),
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
      <Card
        title="Realized P&L History"
        headStyle={{ paddingLeft: 16, fontSize: 18, fontWeight: 'bold' }}
        style={{ marginTop: 16, marginBottom: 16 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<ClosedPosition>
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
      </Card>
    );
  },
);

export default function RealizedPnL({ currencyCache, transactions, accounts, isPrivateMode, fromDate }: Props) {
  const [timeline, setTimeline] = useState<'month' | 'year' | 'week' | 'day'>('month');
  const [compositionGroup, setCompositionGroup] = useState<GroupType>('type');

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
      account: accounts.find((account) => transaction.account === account.id),
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

  const getOptions = ({
    series,
  }: {
    series: Highcharts.SeriesColumnOptions[] | Highcharts.SeriesPieOptions[];
  }): Highcharts.Options => {
    return {
      series,

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
          text: 'P&L $ (CAD)',
        },
      },

      plotOptions: {
        column: {
          zones: [
            {
              value: -0.00000001,
              color: '#FF897C',
            },
            {
              color: '#84C341',
            },
          ],
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
    const gains = closedPositions.reduce((hash, value) => {
      const key = value.date.clone().startOf(timeline).format(DATE_FORMAT);
      hash[key] = hash[key] ? hash[key] + value.pnl : value.pnl;
      return hash;
    }, {} as { [K: string]: number });
    const data = Object.keys(gains)
      .map((date) => {
        return {
          date,
          label: getBarLabel(date),
          pnl: gains[date],
        };
      })
      .filter((value) => value.pnl)
      .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf())
      .map((value) => {
        return {
          date: value.date,
          label: value.label,
          pnl: value.pnl,
          startDate: moment(value.date).startOf(timeline).format(DATE_DISPLAY_FORMAT),
          endDate: moment(value.date).endOf(timeline).format(DATE_DISPLAY_FORMAT),
          color: value.pnl >= 0 ? 'green' : 'red',
        };
      });

    console.debug('Realized Gains data -- ', data);

    const series: Highcharts.SeriesColumnOptions[] = [
      {
        name: 'Realized P&L',
        type: 'column',
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
          headerFormat: '',
          pointFormat: `<span style="font-size: 12px;font-weight: 500;">{point.startDate} - {point.endDate}</span>
          <br />
          <b style="color: {point.color};font-size: 14px; font-weight: 700">{point.pnl} CAD</b><br />`,
        },
        dataLabels: {
          enabled: true,
          format: '{point.pnlHuman}',
        },
        showInLegend: false,
      },
    ];

    return series;
  };

  const getClosedPnLByAccountSeries = (
    closedPositions: ClosedPosition[],
    closedPnL: number,
    group: GroupType,
  ): Highcharts.SeriesPieOptions[] => {
    const data = Object.values(
      closedPositions.reduce((hash, position) => {
        const name = getGroupKey(group, position.account);
        let mergedAccount = hash[name];
        if (!mergedAccount) {
          mergedAccount = { name, pnl: 0 };
          hash[name] = mergedAccount;
        }
        mergedAccount.pnl += position.pnl;
        return hash;
      }, {} as { [K: string]: { name: string; pnl: number } }),
    );

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
          } as Highcharts.SeriesPieDataOptions;
        }),

      tooltip: {
        headerFormat: `<b>{point.key}<br />{point.percentage:.1f}%</b><hr />`,
        pointFormatter() {
          const point = this.options as any;
          return `<table>
          <tr><td>P/L</td><td align="right" class="position-tooltip-value">${point.displayValue} CAD</td></tr>
          <tr><td>Total P/L</td><td align="right" class="position-tooltip-value">${point.totalValue} CAD</td></tr>
        </table>`;
        },
      },
    };

    return [accountsSeries];
  };

  const closedPositions = useMemo(() => {
    return computeClosedPositions();
  }, [transactions, accounts, fromDate]);

  const closedPnL = useMemo(() => {
    return closedPositions.reduce((pnl, position) => pnl + position.pnl, 0);
  }, [closedPositions]);
  const options = useMemo(() => {
    return getOptions({ series: getData(closedPositions) });
  }, [closedPositions, timeline]);

  const accountSeriesOptions = useMemo(() => {
    return getOptions({ series: getClosedPnLByAccountSeries(closedPositions, closedPnL, compositionGroup) });
  }, [closedPositions, closedPnL, compositionGroup]);

  return !!closedPositions.length ? (
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

      <RealizedPnLTable closedPositions={closedPositions} isPrivateMode={isPrivateMode} />
    </>
  ) : (
    <Empty description="No realized gains for the selected time period." />
  );
}
