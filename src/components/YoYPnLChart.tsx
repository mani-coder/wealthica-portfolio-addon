import moment from 'moment';
import React from 'react';
import Collapsible from 'react-collapsible';
import { Portfolio } from '../types';
import { formatCurrency } from '../utils';
import Charts from './Charts';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

export default function YoYPnLChart(props: Props) {
  const portfolioReverse = props.portfolios.slice().reverse();

  const getOptions = ({ series }: { series: any }): Highcharts.Options => {
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
        text: 'P/L (as-of-date) Change Over Multiple Time Periods',
      },
      subtitle: {
        text:
          'This chart shows how your portfolio had performed in multiple time slices. This chart is inspired based on YoY growth. You might want to see the change in your P/L in the last few days, weeks, months, years etc.,',
        style: {
          color: '#1F2A33',
        },
      },
      xAxis: {
        type: 'category',
        labels: {
          // rotation: -45,
          style: {
            fontSize: '13px',
            fontFamily: 'Verdana, sans-serif',
          },
        },
      },

      yAxis: {
        labels: {
          enabled: !props.isPrivateMode,
        },
        title: {
          text: 'P/L Change (%)',
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

  const getNearestPortfolioDate = (date: string): Portfolio | undefined => {
    return portfolioReverse.find((portfolio) => portfolio.date <= date);
  };

  const getData = () => {
    let lastDate = portfolioReverse[0].date;
    const currentDate = moment().utc();
    if (currentDate.format('YYYY-MM-DD') === lastDate && currentDate.hour() < 21 && portfolioReverse.length > 1) {
      lastDate = portfolioReverse[1].date;
    }

    const currentPortfolio = portfolioReverse[0];

    const data = [
      { label: '1D', longLabel: '1 Day', date: moment(lastDate).subtract(1, 'days') },
      // { label: '3D', longLabel: '3 Days', date: moment(lastDate).subtract(3, 'days') },
      { label: '1W', longLabel: '1 Week', date: moment(lastDate).subtract(1, 'weeks') },
      { label: '2W', longLabel: '2 Weeks', date: moment(lastDate).subtract(2, 'weeks') },
      { label: '1M', longLabel: '1 Month', date: moment(lastDate).subtract(1, 'months').add(1, 'days') },
      { label: '3M', longLabel: '3 Months', date: moment(lastDate).subtract(3, 'months').add(1, 'days') },
      { label: '6M', longLabel: '6 Months', date: moment(lastDate).subtract(6, 'months').add(1, 'days') },
      { label: '1Y', longLabel: '1 Year', date: moment(lastDate).subtract(1, 'years').add(1, 'days') },
      { label: '2Y', longLabel: '2 Years', date: moment(lastDate).subtract(2, 'years').add(1, 'days') },
      { label: '3Y', longLabel: '3 Years', date: moment(lastDate).subtract(3, 'years').add(1, 'days') },
      { label: '5Y', longLabel: '5 Years', date: moment(lastDate).subtract(5, 'years').add(1, 'days') },
    ].map((value) => {
      const portfolio = getNearestPortfolioDate(value.date.format('YYYY-MM-DD'));
      if (!portfolio) {
        return {
          label: value.label,
          longLabel: value.longLabel,
          date: value.date.format('YYYY-MM-DD'),
        };
      }

      const currentPnL = currentPortfolio.value - currentPortfolio.deposits;
      const pnl = portfolio.value - portfolio.deposits;
      const change = currentPnL - pnl;
      const changeRatio = (change / pnl) * 100;

      return {
        label: value.label,
        longLabel: value.longLabel,
        date: portfolio.date,
        currentPnL,
        pnl,
        portfolio,
        changeRatio,
        change,
        color: changeRatio >= 0 ? 'green' : 'red',
      };
    });

    console.debug('PnL change %', data);

    return [
      {
        name: 'PnL Change %',
        type: 'column',
        data: data
          .filter((value) => value.portfolio)
          .map((value) => {
            return {
              name: value.longLabel,
              desc: value.longLabel,
              y: value.changeRatio,

              date: moment(value.date).format('MMM DD, YYYY'),
              currentDate: moment(lastDate).format('MMM DD, YYYY'),
              currentPnL: !props.isPrivateMode && value.currentPnL ? formatCurrency(value.currentPnL, 2) : '-',
              pnl: !props.isPrivateMode && value.pnl ? formatCurrency(value.pnl, 2) : '-',
              value: !props.isPrivateMode && value.change ? `$${formatCurrency(value.change, 1)}` : '-',
            };
          })
          .reverse(),
        tooltip: {
          useHTML: true,
          pointFormat: `<b style="color: {point.color};font-size: 14px;">{point.y:.1f}% ({point.value})</b><br /><hr />
            P/L on {point.date}: <b>{point.pnl}</b><br />
            P/L on {point.currentDate}: <b>{point.currentPnL}</b><br />`,
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.1f}% ({point.value})',
        },
        showInLegend: false,
      },
    ];
  };

  const options = getOptions({
    series: getData(),
  });

  return (
    <Collapsible trigger="P/L (as-of-date) Change Over Multiple Time Periods" open>
      <Charts options={options} />
    </Collapsible>
  );
}
