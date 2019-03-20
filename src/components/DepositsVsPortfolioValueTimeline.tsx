import React, { Component } from 'react';
import { Portfolio } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import moment from 'moment';
import Collapsible from 'react-collapsible';
// import { formatCurrency } from '../utils';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

export default class DepositVsPortfolioValueTimeline extends Component<Props> {
  getSeries() {
    return [
      {
        name: 'Portfolio',
        data: this.props.portfolios.map(portfolio => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.value,
            displayValue: this.props.isPrivateMode ? '-' : portfolio.value.toLocaleString(),
          };
        }),
        type: 'spline',
        color: '#4E2E5E',
      },
      {
        name: 'Deposits',
        data: this.props.portfolios.map(portfolio => {
          return {
            x: moment(portfolio.date).valueOf(),
            y: portfolio.deposits,
            displayValue: this.props.isPrivateMode ? '-' : portfolio.deposits.toLocaleString(),
          };
        }),
        type: 'spline',
        color: '#C00316',
      },
    ];
  }

  getOptions() {
    return {
      title: {
        text: 'Deposits Vs Portfolio Value',
      },
      rangeSelector: {
        selected: 5,
      },
      yAxis: [
        {
          labels: {
            enabled: !this.props.isPrivateMode,
          },
          opposite: false,
          plotLines: [
            {
              value: 0,
              width: 2,
              color: 'silver',
            },
          ],
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
                text: null,
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
        <HighchartsReact highcharts={Highcharts} constructorType={'stockChart'} options={this.getOptions()} />
      </Collapsible>
    );
  }
}
