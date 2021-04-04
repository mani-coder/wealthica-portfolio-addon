/* eslint-disable react-hooks/exhaustive-deps */
import Select from 'antd/es/select';
import Typography from 'antd/es/typography';
import Radio from 'antd/lib/radio';
import * as Highcharts from 'highcharts';
import React, { useMemo, useState } from 'react';
import { Flex } from 'rebass';
import { Account, Position } from '../types';
import { formatCurrency, formatMoney, getCurrencyInCAD, getSymbol } from '../utils';
import Charts from './Charts';
import Collapsible from './Collapsible';
import StockDetails from './StockDetails';
import StockTimeline from './StockTimeline';

type Props = {
  currencyCache: { [K: string]: number };
  positions: Position[];
  accounts: Account[];
  isPrivateMode: boolean;
  addon?: any;
};

const POSITION_TOOLTIP: Highcharts.PlotPieTooltipOptions = {
  headerFormat: '<b>{point.key}</b><hr />',
  pointFormat: `<table width="100%">
    <tr><td>Weightage</td><td align="right" class="position-tooltip-value">{point.percentage:.1f}%</td></tr>
    <tr><td>Value</td><td align="right" class="position-tooltip-value">CAD {point.value}</td></tr>
    <tr><td>Unrealized P/L %</td><td align="right" class="position-tooltip-value" style="color: {point.pnlColor};">{point.gain:.1f}%</td></tr>
    <tr><td>Unrealized P/L $</td><td align="right" class="position-tooltip-value" style="color: {point.pnlColor};">CAD {point.profit}</td></tr>
    <tr><td>Shares</td><td align="right">{point.shares}</td></tr>
    <tr><td>Currency</td><td align="right">{point.currency}</td></tr>
    <tr><td>Buy Price</td><td align="right">{point.buyPrice}</td></tr>
    <tr><td>Last Price</td><td align="right">{point.lastPrice}</td></tr>
    <tr><td colspan="2"><hr /></td></tr>
    {point.accountsTable}
  </table>
  `,
  valueDecimals: 2,
};

const COMPOSITION_TOOLTIP = {
  headerFormat: `<b>{point.key}<br />{point.percentage:.1f}%</b><hr />`,
  pointFormat: `<table>
    <tr><td>Value</td><td align="right" class="position-tooltip-value">CAD {point.displayValue}</td></tr>
    <tr><td>Total Value</td><td align="right" class="position-tooltip-value">CAD {point.totalValue}</td></tr>
    <tr><td>Unrealized P/L ($) </td><td align="right" style="color:{point.pnlColor};" class="position-tooltip-value">CAD {point.gain}</td></tr>
    <tr><td>Unrealized P/L (%)</td><td align="right" style="color:{point.pnlColor};" class="position-tooltip-value">{point.gainRatio:.2f}%</td></tr>
    {point.additionalValue}
  </table>`,
};

