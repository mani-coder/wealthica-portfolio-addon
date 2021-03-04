import moment, { Moment } from 'moment';
import React from 'react';
import Collapsible from 'react-collapsible';
import { Portfolio } from '../types';
import { formatCurrency } from '../utils';
import Charts from './Charts';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

const DATE_DISPLAY_FORMAT = 'MMM DD, YYYY';

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
    const portfolioValues: { label: string; date: Moment; startPortfolio: Portfolio; endPortfolio: Portfolio }[] = [];

    [
      { label: '1 Day', date: moment(lastDate).subtract(1, 'days') },
      { label: '1 Week', date: moment(lastDate).subtract(1, 'weeks') },
      { label: '2 Weeks', date: moment(lastDate).subtract(2, 'weeks') },
      { label: '1 Month', date: moment(lastDate).subtract(1, 'months').add(1, 'days') },
      { label: '3 Months', date: moment(lastDate).subtract(3, 'months').add(1, 'days') },
      { label: '6 Months', date: moment(lastDate).subtract(6, 'months').add(1, 'days') },
      { label: '1 Year', date: moment(lastDate).subtract(1, 'years').add(1, 'days') },
      { label: '2 Years', date: moment(lastDate).subtract(2, 'years').add(1, 'days') },
      { label: '3 Years', date: moment(lastDate).subtract(3, 'years').add(1, 'days') },
      { label: '5 Years', date: moment(lastDate).subtract(5, 'years').add(1, 'days') },
    ].map((value) => {
      const portfolio = getNearestPortfolioDate(value.date.format('YYYY-MM-DD'));
      if (portfolio) {
        portfolioValues.push({
          label: value.label,
          date: value.date,
          startPortfolio: portfolio,
          endPortfolio: currentPortfolio,
        });
      }
    });

    [0, 1, 2, 3, 4].forEach((value) => {
      const year = moment(lastDate).subtract(value, 'years').year();
      const startDate = moment().year(year).day(1).month('Jan');

      const startPortfolio = getNearestPortfolioDate(startDate.format('YYYY-MM-DD'));
      const endPortfolio = value
        ? getNearestPortfolioDate(moment().year(year).month('Dec').day(31).format('YYYY-MM-DD'))
        : currentPortfolio;

      if (startPortfolio && endPortfolio) {
        portfolioValues.push({
          label: value ? `Jan - Dec ${year}` : 'Year To Date',
          date: startDate,
          startPortfolio,
          endPortfolio,
        });
      }
    });

    const data = portfolioValues
      .sort((a, b) => a.date.valueOf() - b.date.valueOf())
      .map((value) => {
        const startPnl = value.startPortfolio.value - value.startPortfolio.deposits;
        const endPnl = value.endPortfolio.value - value.endPortfolio.deposits;

        const changeValue = endPnl - startPnl;
        const changeRatio = (changeValue / startPnl) * 100;

        return {
          label: value.label,
          startDate: moment(value.startPortfolio.date).format(DATE_DISPLAY_FORMAT),
          endDate: moment(value.endPortfolio.date).format(DATE_DISPLAY_FORMAT),
          startPnl,
          endPnl,
          changeRatio,
          changeValue,
          color: changeRatio >= 0 ? 'green' : 'red',
        };
      });

    console.debug('PnL change %', data);

    return [
      {
        name: 'PnL Change %',
        type: 'column',
        data: data.map((value) =>
          value
            ? {
                name: value.label,
                y: value.changeRatio,

                startDate: value.startDate,
                endDate: value.endDate,
                startPnl: !props.isPrivateMode ? formatCurrency(value.startPnl, 2) : '-',
                endPnl: !props.isPrivateMode ? formatCurrency(value.endPnl, 2) : '-',
                changeValue: !props.isPrivateMode ? `$${formatCurrency(value.changeValue, 1)}` : '-',
              }
            : {},
        ),
        tooltip: {
          useHTML: true,
          pointFormat: `<b style="color: {point.color};font-size: 14px;">{point.y:.1f}% ({point.changeValue})</b><br /><hr />
            P/L on {point.startDate}: <b>{point.startPnl}</b><br />
            P/L on {point.endDate}: <b>{point.endPnl}</b><br />`,
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.1f}% ({point.changeValue})',
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
