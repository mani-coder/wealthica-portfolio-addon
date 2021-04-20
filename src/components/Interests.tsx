/* eslint-disable react-hooks/exhaustive-deps */
import { Typography } from 'antd';
import Card from 'antd/lib/card';
import Radio from 'antd/lib/radio';
import Statistic from 'antd/lib/statistic';
import Table, { ColumnProps } from 'antd/lib/table';
import moment from 'moment';
import 'moment-precise-range-plugin';
import React, { useMemo, useState } from 'react';
import { Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { DATE_FORMAT } from '../constants';
import { Account, AccountTransaction } from '../types';
import { formatCurrency, formatMoney } from '../utils';
import { Charts } from './Charts';

type Props = {
  transactions: AccountTransaction[];
  accounts: Account[];
  isPrivateMode: boolean;
};

const DATE_DISPLAY_FORMAT = 'MMM DD, YYYY';

export default function Interests({ transactions, accounts, isPrivateMode }: Props) {
  const [timeline, setTimeline] = useState<'month' | 'year' | 'week' | 'day'>('month');
  const accountNameById = useMemo(() => {
    return accounts.reduce((hash, account) => {
      hash[account.id] = `${account.name} ${account.type}`;
      return hash;
    }, {} as { [K: string]: string });
  }, [accounts]);

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
        render: (account) => accountNameById[account],
        width: 250,
      },
      {
        key: 'interest',
        title: 'Interest (CAD)',
        dataIndex: 'amount',
        render: (interest) => <Typography.Text strong>${formatMoney(interest)}</Typography.Text>,
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

  const getOptions = ({ series }: { series: Highcharts.SeriesColumnOptions[] }): Highcharts.Options => {
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
      plotOptions: {
        column: {
          color: '#ffa39e',
        },
      },

      yAxis: {
        labels: {
          enabled: !isPrivateMode,
        },
        title: {
          text: 'Interest $ (CAD)',
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

  const getData = (): Highcharts.SeriesColumnOptions[] => {
    const gains = transactions.reduce((hash, value) => {
      const key = value.date.clone().startOf(timeline).format(DATE_FORMAT);
      hash[key] = hash[key] ? hash[key] + value.amount : value.amount;
      return hash;
    }, {} as { [K: string]: number });
    const data = Object.keys(gains)
      .map((date) => {
        return {
          date,
          label: getBarLabel(date),
          interest: gains[date],
        };
      })
      .filter((value) => value.interest)
      .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf())
      .map((value) => {
        return {
          date: value.date,
          label: value.label,
          interest: value.interest,
          startDate: moment(value.date).startOf(timeline).format(DATE_DISPLAY_FORMAT),
          endDate: moment(value.date).endOf(timeline).format(DATE_DISPLAY_FORMAT),
        };
      });

    console.debug('Intrest data -- ', data);

    const series: Highcharts.SeriesColumnOptions[] = [
      {
        name: 'Interest',
        type: 'column',
        data: data.map((value) => ({
          key: value.label,
          name: value.label,
          label: value.label,
          y: value.interest,
          interest: !isPrivateMode ? formatMoney(value.interest) : '-',
          interestHuman: !isPrivateMode ? `$${formatCurrency(value.interest, 2)}` : '-',
          startDate: value.startDate,
          endDate: value.endDate,
        })),
        tooltip: {
          headerFormat: '',
          pointFormat: `<span style="font-size: 12px;font-weight: 500;">{point.startDate} - {point.endDate}</span>
          <br />
          <b style="font-size: 14px; font-weight: 700">{point.interest} CAD</b><br />`,
        },
        dataLabels: {
          enabled: true,
          format: '{point.interestHuman}',
        },
        showInLegend: false,
      },
    ];

    return series;
  };

  const interest = useMemo(() => transactions.reduce((interest, transaction) => interest + transaction.amount, 0), [
    transactions,
  ]);
  const options = useMemo(() => getOptions({ series: getData() }), [transactions, accountNameById, timeline]);

  return (
    <>
      <Flex mt={2} mb={3} justifyContent="center">
        <Statistic
          value={isPrivateMode ? '--' : interest}
          valueStyle={{ fontWeight: 600, fontSize: 36, color: '#ff7875' }}
          precision={2}
          prefix="C$"
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

      <Card
        title="Interest History"
        headStyle={{ paddingLeft: 16, fontSize: 18, fontWeight: 'bold' }}
        style={{ marginTop: 16, marginBottom: 16 }}
        bodyStyle={{ padding: 0 }}
      >
        <Table<AccountTransaction> dataSource={transactions.reverse()} columns={getColumns()} />
      </Card>
    </>
  );
}