export default function HoldingsCharts(props: Props) {
  const [timelineSymbol, setTimelineSymbol] = useState<string>();
  const [compositionGroup, setCompositionGroup] = useState<string>('currency');
  const currencyCacheKeys = Object.keys(props.currencyCache);
  const lastCurrencyDate = currencyCacheKeys[currencyCacheKeys.length - 1];

  const getPositionsSeries = (): {
    column: Highcharts.SeriesColumnOptions;
    pie: Highcharts.SeriesPieOptions;
  } => {
    const marketValue = props.positions.reduce((sum, position) => {
      return sum + position.value;
    }, 0);
    const data = props.positions
      .sort((a, b) => b.value - a.value)
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
          y: position.value,
          displayValue: props.isPrivateMode ? '-' : formatCurrency(position.value, 1),
          value: props.isPrivateMode ? '-' : formatMoney(position.value),
          percentage: position.value ? (position.value / marketValue) * 100 : 0,
          gain: position.gain_percent ? position.gain_percent * 100 : position.gain_percent,
          profit: props.isPrivateMode ? '-' : formatMoney(position.gain_amount),
          buyPrice: formatMoney(
            position.investments.reduce((cost, investment) => cost + investment.book_value, 0) / position.quantity,
          ),
          shares: position.quantity,
          lastPrice: formatMoney(position.security.last_price),
          currency: position.security.currency ? position.security.currency.toUpperCase() : position.security.currency,
          accountsTable: `<tr style="font-weight: 600"><td>Account</td><td align="right">Shares</td></tr>${accounts}`,
          pnlColor: position.gain_amount > 0 ? 'green' : 'red',
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

        tooltip: POSITION_TOOLTIP,
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

        tooltip: POSITION_TOOLTIP,
      },
    };
  };

  const getCurrencyCompositionDrillDown = (series: Highcharts.SeriesPieOptions): Highcharts.DrilldownOptions => {
    const getStockSeriesForCurrency = (currency: string) => {
      return {
        type: 'pie' as 'pie',
        id: `${currency} Stocks`,
        name: `${currency} Stocks`,

        data: (series.data || [])
          .filter((position: any) => position.currency === currency)
          .map((position: any) => ({ ...position, drilldown: undefined })),

        tooltip: POSITION_TOOLTIP,
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

      series: [
        getStockSeriesForCurrency('CAD'),
        getStockSeriesForCurrency('USD'),
        getCashSeriesForCurrency('CAD'),
        getCashSeriesForCurrency('USD'),
      ],
    };
  };

  const getCurrencyCompositionSeries = (): Highcharts.SeriesPieOptions => {
    const cashByCurrency = props.accounts.reduce((hash, account) => {
      const data = hash[account.currency] || { type: 'Cash', currency: account.currency, value: 0 };
      data.value += getCurrencyInCAD(lastCurrencyDate, account.cash, props.currencyCache);
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
      data.value += position.value;
      data.gain += position.gain_amount;
      hash[position.security.currency] = data;
      return hash;
    }, {});

    const totalValue = formatMoney(
      Object.keys(positionDataByCurrency).reduce(
        (sum, currency) => {
          return sum + positionDataByCurrency[currency].value;
        },
        Object.keys(cashByCurrency).reduce((sum, currency) => {
          return sum + cashByCurrency[currency].value;
        }, 0),
      ),
      2,
    );

    return {
      type: 'pie' as 'pie',
      name: 'USD vs CAD',

      data: Object.keys(positionDataByCurrency)
        .map((currency) => {
          const data = positionDataByCurrency[currency];
          const name = `${currency.toUpperCase()} Stocks`;
          return {
            name,
            drilldown: name,
            y: data.value,
            negative: false,
            displayValue: props.isPrivateMode ? '-' : data.value ? formatMoney(data.value) : data.value,
            totalValue: props.isPrivateMode ? '-' : totalValue,

            gain: props.isPrivateMode ? '-' : formatMoney(data.gain),
            gainRatio: (data.gain / (data.value - data.gain)) * 100,
            pnlColor: data.gain >= 0 ? 'green' : 'red',
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
                  <tr><td>${account.name} ${account.type}</td><td align="right">${currency.toUpperCase()} ${
                  props.isPrivateMode ? '-' : account.cash ? formatMoney(account.cash) : account.cash
                }</td></tr>`;
              })
              .join('');

            const name = `${currency.toUpperCase()} Cash`;
            return {
              name,
              drilldown: name,
              y: Math.abs(data.value),
              negative: data.value < 0,
              displayValue: props.isPrivateMode ? '-' : data.value ? formatMoney(data.value) : data.value,
              totalValue: props.isPrivateMode ? '-' : totalValue,
              currency: currency.toUpperCase(),
              additionalValue: `<tr><td colspan="2"><hr /></td></tr>${accountsTable}`,
            };
          }),
        ),
      dataLabels: {
        formatter() {
          return (this.point as any).negative && this.y ? -1 * this.y : this.y;
        },
      },
      tooltip: COMPOSITION_TOOLTIP,
    };
  };

  const getAccountsCompositionDrillDown = (groupByType?: boolean): Highcharts.DrilldownOptions => {
    const accountsByName = props.accounts.reduce((hash, account) => {
      const name = groupByType ? account.type : `${account.name} ${account.type}`;
      let mergedAccount = hash[name];
      if (!mergedAccount) {
        mergedAccount = { name, cash: 0, value: 0, positions: [] };
        hash[name] = mergedAccount;
      }
      mergedAccount.value += account.value;
      mergedAccount.cash +=
        account.currency === 'usd'
          ? getCurrencyInCAD(lastCurrencyDate, account.cash, props.currencyCache)
          : account.cash;
      mergedAccount.positions.push(...account.positions);
      return hash;
    }, {} as { [K: string]: { name: string; value: number; positions: Position[]; cash: number } });

    const getSeriesForAccount = (name: string) => {
      const account = accountsByName[name];
      const data = account.positions
        .sort((a, b) => b.value - a.value)
        .map((position) => {
          return {
            name: getSymbol(position.security),
            y: position.value,
            displayValue: props.isPrivateMode ? '-' : formatCurrency(position.value, 1),
            value: props.isPrivateMode ? '-' : formatMoney(position.value),
            percentage: position.value ? (position.value / account.value) * 100 : 0,
            gain: position.gain_percent ? position.gain_percent * 100 : position.gain_percent,
            profit: props.isPrivateMode ? '-' : formatMoney(position.gain_amount),
            buyPrice: formatMoney(position.book_value / position.quantity),
            shares: position.quantity,
            lastPrice: formatMoney(position.security.last_price),
            currency: position.security.currency
              ? position.security.currency.toUpperCase()
              : position.security.currency,
            pnlColor: position.gain_amount >= 0 ? 'green' : 'red',
          };
        });

      if (account.cash) {
        data.push({
          name: 'Cash',
          y: account.cash,
          displayValue: props.isPrivateMode ? '-' : formatCurrency(account.cash, 1),
          value: props.isPrivateMode ? '-' : formatMoney(account.cash),
          percentage: (account.cash / account.value) * 100,
          gain: 'N/A',
          profit: 'N/A',
        } as any);
      }

      return {
        type: 'pie' as 'pie',
        id: name,
        name,
        data,
        tooltip: POSITION_TOOLTIP,
      };
    };

    return {
      activeAxisLabelStyle: {
        textDecoration: 'none',
      },
      activeDataLabelStyle: {
        textDecoration: 'none',
      },

      series: Object.keys(accountsByName).map((name) => getSeriesForAccount(name)),
    };
  };

  const getAccountsCompositionSeries = (groupByType?: boolean): Highcharts.SeriesPieOptions => {
    const totalValue = props.accounts.reduce((value, account) => value + account.value, 0);
    const data = Object.values(
      props.accounts.reduce((hash, account) => {
        const name = groupByType ? account.type : `${account.name} ${account.type}`;
        let mergedAccount = hash[name];
        if (!mergedAccount) {
          mergedAccount = { name, value: 0, holdingsValue: 0, gainAmount: 0 };
          hash[name] = mergedAccount;
        }
        mergedAccount.value += account.value;
        mergedAccount.holdingsValue += account.positions.reduce((value, position) => value + position.value || 0, 0);
        mergedAccount.gainAmount += account.positions.reduce((value, position) => value + position.gain_amount, 0);
        return hash;
      }, {} as { [K: string]: { name: string; value: number; holdingsValue: number; gainAmount: number } }),
    );

    return {
      type: 'pie' as 'pie',
      name: 'Accounts',
      data: data
        .filter((account) => account.value)
        .sort((a, b) => b.value - a.value)
        .map((account) => {
          return {
            name: account.name,
            drilldown: account.name,
            y: account.value,
            negative: account.value < 0,
            displayValue: props.isPrivateMode ? '-' : account.value ? formatMoney(account.value) : account.value,
            totalValue: props.isPrivateMode ? '-' : formatMoney(totalValue),
            gain: props.isPrivateMode ? '-' : formatMoney(account.gainAmount),
            gainRatio: (account.gainAmount / (account.holdingsValue - account.gainAmount)) * 100,
            pnlColor: account.gainAmount >= 0 ? 'green' : 'red',
          } as Highcharts.SeriesPieDataOptions;
        }),
      dataLabels: {
        formatter() {
          return (this.point as any).negative && this.y ? -1 * this.y : this.y;
        },
      },
      tooltip: COMPOSITION_TOOLTIP,
    };
  };

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

  const { column, pie } = useMemo(() => {
    return getPositionsSeries();
  }, [props.accounts, props.positions, props.isPrivateMode]);

  const columnChartOptions = useMemo(
    () =>
      getOptions({
        title: 'Your Holdings',
        yAxisTitle: 'Market Value ($)',
        subtitle: '(click on a stock to view transactions)',
        series: [column],
      }),
    [column],
  );
  const pieChartOptions = useMemo(
    () =>
      getOptions({
        subtitle: '(click on a stock to view timeline and transactions)',
        series: [pie],
      }),
    [pie],
  );

  const compositionGroupOptions = useMemo(() => {
    return {
      currency: getOptions({
        title: 'USD/CAD Composition',
        series: [getCurrencyCompositionSeries()],
        drilldown: getCurrencyCompositionDrillDown(pie),
      }),
      accounts: getOptions({
        title: 'Accounts Composition',
        series: [getAccountsCompositionSeries()],
        drilldown: getAccountsCompositionDrillDown(),
      }),
      type: getOptions({
        title: 'Account Type Composition',
        series: [getAccountsCompositionSeries(true)],
        drilldown: getAccountsCompositionDrillDown(true),
      }),
    };
  }, [props.isPrivateMode, props.accounts, props.positions, pie]);

  return (
    <>
      <Charts options={columnChartOptions} />

      <Flex width={1} flexWrap="wrap" alignItems="stretch">
        <Flex width={[1, 1, 2 / 3]} height="100%" justifyContent="center">
          <Charts options={pieChartOptions} />
        </Flex>

        <Flex width={[1, 1, 1 / 3]} pr={4} height="100%" justifyContent="center">
          {renderStockSelector()}
        </Flex>
      </Flex>

      {renderStockTimeline()}

      <Collapsible title="Holdings Composition">
        <Charts key={compositionGroup} options={compositionGroupOptions[compositionGroup]} />
        <Flex width={1} justifyContent="center" py={2} mb={2}>
          <Radio.Group
            size="large"
            optionType="button"
            buttonStyle="solid"
            defaultValue={compositionGroup}
            onChange={(e) => setCompositionGroup(e.target.value)}
            options={[
              { label: 'Group By Currency', value: 'currency' },
              { label: 'Group By Accounts', value: 'accounts' },
              { label: 'Group By Type', value: 'type' },
            ]}
          />
        </Flex>
      </Collapsible>
    </>
  );
}
