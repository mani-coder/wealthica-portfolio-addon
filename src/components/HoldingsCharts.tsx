import Select from 'antd/es/select';
import Typography from 'antd/es/typography';
import * as Highcharts from 'highcharts';
import React, { useState } from 'react';
import Collapsible from 'react-collapsible';
import { Flex } from 'rebass';
import { Account, Position } from '../types';
import { formatCurrency, formatMoney, getSymbol, getURLParams } from '../utils';
import Charts from './Charts';
import StockDetails from './StockDetails';
import StockTimeline from './StockTimeline';

type Props = {
  positions: Position[];
  accounts: Account[];
  isPrivateMode: boolean;
  addon?: any;
};

export default function HoldingsCharts(props: Props) {
  const [timelineSymbol, setTimelineSymbol] = useState<string>();

  // const getDrillDown = (): any => {
  //   return {
  //     activeAxisLabelStyle: {
  //       textDecoration: 'none',
  //     },
  //     activeDataLabelStyle: {
  //       textDecoration: 'none',
  //     },

  //     series: props.positions.map((position) => {
  //       return {
  //         type: 'column',
  //         id: getSymbol(position.security),
  //         name: getSymbol(position.security),
  //         data: position.transactions.map((transaction) => {
  //           const isBuySell = ['buy', 'sell'].includes(transaction.type);
  //           const type = _.startCase(transaction.type);
  //           return {
  //             name: moment(transaction.date).format('MMM D, Y'),
  //             y: transaction.amount,
  //             color: TYPE_TO_COLOR[transaction.type.toLowerCase()],
  //             displayValue: formatMoney(transaction.amount),
  //             type,
  //             price: isBuySell ? transaction.price : 'N/A',
  //             shares: isBuySell ? transaction.shares : 'N/A',
  //             label: isBuySell
  //               ? `${transaction.shares}@${transaction.price}`
  //               : `${type}@${formatMoney(transaction.amount)}`,
  //             transaction,
  //           };
  //         }),
  //         legend: {
  //           enabled: true,
  //           align: 'right',
  //           verticalAlign: 'top',
  //           layout: 'vertical',
  //           x: 0,
  //           y: 100,
  //         },

  //         tooltip: {
  //           useHTML: true,
  //           pointFormat: `<b>{point.label}</b>
  //           <br />Type: {point.type}`,
  //           valueDecimals: 1,
  //         },
  //         dataLabels: {
  //           enabled: !props.isPrivateMode,
  //           format: '{point.label}',
  //         },
  //         // showInLegend: true,
  //       };
  //     }),
  //   };
  // };

  const getPositionsSeries = (): {
    column: Highcharts.SeriesColumnOptions;
    pie: Highcharts.SeriesPieOptions;
  } => {
    const marketValue = props.positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);
    const data = props.positions
      .sort((a, b) => b.market_value - a.market_value)
      .map((position) => {
        const symbol = getSymbol(position.security);

        const accounts = (props.accounts || [])
          .map((account) => {
            const position = account.positions.filter((position) => position.symbol === symbol)[0];
            return position ? { name: account.name, type: account.type, quantity: position.quantity } : undefined;
          })
          .filter((value) => value)
          .sort((a, b) => b!.quantity - a!.quantity)
          .map((value) => `<tr><td>${value!.name} ${value!.type}</td><td align="right">${value!.quantity}</td></tr>`)
          .join('');

        return {
          name: getSymbol(position.security),
          // drilldown: getSymbol(position.security),
          y: position.market_value,
          displayValue: props.isPrivateMode ? '-' : formatCurrency(position.market_value, 1),
          marketValue: props.isPrivateMode ? '-' : formatMoney(position.market_value),
          percentage: position.market_value ? (position.market_value / marketValue) * 100 : 0,
          gain: position.gain_percent ? position.gain_percent * 100 : position.gain_percent,
          profit: props.isPrivateMode ? '-' : formatMoney(position.gain_amount),
          buyPrice: formatMoney(
            position.investments.reduce((cost, investment) => cost + investment.book_value, 0) / position.quantity,
          ),
          shares: position.quantity,
          lastPrice: formatMoney(position.security.last_price),
          currency: position.security.currency ? position.security.currency.toUpperCase() : position.security.currency,
          accountsTable: `<table><tr><th>Account</th><th align="right">Shares</th></tr>${accounts}</table>`,
        };
      });

    const events = {
      click: (event) => {
        if (event.point.name && timelineSymbol !== event.point.name) {
          setTimelineSymbol(event.point.name);
        }
      },
    };

    return {
      column: {
        type: 'column',
        name: 'Holdings',
        colorByPoint: true,
        data,
        events,

        tooltip: {
          pointFormat: `<b>CAD {point.marketValue}</b><br /><br />
          <table width="100%">
            <tr><td>Weightage</td><td align="right">{point.percentage:.1f}%</td></tr>
            <tr><td>Gain</td><td align="right">{point.gain:.1f}%</td></tr>
            <tr><td>Profit</td><td align="right">CAD {point.profit}</td></tr>
            <tr><td>Shares</td><td align="right">{point.shares}</td></tr>
            <tr><td>Currency</td><td align="right">{point.currency}</td></tr>
            <tr><td>Buy Price</td><td align="right">{point.buyPrice}</td></tr>
            <tr><td>Last Price</td><td align="right">{point.lastPrice}</td></tr>
          </table>
          <br />{point.accountsTable}
          `,
          valueDecimals: 1,
        },
        dataLabels: {
          enabled: !props.isPrivateMode,
          format: '{point.displayValue}',
        },
        showInLegend: false,
      },
      pie: {
        type: 'pie' as 'pie',
        name: 'Holdings',

        data: data.map((position) => ({ ...position, drilldown: undefined })),
        events,

        tooltip: {
          pointFormat: `<b>{point.percentage:.1f}%</b><br /><br />
          <table width="100%">
            <tr><td>Value</td><td align="right">CAD {point.marketValue}</td></tr>
            <tr><td>Gain</td><td align="right">{point.gain:.1f}%</td></tr>
            <tr><td>Profit</td><td align="right">CAD {point.profit}</td></tr>
            <tr><td>Shares</td><td align="right">{point.shares}</td></tr>
            <tr><td>Currency</td><td align="right">{point.currency}</td></tr>
            <tr><td>Buy Price</td><td align="right">{point.buyPrice}</td></tr>
            <tr><td>Last Price</td><td align="right">{point.lastPrice}</td></tr>
          </table>
          <br />{point.accountsTable}
          `,
        },
      },
    };
  };

  const getUSDCADDrillDown = (series: Highcharts.SeriesPieOptions): Highcharts.DrilldownOptions => {
    const getStockSeriesForCurrency = (currency: string) => {
      return {
        type: 'pie' as 'pie',
        id: `${currency} Stocks`,
        name: `${currency} Stocks`,

        data: (series.data || [])
          .filter((position: any) => position.currency === currency)
          .map((position: any) => ({ ...position, drilldown: undefined })),

        tooltip: {
          pointFormat: `<b>{point.percentage:.1f}%</b><br /><br />
          <table width="100%">
            <tr><td>Value</td><td align="right">CAD {point.marketValue}</td></tr>
            <tr><td>Gain</td><td align="right">{point.gain:.1f}%</td></tr>
            <tr><td>Profit</td><td align="right">CAD {point.profit}</td></tr>
            <tr><td>Shares</td><td align="right">{point.shares}</td></tr>
            <tr><td>Currency</td><td align="right">{point.currency}</td></tr>
            <tr><td>Buy Price</td><td align="right">{point.buyPrice}</td></tr>
            <tr><td>Last Price</td><td align="right">{point.lastPrice}</td></tr>
          </table>
          <br />{point.accountsTable}
          `,
        },
      };
    };

    const getCashSeriesForCurrency = (currency: string) => {
      const accounts = props.accounts
        .filter((account) => account.currency && account.currency.toUpperCase() === currency && account.cash)
        .sort((a, b) => b.cash - a.cash);

      return {
        type: 'pie' as 'pie',
        id: `${currency} Cash`,
        name: `${currency} Cash`,

        data: accounts.map((account) => ({
          name: `${account.name} ${account.type}`,
          y: account.cash,
          currency,
          displayValue: formatCurrency(account.cash, 1),
        })),
        tooltip: {
          pointFormat: `<b>{point.percentage:.1f}% -- {point.currency} {point.displayValue}</b>`,
        },
      };
    };

    return {
      activeAxisLabelStyle: {
        textDecoration: 'none',
      },
      activeDataLabelStyle: {
        textDecoration: 'none',
      },

      // drillUpButton: {
      //   position: {
      //     align: 'right',
      //     verticalAlign: 'middle',
      //   },
      // },

      series: [
        getStockSeriesForCurrency('CAD'),
        getStockSeriesForCurrency('USD'),
        getCashSeriesForCurrency('CAD'),
        getCashSeriesForCurrency('USD'),
      ],
    };
  };

  const getUSDCADSeries = (): Highcharts.SeriesPieOptions => {
    const cashByCurrency = props.accounts.reduce((hash, account) => {
      const data = hash[account.currency] || { type: 'Cash', currency: account.currency, value: 0 };
      data.value += account.cash;
      hash[account.currency] = data;
      return hash;
    }, {});
    const positionDataByCurrency = props.positions.reduce((hash, position) => {
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
    const totalValue = Number(
      Object.keys(positionDataByCurrency)
        .reduce(
          (sum, currency) => {
            return sum + positionDataByCurrency[currency].value;
          },
          Object.keys(cashByCurrency).reduce((sum, currency) => {
            return sum + cashByCurrency[currency].value;
          }, 0),
        )
        .toFixed(2),
    ).toLocaleString();

    return {
      type: 'pie' as 'pie',
      name: 'USD vs CAD',

      // center: ['80%', '30%'],
      // size: 150,
      data: Object.keys(positionDataByCurrency)
        .map((currency) => {
          const data = positionDataByCurrency[currency];
          const name = `${currency.toUpperCase()} Stocks`;
          return {
            name,
            drilldown: name,
            y: data.value,
            displayValue: props.isPrivateMode
              ? '-'
              : data.value
              ? Number(data.value.toFixed(2)).toLocaleString()
              : data.value,
            totalValue: props.isPrivateMode ? '-' : totalValue,

            additionalValue: `<tr><td>Gain ($) </td><td align="right">${
              props.isPrivateMode ? '-' : formatMoney(data.gain)
            }</td></tr>
            <tr><td>Gain (%)</td><td align="right">${((data.gain / data.value) * 100).toFixed(2)}</td></tr>
            `,
          } as Highcharts.SeriesPieDataOptions;
        })
        .concat(
          Object.keys(cashByCurrency).map((currency) => {
            const data = cashByCurrency[currency];
            const accountsTable = props.accounts
              .filter((account) => account.currency === currency && account.cash)
              .sort((a, b) => b.cash - a.cash)
              .map((account) => {
                return `
                  <tr>
                    <td>${account.name} ${account.type}</td>
                    <td align="right">$${
                      props.isPrivateMode
                        ? '-'
                        : account.cash
                        ? Number(account.cash.toFixed(2)).toLocaleString()
                        : account.cash
                    }</td>
                  </tr>`;
              })
              .join('');

            const name = `${currency.toUpperCase()} Cash`;
            return {
              name,
              drilldown: name,
              y: data.value,
              displayValue: props.isPrivateMode
                ? '-'
                : data.value
                ? Number(data.value.toFixed(2)).toLocaleString()
                : data.value,
              totalValue: props.isPrivateMode ? '-' : totalValue,

              additionalValue: accountsTable,
            };
          }),
        ),
      tooltip: {
        pointFormat: `<b>{point.percentage:.1f}%</b><br /><br />
        <table><tr><td>Value</td><td align="right">\${point.displayValue}</td></tr>
        <tr><td>Total Value</td><td align="right">\${point.totalValue}</td></tr>
        <tr><td colspan="2">======================</td></tr>
        {point.additionalValue}
        </table>`,
      },
    };
  };

  // const getGroupSeries = (): Highcharts.SeriesPieOptions => {
  //   const positionDataByGroup = props.accounts.reduce((hash, account) => {
  //     const group = account.group || 'N/A';
  //     const data = hash[group] || {
  //       group,
  //       value: 0,
  //       gain: 0,
  //     };
  //     data.value += account.value;
  //     data.gain += account.positions.reduce((sum, position) => sum + position.gain_amount || 0, 0);
  //     hash[group] = data;
  //     return hash;
  //   }, {} as { [K: string]: { group: string; value: number; gain: number } });

  //   const groups = Object.keys(positionDataByGroup)
  //     .map((group) => positionDataByGroup[group])
  //     .filter((group) => group.value)
  //     .sort((a, b) => b.value - a.value);
  //   const totalValue = Number(groups.reduce((sum, group) => sum + group.value, 0).toFixed(2)).toLocaleString();

  //   return {
  //     type: 'pie' as 'pie',
  //     name: 'Group Wise Positions',

  //     // center: ['80%', '30%'],
  //     // size: 150,
  //     data: groups.map((group) => {
  //       const accountsTable = props.accounts
  //         .filter((account) => (account.group || 'N/A') === group.group && account.value)
  //         .sort((a, b) => b.value - a.value)
  //         .map((account) => {
  //           return `
  //                 <tr>
  //                   <td>${account.name} ${account.group || account.type}</td>
  //                   <td align="right">$${props.isPrivateMode ? '-' : formatCurrency(account.value, 2)}</td>
  //                 </tr>`;
  //         })
  //         .join('');

  //       return {
  //         name: group.group,
  //         y: group.value,
  //         displayValue: props.isPrivateMode
  //           ? '-'
  //           : group.value
  //           ? Number(group.value.toFixed(2)).toLocaleString()
  //           : group.value,
  //         totalValue: props.isPrivateMode ? '-' : totalValue,

  //         additionalValue: `<tr><td>Gain ($) </td><td align="right">${
  //           props.isPrivateMode ? '-' : `$${formatMoney(group.gain)}`
  //         }</td></tr>
  //           <tr><td>Gain (%)</td><td align="right">${((group.gain / group.value) * 100).toFixed(2)}%</td></tr>
  //           <tr><td colspan="2" style="text-align: center;">======================</td></tr>
  //           ${accountsTable}`,
  //       } as Highcharts.SeriesPieDataOptions;
  //     }),
  //     tooltip: {
  //       pointFormat: `<b>{point.percentage:.1f}%</b><br /><br />
  //       <table><tr><td>Value</td><td align="right">\${point.displayValue}</td></tr>
  //       <tr><td>Total Value</td><td align="right">\${point.totalValue}</td></tr>

  //       {point.additionalValue}
  //       </table>`,
  //     },
  //   };
  // };

  const getOptions = ({
    title,
    yAxisTitle,
    subtitle,
    series,
    drilldown,
  }: {
    series: any;
    title?: string;
    subtitle?: string;
    yAxisTitle?: string;
    drilldown?: Highcharts.DrilldownOptions;
  }): Highcharts.Options => {
    return {
      series,
      drilldown: drilldown ? drilldown : {},

      tooltip: {
        outside: true,

        useHTML: true,
        backgroundColor: '#FFF',
        style: {
          color: '#1F2A33',
        },
      },

      title: {
        text: title,
      },
      subtitle: {
        text: subtitle,
        style: {
          color: '#1F2A33',
        },
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
          enabled: !props.isPrivateMode,
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

  const getPortfolioVisualizerLink = () => {
    const marketValue = props.positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);

    let remainingWeightage = 100;
    const params = getURLParams(
      props.positions.reduce((hash, position, index) => {
        // symbol1=QD&allocation1_1=1&
        // symbol2=TTD&allocation2_1=15
        let weightage = Number(((position.market_value / marketValue) * 100).toFixed(1));
        remainingWeightage -= weightage;
        remainingWeightage = Number(remainingWeightage.toFixed(1));
        if (index + 1 == props.positions.length) {
          weightage += remainingWeightage;
        }
        hash[`symbol${index + 1}`] = getSymbol(position.security);
        hash[`allocation${index + 1}_1`] = weightage;
        return hash;
      }, {}),
    );
    return `https://www.portfoliovisualizer.com/backtest-portfolio?s=y&timePeriod=4&initialAmount=10000&annualOperation=0&annualAdjustment=0&inflationAdjusted=true&annualPercentage=0.0&frequency=4&rebalanceType=1&showYield=false&reinvestDividends=true&${params}#analysisResults`;
  };

  const renderStockTimeline = () => {
    if (!timelineSymbol) {
      return <></>;
    }
    const position = props.positions.filter((position) => getSymbol(position.security) === timelineSymbol)[0];

    if (!position) {
      return <></>;
    }

    return (
      <StockTimeline
        isPrivateMode={props.isPrivateMode}
        symbol={timelineSymbol}
        position={position}
        addon={props.addon}
      />
    );
  };

  const renderStockSelector = () => {
    const options = props.positions
      .map((position) => getSymbol(position.security))
      .sort()
      .map((symbol, index) => (
        <Select.Option key={index} value={symbol}>
          {symbol}
        </Select.Option>
      ));

    return (
      <Flex p={3} pt={3} width={1} flexDirection="column">
        <Typography.Title style={{ textAlign: 'center' }} level={4}>
          Search for a stock in your protofolio:
        </Typography.Title>
        <Select
          showSearch
          value={timelineSymbol}
          placeholder="Enter a stock, e.g: FB, SHOP.TO"
          showArrow
          style={{ width: '100%' }}
          onChange={(symbol) => setTimelineSymbol(symbol)}
          filterOption={(inputValue, option) =>
            (option!.props!.value! as string).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
          }
        >
          {options}
        </Select>

        {timelineSymbol && (
          <StockDetails
            symbol={timelineSymbol}
            positions={props.positions}
            accounts={props.accounts}
            isPrivateMode={props.isPrivateMode}
          />
        )}
      </Flex>
    );
  };

  const { column, pie } = getPositionsSeries();

  return (
    <>
      <Collapsible trigger="Holdings Chart" open>
        <Charts
          options={getOptions({
            title: 'Your Holdings',
            yAxisTitle: 'Market Value ($)',
            subtitle: '(click on a stock to view transactions)',
            series: [column],
          })}
        />

        <Flex width={1} flexWrap="wrap" alignItems="stretch">
          <Flex width={[1, 1, 2 / 3]} height="100%" justifyContent="center">
            <Charts
              options={getOptions({
                subtitle: '(click on a stock to view timeline and transactions)',
                series: [pie],
              })}
            />
          </Flex>

          <Flex width={[1, 1, 1 / 3]} pr={4} height="100%" justifyContent="center">
            {renderStockSelector()}
          </Flex>
        </Flex>

        {renderStockTimeline()}

        <div className="center">
          <div
            className="button"
            onClick={() => {
              window.open(getPortfolioVisualizerLink(), '_blank');
            }}
          >
            Portfolio Visualizer
          </div>
        </div>
      </Collapsible>

      <Collapsible trigger="USD/CAD Composition" open>
        <Charts
          options={getOptions({
            title: 'USD/CAD Composition',
            series: [getUSDCADSeries()],
            drilldown: getUSDCADDrillDown(pie),
          })}
        />
      </Collapsible>

      {/* <Collapsible trigger="Group Composition" open>
        <Charts options={getOptions({ title: 'Group Composition', series: [getGroupSeries()] })} />
      </Collapsible> */}
    </>
  );
}
