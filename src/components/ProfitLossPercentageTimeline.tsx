/* eslint-disable no-template-curly-in-string */
import moment from 'moment';
import React, { Component } from 'react';
import { Portfolio } from '../types';
import { formatCurrency, max, min } from '../utils';
import Charts from './Charts';
import Collapsible from './Collapsible';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

export default class ProfitLossPercentageTimeline extends Component<Props> {
  getSeries(): any {
    const data = this.props.portfolios.map((portfolio) => {
      return {
        x: moment(portfolio.date).valueOf(),
        y: ((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100,
        pnlValue: this.props.isPrivateMode
          ? '-'
          : formatCurrency(portfolio.value - portfolio.deposits, 2).toLocaleString(),
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
            text: 'Max Loss',
          },
        ].sort((a, b) => a.x - b.x),
        onSeries: 'dataseries',
        shape: 'squarepin',
        width: 16,
      },
    ];
  }

  getOptions(): Highcharts.Options {
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
        {
          labels: {
            format: '{value}%',
          },
          linkedTo: 0,
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
      <Collapsible title="P&L Ratio Timeline">
        <Charts constructorType={'stockChart'} options={this.getOptions()} />
      </Collapsible>
    );
  }
}
