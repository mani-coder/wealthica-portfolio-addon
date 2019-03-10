import React, { Component } from 'react';
import { Portfolio } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import moment from 'moment';

type Props = {
  portfolios: Portfolio[];
};

export default class DepositVsPortfolioValueTimeline extends Component<Props> {
  getSeries() {
    return [
      {
        name: 'Portfolio',
        data: this.props.portfolios.map(portfolio => [moment(portfolio.date).valueOf(), portfolio.value]),
        type: 'spline',
        color: '#4E2E5E',
      },
      {
        name: 'Deposits',
        data: this.props.portfolios.map(portfolio => [moment(portfolio.date).valueOf(), portfolio.deposits]),
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
          linkedTo: 0,
        },
      ],
      plotOptions: {},
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
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
      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <HighchartsReact highcharts={Highcharts} constructorType={'stockChart'} options={this.getOptions()} />
      </div>
    );
  }
}
