import _ from 'lodash';
import moment from 'moment';
import React from 'react';
import { RegisteredAccountType } from '../constants';
import { Account } from '../types';
import Charts from './Charts';
import Collapsible from './Collapsible';

export const REGISTERED_ACCOUNT_TYPE_TO_TYPES: { [id in RegisteredAccountType]: string[] } = {
  [RegisteredAccountType.RRSP]: ['rsp', 'rrsp', 'registered retirement savings plan'],
  [RegisteredAccountType.TFSA]: ['tfsa', 'tax free savings account'],
  [RegisteredAccountType.SRRSP]: [
    'srsp',
    'srrsp',
    'spousal registered retirement savings plan',
    'spouse registered retirement savings plan',
  ],
};

export default function Contributions({ accounts, privateMode }: { accounts: Account[]; privateMode: boolean }) {
  function getSeries(type: RegisteredAccountType): Highcharts.SeriesColumnOptions[] {
    const validAccountTypes = REGISTERED_ACCOUNT_TYPE_TO_TYPES[type];
    const validAccounts = accounts.filter(
      (account) => account.type && validAccountTypes.includes(account.type.toLowerCase()),
    );
    if (!validAccounts.length) {
      return [];
    }

    const data: { name: string; year: string; contributions: number }[] = [];
    _.range(0, 10).forEach((value) => {
      const year = moment().subtract(value, 'years').year();
      const startDate =
        type === RegisteredAccountType.TFSA
          ? moment().year(year).month('Jan').startOf('month')
          : moment().year(year).month('Mar').startOf('month');

      const endDate =
        type === RegisteredAccountType.TFSA
          ? moment().year(year).month('Dec').endOf('month')
          : moment()
              .year(year + 1)
              .month('Feb')
              .endOf('month');

      const contributionsByInstitution = validAccounts.reduce((hash, account) => {
        const contributions = (account.cashTransactions || [])
          .filter(
            (transaction) =>
              moment(transaction.date).isSameOrAfter(startDate) && moment(transaction.date).isSameOrBefore(endDate),
          )
          .reduce((_contribution, transaction) => _contribution + transaction.amount, 0);

        if (!hash[account.name]) {
          hash[account.name] = 0;
        }
        hash[account.name] = contributions;
        return hash;
      }, {} as { [K: string]: number });

      Object.keys(contributionsByInstitution).map((name) => {
        const contributions = contributionsByInstitution[name];
        if (contributions) {
          data.push({
            name,
            year: `FY ${year}`,
            contributions,
          });
        }
      });
    });
    console.log('mani is cool', { data });

    const series: Highcharts.SeriesColumnOptions[] = [
      {
        name: `${type} Contributions`,
        type: 'column',
        data: data.reverse().map((value) => ({
          key: value.year,
          name: value.year,
          label: value.year,
          y: value.contributions,
          cash: Number(value.contributions.toFixed(2)).toLocaleString(),
        })),
        tooltip: {
          pointFormat: `{point.cash} CAD`,
        },
        dataLabels: {
          enabled: true,
          format: '${point.cash}',
        },
        showInLegend: false,
      },
      {
        name: `${type} Contributions`,
        type: 'column',
        data: data
          .reverse()
          .filter((value) => value.contributions)
          .map((value) => ({
            key: value.year,
            name: value.year,
            label: value.year,
            y: value.contributions,
            cash: Number(value.contributions.toFixed(2)).toLocaleString(),
          })),
        tooltip: {
          pointFormat: `{point.cash} CAD`,
        },
        dataLabels: {
          enabled: true,
          format: '${point.cash}',
        },
        showInLegend: false,
      },
    ];

    return series;
  }
  function getOptions({
    series,
    title,
  }: {
    series: Highcharts.SeriesColumnOptions[];
    title: string;
  }): Highcharts.Options {
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
        text: title,
      },
      // subtitle: {
      //   text:
      //     'This chart shows how your portfolio had performed in multiple time slices. This chart is inspired based on YoY growth. You might want to see the change in your P&L in the last few days, weeks, months, years etc.,',
      //   style: {
      //     color: '#1F2A33',
      //   },
      // },
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
          enabled: !privateMode,
        },
        title: {
          text: 'Cash ($)',
        },
      },
    };
  }

  function renderContributionsChart(type: RegisteredAccountType) {
    const series = getSeries(type);
    return (
      <Collapsible title={type}>
        <Charts options={getOptions({ series, title: type.toString() })} />
      </Collapsible>
    );
  }

  return (
    <>
      {renderContributionsChart(RegisteredAccountType.RRSP)}
      {renderContributionsChart(RegisteredAccountType.SRRSP)}
      {renderContributionsChart(RegisteredAccountType.TFSA)}
    </>
  );
}
