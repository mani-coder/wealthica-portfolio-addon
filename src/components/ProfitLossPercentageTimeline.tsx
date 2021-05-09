/* eslint-disable no-template-curly-in-string */
import moment from 'moment';
import React from 'react';
import { Portfolio } from '../types';
import { formatCurrency, max, min } from '../utils';
import Charts from './Charts';
import Collapsible from './Collapsible';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

function ProfitLossPercentageTimeline(props: Props) {
  function getSeries(): any {
    const data = props.portfolios.map((portfolio) => {
      return {
        x: moment(portfolio.date).valueOf(),
        y: ((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100,
        pnlValue: props.isPrivateMode ? '-' : formatCurrency(portfolio.value - portfolio.deposits, 2).toLocaleString(),
      };
    });
    return [
      {
        id: 'dataseries',
        name: 'P&L %',
        data: data,
        tooltip: {
          valueDecimals: 2,
        },
        type: 'spline',
      },
      {
        type: 'flags',
        name: 'Max Gain/Loss',
        data: [
          {
            ...min(data, 'y'),
            title: 'L',
            text: 'Max Loss',
          },
          {
            ...max(data, 'y'),
            title: 'G',
            text: 'Max Gain',
          },
        ].sort((a, b) => a.x - b.x),
        onSeries: 'dataseries',
        shape: 'squarepin',
        width: 16,
      },
    ];
  }

  function getOptions(): Highcharts.Options {
    return {
      title: {
        text: 'Profit/Loss (%)',
      },
      subtitle: {
        text: 'Your P&L ratio.',
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
        spline: {
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
            format: '{value}%',
          },
          opposite: false,
        },
      ],
      tooltip: {
        pointFormat:
          '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}% (${point.pnlValue})</b><br/>',
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
    <Collapsible title="P&L Ratio Timeline">
      <Charts constructorType={'stockChart'} options={getOptions()} />
    </Collapsible>
  );
}

export default React.memo(ProfitLossPercentageTimeline);
