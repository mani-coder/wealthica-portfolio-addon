import React, { Component } from 'react';
import { Portfolio } from '../types';
import moment from 'moment';
import Collapsible from 'react-collapsible';
import Charts from './Charts';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

export default class DepositVsPortfolioValueTimeline extends Component<Props> {
  getSeries(): any {
    return [
      {
        name: 'Portfolio',
        data: this.props.portfolios.map((portfolio) => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.value,
            displayValue: this.props.isPrivateMode ? '-' : Number(portfolio.value.toFixed(2)).toLocaleString(),
          };
        }),
        type: 'spline',
        color: '#4E2E5E',
      },
      {
        name: 'Deposits',
        data: this.props.portfolios.map((portfolio) => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.deposits,
            displayValue: this.props.isPrivateMode ? '-' : Number(portfolio.deposits.toFixed(2)).toLocaleString(),
          };
        }),
        type: 'spline',
        color: '#C00316',
      },
    ];
  }

  getOptions(): Highcharts.Options {
    return {
      title: {
        text: 'Deposits Vs Portfolio Value',
      },
      rangeSelector: {
        selected: 1,
        enabled: process.env.NODE_ENV === 'development',
      },
      yAxis: [
        {
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
              navigator: {
                enabled: true,
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
      <Collapsible trigger="Deposits Vs Portfolio Value Timeline" open>
        <Charts constructorType={'stockChart'} options={this.getOptions()} />
      </Collapsible>
    );
  }
}
