import React, { Component } from 'react';
import { Position } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import Collapsible from 'react-collapsible';
import { getSymbol } from '../utils';

type Props = {
  positions: Position[];
};

export default class HoldingsCharts extends Component<Props> {
  getPositionsSeries() {
    const marketValue = this.props.positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);
    const data = this.props.positions
      .sort((a, b) => b.market_value - a.market_value)
      .map(position => {
        return {
          name: getSymbol(position.security),
          y: position.market_value,
          percentage: (position.market_value / marketValue) * 100,
          gain: position.gain_percent * 100,
          profit: position.gain_amount,
          shares: position.quantity,
        };
      });
    return [
      {
        type: 'column',
        name: 'Holdings',
        colorByPoint: true,
        data: data,

        tooltip: {
          pointFormat: `<b>{point.y:.1f}</b>
          <br />Weightage: {point.percentage:.1f}%
          <br />Gain: {point.gain:.1f}%
          <br />Profit: {point.profit:.1f}
          <br />Shares: {point.shares}
          `,
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.0f}',
        },
        showInLegend: false,
      },
      {
        type: 'pie',
        name: 'Holdings',
        colorByPoint: true,
        data: data,

        tooltip: {
          pointFormat: `<b>{point.percentage:.1f}%</b>
          <br />Value: {point.y:.1f}
          <br />Gain: {point.gain:.1f}%
          <br />Profit: {point.profit:.1f}
          <br />Shares: {point.shares}
          `,
        },
      },
    ];
  }

  getTopGainersLosers() {
    return [
      {
        name: 'Top Losers / Gainers',
        type: 'column',
        colorByPoint: true,
        data: this.props.positions
          .sort((a, b) => a.gain_percent - b.gain_percent)
          .map(position => {
            return {
              name: getSymbol(position.security),
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
        showInLegend: false,
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
    const positionSeries = this.getPositionsSeries();
    return (
      <>
        <Collapsible trigger="Holdings Chart" open>
          <HighchartsReact
            highcharts={Highcharts}
            options={this.getOptions('', 'Market Value ($)', [positionSeries[0]])}
          />
          <HighchartsReact highcharts={Highcharts} options={this.getOptions('', '', [positionSeries[1]])} />
        </Collapsible>
        <Collapsible trigger="Top Losers/Gainers Chart" open>
          <HighchartsReact
            highcharts={Highcharts}
            options={this.getOptions('P/L Ratio Per Stock', 'Gain/Loss (%)', this.getTopGainersLosers())}
          />
        </Collapsible>
      </>
    );
  }
}
