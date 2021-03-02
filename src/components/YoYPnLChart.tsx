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
  const getOptions = ({
    title,
    yAxisTitle,
    subtitle,
    series,
  }: {
    series: any;
    title?: string;
    subtitle?: string;
    yAxisTitle?: string;
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
        text: title,
      },
      subtitle: {
        text: subtitle,
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
          text: yAxisTitle,
        },
      },

      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: 'black',
            },
          },
        },
      },
    };
  };

  const getNearestPortfolioDate = (date: string): Portfolio | undefined => {
    return portfolioReverse.find((portfolio) => portfolio.date <= date);
  };

  const getData = () => {
    const lastDate = portfolioReverse[0].date;
    const currentPortfolio = portfolioReverse[0];

    const data = [
      { label: '1D', date: moment(lastDate).subtract(1, 'days') },
      { label: '3D', date: moment(lastDate).subtract(3, 'days') },
      { label: '1W', date: moment(lastDate).subtract(1, 'weeks') },
      { label: '2W', date: moment(lastDate).subtract(2, 'weeks') },
      { label: '1M', date: moment(lastDate).subtract(1, 'months').add(1, 'days') },
      { label: '3M', date: moment(lastDate).subtract(3, 'months').add(1, 'days') },
      { label: '6M', date: moment(lastDate).subtract(6, 'months').add(1, 'days') },
      { label: '1Y', date: moment(lastDate).subtract(1, 'years').add(1, 'days') },
      { label: '2Y', date: moment(lastDate).subtract(2, 'years').add(1, 'days') },
      { label: '3Y', date: moment(lastDate).subtract(3, 'years').add(1, 'days') },
      { label: '5Y', date: moment(lastDate).subtract(5, 'years').add(1, 'days') },
    ].map((value) => {
      const portfolio = getNearestPortfolioDate(value.date.format('YYYY-MM-DD'));
      const yoyPct = portfolio
        ? ((currentPortfolio.value - currentPortfolio.deposits - (portfolio.value - portfolio.deposits)) /
            (portfolio.value - portfolio.deposits)) *
          100
        : undefined;
      return {
        label: value.label,
        date: value.date.format('YYYY-MM-DD'),
        gain: portfolio
          ? currentPortfolio.value - currentPortfolio.deposits - (portfolio.value - portfolio.deposits)
          : undefined,
        portfolio,
        yoyPct,
      };
    });

    console.debug('PnL change %', data);

    return [
      {
        name: 'PnL Change %',
        type: 'column',
        colorByPoint: true,
        data: data
          .filter((data) => data.portfolio)
          .map((data) => {
            return {
              name: data.label,
              y: data.yoyPct,
              gain: data.gain ? formatCurrency(data.gain, 2) : undefined,
            };
          }),
        tooltip: {
          pointFormat: '<b>{point.y:.1f}%</b><br />Gain: {point.gain} CAD',
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.1f}',
        },
        showInLegend: false,
      },
    ];
  };

  const options = getOptions({
    title: 'PnL Change %',
    yAxisTitle: 'PnL Change (%)',
    series: getData(),
  });

  return (
    <Collapsible trigger="PnL Change %" open>
      <Charts options={options} />
    </Collapsible>
  );
}
