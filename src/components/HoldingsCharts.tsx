import React, { Component } from 'react';
import { Position } from '../types';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import Collapsible from 'react-collapsible';
import { getSymbol, formatCurrency, getURLParams } from '../utils';

type Props = {
  positions: Position[];
  isPrivateMode: boolean;
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
          displayValue: formatCurrency(position.market_value, 1),
          marketValue: position.market_value.toLocaleString(),
          percentage: (position.market_value / marketValue) * 100,
          gain: position.gain_percent * 100,
          profit: position.gain_amount.toLocaleString(),
          buyPrice: (
            position.investments.reduce((cost, investment) => {
              return cost + investment.book_value / investment.quantity;
            }, 0) / position.investments.length
          ).toLocaleString(),
          shares: position.quantity,
          lastPrice: position.security.last_price.toLocaleString(),
          currency: position.security.currency.toUpperCase(),
        };
      });
    return [
      {
        type: 'column',
        name: 'Holdings',
        colorByPoint: true,
        data: data,

        tooltip: {
          useHTML: true,
          pointFormat: `<b>{point.marketValue}</b>
          <br />Weightage: {point.percentage:.1f}%
          <br />Gain: {point.gain:.1f}%
          <br />Profit: {point.profit}
          <br />Shares: {point.shares}
          <br />Currency: {point.currency}
          <br />Buy Price: {point.buyPrice}
          <br />Last Price: {point.lastPrice}
          `,
          valueDecimals: 1,
        },
        dataLabels: {
          enabled: !this.props.isPrivateMode,
          format: '{point.displayValue}',
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
          <br />Value: {point.marketValue}
          <br />Gain: {point.gain:.1f}%
          <br />Profit: {point.profit}
          <br />Shares: {point.shares}
          <br />Currency: {point.currency}
          <br />Buy Price: {point.buyPrice}
          <br />Last Price: {point.lastPrice}
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
              gain: position.gain_amount.toLocaleString(),
            };
          }),
        tooltip: {
          pointFormat: '<b>{point.y:.1f}%</b><br />Gain: {point.gain} CAD',
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
        labels: {
          enabled: !this.props.isPrivateMode,
        },
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

  getPortfolioVisualizerLink() {
    const marketValue = this.props.positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);

    let remainingWeightage = 100;
    const params = getURLParams(
      this.props.positions.reduce((hash, position, index) => {
        // symbol1=QD&allocation1_1=1&
        // symbol2=TTD&allocation2_1=15
        let weightage = Number(((position.market_value / marketValue) * 100).toFixed(1));
        remainingWeightage -= weightage;
        remainingWeightage = Number(remainingWeightage.toFixed(1));
        if (index + 1 == this.props.positions.length) {
          weightage += remainingWeightage;
        }
        hash[`symbol${index + 1}`] = getSymbol(position.security);
        hash[`allocation${index + 1}_1`] = weightage;
        return hash;
      }, {}),
    );
    return `https://www.portfoliovisualizer.com/backtest-portfolio?s=y&timePeriod=4&initialAmount=10000&annualOperation=0&annualAdjustment=0&inflationAdjusted=true&annualPercentage=0.0&frequency=4&rebalanceType=1&showYield=false&reinvestDividends=true&${params}#analysisResults`;
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
          <div className="center">
            <div
              className="button"
              onClick={() => {
                window.open(this.getPortfolioVisualizerLink(), '_blank');
              }}
            >
              Portfolio Visualizer
            </div>
          </div>
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
