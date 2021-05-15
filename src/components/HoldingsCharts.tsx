/* eslint-disable react-hooks/exhaustive-deps */
import Select from 'antd/es/select';
import Typography from 'antd/es/typography';
import Switch from 'antd/lib/switch';
import * as Highcharts from 'highcharts';
import _ from 'lodash';
import React, { useMemo, useState } from 'react';
import { Box, Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { Account, Position } from '../types';
import { formatCurrency, formatMoney, getCurrencyInCAD, getSymbol } from '../utils';
import Charts from './Charts';
import Collapsible from './Collapsible';
import CompositionGroup, { getGroupKey, GroupType } from './CompositionGroup';
import StockDetails from './StockDetails';
import StockTimeline from './StockTimeline';

type Props = {
  currencyCache: { [K: string]: number };
  positions: Position[];
  accounts: Account[];
  isPrivateMode: boolean;
  addon?: any;
};

const POSITION_TOOLTIP: Highcharts.TooltipOptions = {
  pointFormatter() {
    const point = this.options as any;
    return point.name !== 'Cash'
      ? `<table width="100%">
      <tr><td>Weightage</td><td class="position-tooltip-value">${(this as any).percentage.toFixed(1)}%</td></tr>
      <tr><td>Value</td><td class="position-tooltip-value">CAD ${point.value}</td></tr>
      <tr><td>Unrealized P/L %</td><td class="position-tooltip-value" style="color: ${point.pnlColor};">${
          point.gain ? point.gain.toFixed(1) : 'n/a'
        }%</td></tr>
      <tr><td>Unrealized P/L $</td><td class="position-tooltip-value" style="color: ${point.pnlColor};">CAD ${
          point.profit
        }</td></tr>
      <tr><td>Shares</td><td style="text-align: right;">${point.shares}</td></tr>
      <tr><td>Currency</td><td style="text-align: right;">${point.currency}</td></tr>
      <tr><td>Buy Price</td><td style="text-align: right;">${point.buyPrice}</td></tr>
      <tr><td>Last Price</td><td style="text-align: right;">${point.lastPrice}</td></tr>
      <tr><td colspan="2"><hr /></td></tr>
      <tr style="font-weight: 600"><td>Account</td><td style="text-align: right;">Shares</td></tr>
      ${point.accountsTable}
    </table>`
      : `
      <table width="100%">
        <tr><td>Weightage</td><td class="position-tooltip-value">${(this as any).percentage.toFixed(1)}%</td></tr>
        <tr><td>Value</td><td class="position-tooltip-value">CAD ${point.value}</td></tr>
        <tr><td colspan="2"><hr /></td></tr>
        <tr style="font-weight: 600"><td>Account</td><td style="text-align: right;">Cash</td></tr>
        ${point.accountsTable}
      </table>`;
  },
  headerFormat: '<b>{point.key}</b><hr />',
};

export default function HoldingsCharts(props: Props) {
  const [timelineSymbol, setTimelineSymbol] = useState<string>();
  const [compositionGroup, setCompositionGroup] = useState<GroupType>('currency');
  const [showHoldings, setShowHoldings] = useState(true);
  const currencyCacheKeys = Object.keys(props.currencyCache);
  const lastCurrencyDate = currencyCacheKeys[currencyCacheKeys.length - 1];
  const colors = Highcharts.getOptions().colors;

  function getColor(index) {
    return colors ? colors[index % colors?.length] : undefined;
  }

  const getPositionsSeries = (): {
    column: Highcharts.SeriesColumnOptions;
    pie: Highcharts.SeriesPieOptions;
  } => {
    const totalValue = props.positions.reduce((sum, position) => sum + position.market_value, 0);
    const data = props.positions
      .sort((a, b) => b.value - a.value)
      .map((position) => {
        const symbol = getSymbol(position.security);

        const accountsTable = (props.accounts || [])
          .map((account) => {
            const position = account.positions.filter((position) => position.symbol === symbol)[0];
            return position ? { name: account.name, quantity: position.quantity } : undefined;
          })
          .filter((value) => value)
          .sort((a, b) => b!.quantity - a!.quantity)
          .map((value) => `<tr><td>${value!.name}</td><td style="text-align: right;">${value!.quantity}</td></tr>`)
          .join('');

        return {
          name: getSymbol(position.security),
          y: position.value,
          displayValue: props.isPrivateMode ? '-' : formatCurrency(position.value, 1),
          value: props.isPrivateMode ? '-' : formatMoney(position.value),
          gain: position.gain_percent ? position.gain_percent * 100 : position.gain_percent,
          profit: props.isPrivateMode ? '-' : formatMoney(position.gain_amount),
          percentage: (position.market_value / totalValue) * 100,
          buyPrice: formatMoney(
            position.investments.reduce((cost, investment) => cost + investment.book_value, 0) / position.quantity,
          ),
          shares: position.quantity,
          lastPrice: formatMoney(position.security.last_price),
          currency: position.security.currency ? position.security.currency.toUpperCase() : position.security.currency,
          accountsTable,
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
        data: data as any,
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

        data: data.map((position) => ({ ...position, drilldown: undefined })) as any,
        events,

        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %',
          style: {
            color: 'black',
          },
        },

        tooltip: POSITION_TOOLTIP,
      },
    };
  };

  const getAccountsCompositionHoldingsDrilldown = (
    group: GroupType,
    drilldown: boolean,
  ): Highcharts.SeriesPieOptions | Highcharts.DrilldownOptions => {
    const accountsByName = props.accounts.reduce(
      (hash, account) => {
        const name = getGroupKey(group, account);
        let mergedAccount = hash[name];
        if (!mergedAccount) {
          mergedAccount = { name, value: 0, positions: {}, accounts: [] };
          hash[name] = mergedAccount;
        }
        mergedAccount.value += account.positions.reduce((sum, position) => sum + position.value, 0);

        account.positions.forEach((position) => {
          const symbol = getSymbol(position.security);
          const existingPosition = mergedAccount.positions[symbol];
          if (!existingPosition) {
            mergedAccount.positions[symbol] = position;
          } else {
            const value = existingPosition.value + position.value;
            const gain_amount = existingPosition.gain_amount + position.gain_amount;
            mergedAccount.positions[symbol] = {
              ...existingPosition,
              value,
              book_value: existingPosition.book_value + position.book_value,
              market_value: existingPosition.market_value + position.market_value,
              quantity: existingPosition.quantity + position.quantity,
              gain_currency_amount: existingPosition.gain_currency_amount + position.gain_currency_amount,
              gain_amount,
              gain_percent: gain_amount / (value - gain_amount),
            };
          }
        });

        mergedAccount.accounts.push(account);

        return hash;
      },
      {} as {
        [K: string]: {
          name: string;
          value: number;
          positions: { [K: string]: Position };
          accounts: Account[];
        };
      },
    );

    const getDataForAccount = (name: string, index: number) => {
      const account = accountsByName[name];
      const positions = Object.values(account.positions);
      const numPositions = positions.length;

      const data = positions
        .sort((a, b) => b.value - a.value)
        .map((position, idx) => {
          const symbol = getSymbol(position.security);
          const accountsTable = account.accounts
            .map((account) => {
              const position = account.positions.filter((position) => position.symbol === symbol)[0];
              return position ? { name: account.name, quantity: position.quantity } : undefined;
            })
            .filter((value) => value)
            .sort((a, b) => b!.quantity - a!.quantity)
            .map((value) => `<tr><td>${value!.name}</td><td style="text-align: right;">${value!.quantity}</td></tr>`)
            .join('');

          const brightness = 0.2 - idx / numPositions / 5;
          const color = getColor(index);

          return {
            color: color && showHoldings ? Highcharts.color(color).brighten(brightness).get() : undefined,
            name: symbol,
            y: position.value,
            displayValue: props.isPrivateMode ? '-' : formatCurrency(position.value, 1),
            value: props.isPrivateMode ? '-' : formatMoney(position.value),
            gain: position.gain_percent ? position.gain_percent * 100 : position.gain_percent,
            profit: props.isPrivateMode ? '-' : formatMoney(position.gain_amount),
            buyPrice: formatMoney(position.book_value / position.quantity),
            shares: position.quantity,
            lastPrice: formatMoney(position.security.last_price),
            currency: position.security.currency
              ? position.security.currency.toUpperCase()
              : position.security.currency,
            pnlColor: position.gain_amount >= 0 ? 'green' : 'red',
            accountsTable,
          };
        }) as any;

      return drilldown
        ? {
            type: 'pie' as 'pie',
            id: name,
            name,
            data,
            tooltip: POSITION_TOOLTIP,
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>: {point.percentage:.1f} %',
              style: {
                color: 'black',
              },
            },
          }
        : data;
    };

    return drilldown
      ? {
          activeAxisLabelStyle: {
            textDecoration: 'none',
          },
          activeDataLabelStyle: {
            textDecoration: 'none',
          },

          series: Object.keys(accountsByName).map(
            (name, index) => getDataForAccount(name, index) as Highcharts.SeriesPieOptions,
          ),
        }
      : {
          type: 'pie' as 'pie',
          id: 'holdings',
          name: 'Holdings',
          size: '80%',
          innerSize: '60%',
          dataLabels: {
            formatter() {
              const point = this.point;
              return this.percentage && this.percentage > 2.5 ? `${point.name}: ${this.percentage.toFixed(1)}%` : null;
            },
          },
          data: Object.keys(accountsByName)
            .sort((a, b) => accountsByName[b].value - accountsByName[a].value)
            .reduce((array, name, index) => {
              array.push(...(getDataForAccount(name, index) as any));
              return array;
            }, [] as any[]),
          tooltip: POSITION_TOOLTIP,
        };
  };

  const getAccountsCompositionSeries = (group: GroupType): Highcharts.SeriesPieOptions[] => {
    const totalValue = props.accounts.reduce((value, account) => value + account.value, 0);
    const data = Object.values(
      props.accounts.reduce(
        (hash, account) => {
          const name = getGroupKey(group, account);
          let mergedAccount = hash[name];
          if (!mergedAccount) {
            mergedAccount = { name, value: 0, gainAmount: 0, accounts: {} };
            hash[name] = mergedAccount;
          }
          mergedAccount.value += account.positions.reduce((value, position) => value + position.value || 0, 0);
          mergedAccount.gainAmount += account.positions.reduce((value, position) => value + position.gain_amount, 0);

          const _name = account.name;
          let _account = mergedAccount.accounts[_name];
          if (!_account) {
            _account = { name: _name, cad: 0, usd: 0, value: 0 };
            mergedAccount.accounts[_name] = _account;
          }
          const cash = account.cash ? Number(account.cash.toFixed(2)) : 0;
          _account.cad = _account.cad + (account.currency === 'cad' ? cash : 0);
          _account.usd = _account.usd + (account.currency === 'usd' ? cash : 0);

          return hash;
        },
        {} as {
          [K: string]: {
            name: string;
            value: number;
            gainAmount: number;
            accounts: { [K: string]: { name: string; cad: number; usd: number; value: number } };
          };
        },
      ),
    );

    const accountsSeries: Highcharts.SeriesPieOptions = {
      type: 'pie' as 'pie',
      id: 'accounts',
      name: 'Accounts',
      size: showHoldings ? '60%' : '100%',
      data: data
        .filter((account) => account.value)
        .sort((a, b) => b.value - a.value)
        .map((account, index) => {
          const accounts = Object.values(account.accounts);
          const cad = accounts.reduce((sum, account) => sum + account.cad, 0);
          const usd = accounts.reduce((sum, account) => sum + account.usd, 0);
          const cashTable = accounts
            .filter((account) => !!account.cad || !!account.usd)
            .sort((a, b) => b.usd + b.cad - (a.usd + a.cad))
            .map(
              (account) =>
                `<tr>
                <td style="vertical-align: top">${account.name}</td>
                <td style="text-align: right;">
                ${
                  !!account.cad
                    ? `<div style="color:${account.cad < 0 ? 'red' : ''}">C$ ${formatMoney(account.cad)}</div>`
                    : ''
                }
                ${
                  !!account.usd
                    ? `<span style="color:${account.usd < 0 ? 'red' : ''}">U$ ${formatMoney(account.usd)}</span>`
                    : ''
                }
                </td>
              </tr>`,
            )
            .join('');

          return {
            color: getColor(index),
            name: account.name,
            drilldown: showHoldings ? undefined : account.name,
            y: account.value,
            displayValue: props.isPrivateMode ? '-' : account.value ? formatMoney(account.value) : account.value,
            totalValue: props.isPrivateMode ? '-' : formatMoney(totalValue),
            gain: props.isPrivateMode ? '-' : `CAD ${formatMoney(account.gainAmount)}`,
            gainRatio: `${((account.gainAmount / (account.value - account.gainAmount)) * 100).toFixed(2)}%`,
            pnlColor: account.gainAmount >= 0 ? 'green' : 'red',
            cash: cad + (usd ? getCurrencyInCAD(lastCurrencyDate, usd, props.currencyCache) : 0),
            cad,
            usd,
            cashTable,
          };
        }),
      dataLabels: {
        formatter() {
          return this.percentage && this.percentage > (showHoldings ? 2 : 0)
            ? `${this.point.name}: ${this.percentage.toFixed(1)}%`
            : null;
        },
        style: showHoldings
          ? {
              color: 'purple',
              fontSize: '12px',
              fontWeight: '600',
            }
          : {},
        distance: showHoldings ? 150 : 50,
      },
      tooltip: {
        headerFormat: `<b>{point.key}<br />{point.percentage:.1f}%</b><hr />`,
        pointFormatter() {
          const point = this.options as any;
          return `<table>
          <tr><td>Value</td><td style="text-align: right;" class="position-tooltip-value">CAD ${
            point.displayValue
          }</td></tr>
          <tr><td>Total Value</td><td style="text-align: right;" class="position-tooltip-value">CAD ${
            point.totalValue
          }</td></tr>
          <tr><td>Unrealized P/L ($) </td><td style="text-align: right;" style="color:${
            point.pnlColor
          };" class="position-tooltip-value">${point.gain}</td></tr>
          <tr><td>Unrealized P/L (%)</td><td style="text-align: right;" style="color:${
            point.pnlColor
          };" class="position-tooltip-value">${point.gainRatio}</td></tr>
          ${
            point.cashTable
              ? `<tr><td colspan="2"><hr /></td></tr>
              <tr><td style="font-weight: 600">Account</td><td style="text-align: right;" style="font-weight: 600">Cash</td></tr>${point.cashTable}`
              : ''
          }
          <tr><td colspan="2"><hr /></td></tr>
          ${
            !!point.cash && !props.isPrivateMode
              ? `<tr><td>Total Cash</td><td style="text-align: right;" class="position-tooltip-cash" style="color:${
                  point.cash < 0 ? 'red' : ''
                };">CAD ${formatMoney(point.cash)}</td></tr>`
              : ''
          }
          ${
            !!point.cad && !props.isPrivateMode
              ? `<tr><td>CAD Cash</td><td style="text-align: right;" class="position-tooltip-cash" style="color:${
                  point.cad < 0 ? 'red' : ''
                };">CAD ${formatMoney(point.cad)}</td></tr>`
              : ''
          }
          ${
            !!point.usd && !props.isPrivateMode
              ? `<tr><td>USD Cash</td><td style="text-align: right;" class="position-tooltip-cash" style="color:${
                  point.usd < 0 ? 'red' : ''
                };">USD ${formatMoney(point.usd)}</td></tr>`
              : ''
          }
        </table>`;
        },
      },
    };

    return showHoldings
      ? [accountsSeries, getAccountsCompositionHoldingsDrilldown(group, false) as Highcharts.SeriesPieOptions]
      : [accountsSeries];
  };

  function getCompositionGroupSeriesOptions(group: GroupType): {
    series: Highcharts.SeriesPieOptions[];
    drilldown?: Highcharts.DrilldownOptions;
    title: string;
  } {
    const series = getAccountsCompositionSeries(group);
    const drilldown = showHoldings ? undefined : getAccountsCompositionHoldingsDrilldown(group, true);
    const title = group === 'currency' ? 'USD vs CAD' : group === 'type' ? 'Account Type' : `${_.startCase(group)}`;

    return { series, drilldown, title: `${title} Composition` };
  }

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
        currencyCache={props.currencyCache}
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
    const { series, drilldown, title } = getCompositionGroupSeriesOptions(compositionGroup);
    return getOptions({
      title,
      subtitle: showHoldings ? undefined : '(click on the category name to drill into the holdings.)',
      series,
      drilldown,
    });
  }, [props.isPrivateMode, props.accounts, props.positions, pie, compositionGroup, showHoldings]);

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
        <Charts key={compositionGroup} options={compositionGroupOptions} />
        <CompositionGroup
          changeGroup={setCompositionGroup}
          group={compositionGroup}
          tracker="holdings-composition-group"
        />

        <Flex mt={3} mb={2} width={1} justifyContent="center" alignItems="center" alignContent="center">
          <Switch
            checked={showHoldings}
            onChange={(checked) => {
              setShowHoldings(checked);
              trackEvent('composition-group-show-holdings', { checked });
            }}
          />
          <Box px={1} />
          <Typography.Text strong style={{ fontSize: 16 }}>
            Show Holdings (Donut Chart)
          </Typography.Text>
        </Flex>
      </Collapsible>
    </>
  );
}
