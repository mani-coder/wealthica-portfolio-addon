import moment from 'moment';
import React from 'react';
import { Portfolio } from '../types';
import Charts from './Charts';
import Collapsible from './Collapsible';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

function DepositVsPortfolioValueTimeline(props: Props) {
  function getSeries(): any {
    return [
      {
        id: 'portfolio',
        name: 'Portfolio',
        data: props.portfolios.map((portfolio) => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.value,
            displayValue: props.isPrivateMode ? '-' : Number(portfolio.value.toFixed(2)).toLocaleString(),
          };
        }),
        type: 'spline',
        color: '#4E2E5E',
      },
      {
        id: 'deposits',
        name: 'Deposits',
        data: props.portfolios.map((portfolio) => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.deposits,
            displayValue: props.isPrivateMode ? '-' : Number(portfolio.deposits.toFixed(2)).toLocaleString(),
          };
        }),
        type: 'spline',
        color: '#C00316',
      },
    ];
  }

  function getOptions(): Highcharts.Options {
    return {
      title: {
        text: 'Deposits Vs Portfolio Value',
      },
      subtitle: {
        text:
          'This chart shows the total (deposits - withdrawals) made by you and the value of your portfolio value over the selected period of time.',
        style: {
          color: '#1F2A33',
        },
      },

      rangeSelector: {
        selected: 1,
        enabled: (process.env.NODE_ENV === 'development') as any,
        inputEnabled: false,
      },
      navigator: { enabled: true },
      scrollbar: { enabled: false },

      yAxis: [
        {
          crosshair: {
            dashStyle: 'Dash',
          },
          labels: {
            enabled: !props.isPrivateMode,
          },
          opposite: false,
        },
      ],
      plotOptions: {},
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.displayValue}</b><br/>',
        valueDecimals: 2,
        split: true,
      },

      responsive: {
        rules: [
          {
            condition: {
              maxWidth: 500,
            },
            chartOptions: {
              chart: {
                height: 300,
              },

              subtitle: {
                text: undefined,
              },
              yAxis: [
                {
                  labels: {
                    enabled: false,
                  },
                },
                {
                  labels: {
                    enabled: false,
                  },
                },
              ],
              navigator: {
                enabled: false,
              },
            },
          },
        ],
      },
      series: getSeries(),
    };
  }

  return (
    <Collapsible title="Deposits Vs Portfolio Value Timeline">
      <Charts constructorType={'stockChart'} options={getOptions()} />
    </Collapsible>
  );
}

export default React.memo(DepositVsPortfolioValueTimeline);
