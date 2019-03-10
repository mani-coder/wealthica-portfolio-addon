import React, { Component } from 'react';
import { Position } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';

type Props = {
  positions: Position[];
};

export default class PositionsCharts extends Component<Props> {
  getPositionsSeries() {
    const marketValue = this.props.positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);
    return [
      {
        type: 'column',
        name: 'Positions',
        colorByPoint: true,
        data: this.props.positions
          .sort((a, b) => b.market_value - a.market_value)
          .map(position => {
            return {
              name: `${position.security.symbol}${position.security.currency === 'usd' ? '' : '.TO'}`,
              y: position.market_value,
              percentage: (position.market_value / marketValue) * 100,
              gain: position.gain_percent * 100,
            };
          }),

        tooltip: {
          pointFormat: '<b>{point.y:.1f} CAD</b><br />Weightage: {point.percentage:.1f}%<br />Gain: {point.gain:.1f}%',
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.0f}',
        },
      },
      {
        type: 'pie',
        name: 'Positions',
        colorByPoint: true,
        data: this.props.positions
          .sort((a, b) => b.market_value - a.market_value)
          .map(position => {
            return {
              name: `${position.security.symbol}${position.security.currency === 'usd' ? '' : '.TO'}`,
              y: (position.market_value / marketValue) * 100,
              gain: position.gain_percent * 100,
            };
          }),

        tooltip: {
          pointFormat: '<b>{point.y:.1f}%</b><br />Gain: {point.gain:.1f}%',
        },
        center: ['75%', '25%'],
        size: '100%',
        showInLegend: false,
      },
    ];
  }

  getTopGainersLosers() {
    return [
      {
        name: 'Top Gainers / Losers',
        type: 'column',
        colorByPoint: true,
        data: this.props.positions
          .sort((a, b) => a.gain_percent - b.gain_percent)
          .map(position => {
            return {
              name: `${position.security.symbol}${position.security.currency === 'usd' ? '' : '.TO'}`,
              y: position.gain_percent * 100,
              gain: position.gain_amount,
            };
          }),
        tooltip: {
          pointFormat: '<b>{point.y:.1f}%</b><br />Gain: {point.gain:.2f} CAD',
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.1f}',
        },
      },
    ];
  }

  // getUSDCADSeries() {
  //   return [
  //     {
  //       name: 'USD vs CAD Stocks',
  //       colorByPoint: true,
  //       data: [
  //         {
  //           name: 'USD Stocks',
  //           y: this.props.positions
  //             .filter(position => position.security.currency === 'usd')
  //             .reduce((sum, position) => {
  //               return sum + position.market_value;
  //             }, 0),
  //         },
  //         {
  //           name: 'CAD Stocks',
  //           y: this.props.positions
  //             .filter(position => position.security.currency === 'cad')
  //             .reduce((sum, position) => {
  //               return sum + position.market_value;
  //             }, 0),
  //         },
  //       ],
  //       tooltip: {
  //         pointFormat: '<b>{point.percentage:.1f}%</b>',
  //       },
  //     },
  //   ];
  // }

  getOptions(title, yAxisTitle, series) {
    return {
      series,
      title: {
        text: title,
      },
      xAxis: {
        type: 'category',
        labels: {
          rotation: -45,
          style: {
            fontSize: '13px',
            fontFamily: 'Verdana, sans-serif',
          },
        },
      },

      yAxis: {
        title: {
          text: yAxisTitle,
        },
      },

      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
            style: {
              color: 'black',
            },
          },
        },
      },
    };
  }

  render() {
    return (
      <div style={{ marginTop: 32, marginBottom: 32, flex: 1, flexDirection: 'row' }}>
        <HighchartsReact
          highcharts={Highcharts}
          options={this.getOptions('Positions', 'Market Value ($)', this.getPositionsSeries())}
        />
        <HighchartsReact
          highcharts={Highcharts}
          options={this.getOptions('Gain/Loss Ratio', 'Gain/Loss Percentage', this.getTopGainersLosers())}
        />
      </div>
    );
  }
}
