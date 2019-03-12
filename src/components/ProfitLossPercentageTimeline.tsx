import React, { Component } from 'react';
import { Portfolio } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import moment from 'moment';
import Collapsible from 'react-collapsible';
import { min, max } from '../utils';

type Props = {
  portfolios: Portfolio[];
};

export default class ProfitLossPercentageTimeline extends Component<Props> {
  getSeries() {
    const data = this.props.portfolios.map(portfolio => {
      return {
        x: moment(portfolio.date).valueOf(),
        y: ((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100,
      };
    });
    return [
      {
        id: 'dataseries',
        name: 'P/L %',
        data: data,
        tooltip: {
          valueDecimals: 2,
        },
        type: 'line',
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
        ],
        onSeries: 'dataseries',
        shape: 'squarepin',
        width: 16,
      },
    ];
  }
  getOptions() {
    return {
      title: {
        text: 'Profit/Loss (%)',
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
        line: {
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
          labels: {
            formatter: function(value) {
              return `${value.value}%`;
            },
          },
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
          labels: {
            formatter: function(value) {
              return `${value.value}%`;
            },
          },
          linkedTo: 0,
        },
      ],
      tooltip: {
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}%</b><br/>',
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
      <Collapsible trigger="P/L Ratio Timeline" open>
        <HighchartsReact highcharts={Highcharts} constructorType={'stockChart'} options={this.getOptions()} />
      </Collapsible>
    );
  }
}
