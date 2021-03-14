import moment, { Moment } from 'moment';
import React from 'react';
import Collapsible from 'react-collapsible';
import { Portfolio } from '../types';
import { formatCurrency, getPreviousWeekday } from '../utils';
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
        text: 'P/L Change Over Multiple Time Periods',
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
    const dateObj = moment(date);
    if (dateObj.isoWeekday() >= 5) {
      date = dateObj.add(dateObj.isoWeekday() === 6 ? 2 : 1, 'days').format('YYYY-MM-DD');
    }
    const portfolio = portfolioReverse.find((portfolio) => portfolio.date <= date);
    return portfolio;
  };

  const getData = () => {
    let currentPortfolio = portfolioReverse[0];
    const currentDate = moment().utc();
    if (
      currentDate.format('YYYY-MM-DD') === currentPortfolio.date &&
      currentDate.hour() < 21 &&
      portfolioReverse.length > 1
    ) {
      currentPortfolio = portfolioReverse[1];
    }
    const lastDate = currentPortfolio.date;

    const portfolioValues: {
      id: string;
      label: string;
      date: Moment;
      startPortfolio: Portfolio;
      endPortfolio: Portfolio;
    }[] = [];

    [
      { id: '1D', label: '1 Day', date: getPreviousWeekday(lastDate) },
      { id: '1W', label: '1 Week', date: moment(lastDate).subtract(1, 'weeks') },
      { id: '1M', label: '1 Month', date: moment(lastDate).subtract(1, 'months').add(1, 'days') },
      { id: '3M', label: '3 Months', date: moment(lastDate).subtract(3, 'months').add(1, 'days') },
      { id: '6M', label: '6 Months', date: moment(lastDate).subtract(6, 'months').add(1, 'days') },
      { id: '1Y', label: '1 Year', date: moment(lastDate).subtract(1, 'years').add(1, 'days') },
      { id: '2Y', label: '2 Years', date: moment(lastDate).subtract(2, 'years').add(1, 'days') },
      { id: '3Y', label: '3 Years', date: moment(lastDate).subtract(3, 'years').add(1, 'days') },
      { id: '5Y', label: '5 Years', date: moment(lastDate).subtract(5, 'years').add(1, 'days') },
      { id: 'MTD', label: 'Month To Date', date: moment(lastDate).startOf('month') },
      { id: 'WTD', label: 'Week To Date', date: moment(lastDate).startOf('week') },
      { id: 'YTD', label: 'Year To Date', date: moment(lastDate).startOf('year') },
    ].map((value) => {
      const portfolio = getNearestPortfolioDate(value.date.format('YYYY-MM-DD'));
      if (portfolio) {
        portfolioValues.push({
          id: value.id,
          label: value.label,
          date: value.date,
          startPortfolio: portfolio,
          endPortfolio: currentPortfolio,
        });
      }
    });

    [1, 2, 3, 4].forEach((value) => {
      const year = moment(lastDate).subtract(value, 'years').year();
      const startDate = moment().day(1).month('Jan').year(year);

      const startPortfolio = getNearestPortfolioDate(startDate.format('YYYY-MM-DD'));
      const endPortfolio = getNearestPortfolioDate(moment().year(year).month('Dec').day(31).format('YYYY-MM-DD'));

      if (startPortfolio && endPortfolio) {
        portfolioValues.push({
          id: `FY ${year}`,
          label: `Jan - Dec ${year}`,
          date: startDate,
          startPortfolio,
          endPortfolio,
        });
      }
    });

    const data = portfolioValues
      .filter((value) => value.endPortfolio.date !== value.startPortfolio.date)
      .sort((a, b) => a.date.valueOf() - b.date.valueOf())
      .map((value) => {
        const startPnl = value.startPortfolio.value - value.startPortfolio.deposits;
        const endPnl = value.endPortfolio.value - value.endPortfolio.deposits;

        const changeValue = endPnl - startPnl;
        const changeRatio = (endPnl / value.endPortfolio.deposits - startPnl / value.startPortfolio.deposits) * 100;

        return {
          id: value.id,
          label: value.label,
          date: value.date.format(DATE_DISPLAY_FORMAT),
          startDate: moment(value.startPortfolio.date).format(DATE_DISPLAY_FORMAT),
          endDate: moment(value.endPortfolio.date).format(DATE_DISPLAY_FORMAT),
          startPnl,
          endPnl,
          changeRatio,
          changeValue,
          color: changeRatio >= 0 ? 'green' : 'red',
        };
      });

    console.debug('PnL change data -- ', data);

    const series: Highcharts.SeriesColumnOptions[] = [
      {
        name: 'PnL Change %',
        type: 'column',
        data: data.map((value) => ({
          key: value.id,
          name: value.id,
          label: value.label,
          y: value.changeRatio,

          startDate: value.startDate,
          endDate: value.endDate,
          startPnl: !props.isPrivateMode ? formatCurrency(value.startPnl, 2) : '-',
          endPnl: !props.isPrivateMode ? formatCurrency(value.endPnl, 2) : '-',
          changeValue: !props.isPrivateMode ? `$${formatCurrency(value.changeValue, 1)}` : '-',
        })),
        tooltip: {
          headerFormat: '',
          pointFormat: `<b style="font-size: 13px;">{point.label} ({point.key})</b><br /><b style="color: {point.color};font-size: 14px;">{point.y:.1f}% ({point.changeValue})</b><br /><hr />
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

    return series;
  };

  const options = getOptions({
    series: getData(),
  });

  return (
    <Collapsible trigger="P/L Change Over Multiple Time Periods" open>
      <Charts options={options} />
    </Collapsible>
  );
}
