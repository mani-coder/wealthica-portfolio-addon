import React, { Component } from 'react';
import { Position, Account } from '../types';
import Collapsible from 'react-collapsible';
import { getSymbol, formatCurrency, getURLParams } from '../utils';
import Charts from './Charts';
import moment from 'moment';
import _ from 'lodash';
import * as Highcharts from 'highcharts';
import StockTimeline from './StockTimeline';
import { TYPE_TO_COLOR } from '../constants';

type Props = {
  positions: Position[];
  accounts: Account[];
  isPrivateMode: boolean;
};

type State = {
  timelineSymbol?: string;
};

export default class HoldingsCharts extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      timelineSymbol: undefined,
    };
  }

  getDrillDown(): any {
    return {
      activeAxisLabelStyle: {
        textDecoration: 'none',
      },
      activeDataLabelStyle: {
        textDecoration: 'none',
      },

      series: this.props.positions.map(position => {
        return {
          type: 'column',
          id: getSymbol(position.security),
          name: getSymbol(position.security),
          data: position.transactions.map(transaction => {
            const isBuySell = ['buy', 'sell'].includes(transaction.type);
            const type = _.startCase(transaction.type);
            return {
              name: moment(transaction.date).format('MMM D, Y'),
              y: transaction.amount,
              color: TYPE_TO_COLOR[transaction.type.toLowerCase()],
              displayValue: transaction.amount.toLocaleString(),
              type,
              price: isBuySell ? transaction.price : 'N/A',
              shares: isBuySell ? transaction.shares : 'N/A',
              label: isBuySell
                ? `${transaction.shares}@${transaction.price}`
                : `${type}@${transaction.amount.toLocaleString()}`,
              transaction,
            };
          }),
          legend: {
            enabled: true,
            align: 'right',
            verticalAlign: 'top',
            layout: 'vertical',
            x: 0,
            y: 100,
          },

          tooltip: {
            useHTML: true,
            pointFormat: `<b>{point.label}</b>
            <br />Type: {point.type}`,
            valueDecimals: 1,
          },
          dataLabels: {
            enabled: !this.props.isPrivateMode,
            format: '{point.label}',
          },
          // showInLegend: true,
        };
      }),
    };
  }

  getPositionsSeries() {
    const marketValue = this.props.positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);
    const data = this.props.positions
      .sort((a, b) => b.market_value - a.market_value)
      .map(position => {
        return {
          name: getSymbol(position.security),
          drilldown: getSymbol(position.security),
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
        data,

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
        data: data.map(position => ({ ...position, drilldown: undefined })),

        events: {
          click: event => {
            if (event.point.name && this.state.timelineSymbol !== event.point.name) {
              this.setState({ timelineSymbol: event.point.name });
            }
          },
        },

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

  getUSDCADSeries() {
    const cashByCurrency = this.props.accounts.reduce((hash, account) => {
      const data = hash[account.currency] || { type: 'Cash', currency: account.currency, value: 0 };
      data.value += account.cash;
      hash[account.currency] = data;
      return hash;
    }, {});
    const positionDataByCurrency = this.props.positions.reduce((hash, position) => {
      const data = hash[position.security.currency] || {
        type: 'Stocks',
        currency: position.security.currency,
        value: 0,
        gain: 0,
      };
      data.value += position.market_value;
      data.gain += position.gain_amount;
      hash[position.security.currency] = data;
      return hash;
    }, {});
    const totalValue = Object.keys(positionDataByCurrency).reduce(
      (sum, currency) => {
        return sum + positionDataByCurrency[currency].value;
      },
      Object.keys(cashByCurrency).reduce((sum, currency) => {
        return sum + cashByCurrency[currency].value;
      }, 0),
    );

    return {
      type: 'pie',
      name: 'USD vs CAD',
      colorByPoint: true,
      // center: ['80%', '30%'],
      // size: 150,
      data: Object.keys(positionDataByCurrency)
        .map(currency => {
          const data = positionDataByCurrency[currency];
          return {
            name: `${currency.toUpperCase()} Stocks`,
            y: data.value,
            displayValue: data.value.toLocaleString(),
            gain: data.gain.toLocaleString(),
            gain_percent: (data.gain / data.value) * 100,
            totalValue: totalValue.toLocaleString(),
          };
        })
        .concat(
          Object.keys(cashByCurrency).map(currency => {
            const data = cashByCurrency[currency];
            return {
              name: `${currency.toUpperCase()} Cash`,
              y: data.value,
              displayValue: data.value.toLocaleString(),
              gain: 'N/A',
              gain_percent: 0,
              totalValue: totalValue.toLocaleString(),
            };
          }),
        ),
      tooltip: {
        pointFormat: `<b>{point.percentage:.1f}%</b>
        <br />Value: {point.displayValue}
        <br />Gain: {point.gain}
        <br />Gain %: {point.gain_percent:.2f}
        <br />Total Value: {point.totalValue}
        `,
      },
    };
  }

  getOptions = (title: string, yAxisTitle: string, series: any, drilldown?: boolean): Highcharts.Options => {
    return {
      series,
      drilldown: drilldown ? this.getDrillDown() : {},

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
  };

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
          <Charts options={this.getOptions('', 'Market Value ($)', [positionSeries[0]], true)} />
          <Charts options={this.getOptions('', '', [positionSeries[1]])} />

          {this.state.timelineSymbol && (
            <StockTimeline
              symbol={this.state.timelineSymbol}
              position={
                this.props.positions.filter(position => getSymbol(position.security) === this.state.timelineSymbol)[0]
              }
            />
          )}

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

        <Collapsible trigger="USD/CAD Composition" open>
          <Charts options={this.getOptions('USD/CAD Composition', '', [this.getUSDCADSeries()])} />
        </Collapsible>

        <Collapsible trigger="Top Losers/Gainers Chart" open>
          <Charts options={this.getOptions('P/L Ratio Per Stock', 'Gain/Loss (%)', this.getTopGainersLosers())} />
        </Collapsible>
      </>
    );
  }
}
