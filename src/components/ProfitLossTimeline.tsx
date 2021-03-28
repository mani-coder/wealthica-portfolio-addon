import moment from 'moment';
import React, { Component } from 'react';
import { Portfolio } from '../types';
import Charts from './Charts';
import Collapsible from './Collapsible';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

export default class ProfitLossTimeline extends Component<Props> {
  getSeries(): any {
    return [
      {
        name: 'P&L',
        data: this.props.portfolios.map((portfolio) => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.value - portfolio.deposits,
            pnlRatio: ((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100,
            displayValue: this.props.isPrivateMode
              ? '-'
              : Number((portfolio.value - portfolio.deposits).toFixed(2)).toLocaleString(),
          };
        }),
        type: 'column',
      },
    ];
  }

  getOptions(): Highcharts.Options {
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
        enabled: process.env.NODE_ENV === 'development',
      },

      scrollbar: {
        barBackgroundColor: 'gray',
        barBorderRadius: 7,
        barBorderWidth: 0,
        buttonBackgroundColor: 'gray',
        buttonBorderWidth: 0,
        buttonBorderRadius: 7,
        trackBackgroundColor: 'none',
        trackBorderWidth: 1,
        trackBorderRadius: 8,
        trackBorderColor: '#CCC',
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

      yAxis: [
        {
          crosshair: {
            dashStyle: 'Dash',
          },
          labels: {
            enabled: !this.props.isPrivateMode,
          },
          opposite: false,
        },
        {
          labels: {
            enabled: !this.props.isPrivateMode,
          },
          linkedTo: 0,
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
      series: this.getSeries(),
    };
  }

  render() {
    return (
      <Collapsible title="P&L Value Timeline">
        <Charts constructorType={'stockChart'} options={this.getOptions()} />
      </Collapsible>
    );
  }
}
