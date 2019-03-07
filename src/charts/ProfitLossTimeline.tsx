import React, { Component } from 'react';
import { Portfolio } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import moment from 'moment';

type Props = {
  portfolios: Portfolio[];
};

export default class ProfitLossTimeline extends Component<Props> {
  getSeries() {
    return [
      {
        name: 'Portfolio Value',
        data: this.props.portfolios.map(portfolio => [
          moment(portfolio.date).valueOf(),
          portfolio.value - portfolio.deposits,
        ]),
        tooltip: {
          valueDecimals: 2,
        },
        type: 'column',
      },
    ];
  }
  getOptions() {
    return {
      title: {
        text: 'Profit/Loss ($)',
      },
      rangeSelector: {
        selected: 5,
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
          opposite: false,
          plotLines: [
            {
              value: 0,
              width: 1,
              color: 'silver',
            },
          ],
        },
        {
          linkedTo: 0,
        },
      ],
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
        valueDecimals: 2,
        split: true,
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
