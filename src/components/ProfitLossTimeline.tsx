import moment from 'moment';
import React from 'react';
import { Portfolio } from '../types';
import Charts from './Charts';
import Collapsible from './Collapsible';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

function ProfitLossTimeline(props: Props) {
  function getSeries(): any {
    return [
      {
        name: 'P&L',
        data: props.portfolios.map((portfolio) => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.value - portfolio.deposits,
            pnlRatio: ((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100,
            displayValue: props.isPrivateMode
              ? '-'
              : Number((portfolio.value - portfolio.deposits).toFixed(2)).toLocaleString(),
          };
        }),
        type: 'column',
      },
    ];
  }

  function getOptions(): Highcharts.Options {
    return {
      title: {
        text: 'Profit/Loss ($)',
      },
      subtitle: {
        text: 'Your P&L in dollars.',
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
      tooltip: {
        pointFormat:
          '<span style="color:{series.color}">{series.name}</span>: <b>{point.displayValue} ({point.pnlRatio:.2f}%)</b><br/>',
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
              subtitle: {
                text: undefined,
              },
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
    <Collapsible title="P&L Value Timeline">
      <Charts constructorType={'stockChart'} options={getOptions()} />
    </Collapsible>
  );
}

export default React.memo(ProfitLossTimeline);
