/* eslint-disable react-hooks/exhaustive-deps */
import Typography from 'antd/es/typography';
import Empty from 'antd/lib/empty';
import Switch from 'antd/lib/switch';
import React, { useMemo, useState } from 'react';
import { Box, Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { Position } from '../types';
import { formatMoney, getSymbol } from '../utils';
import Charts from './Charts';
import StockPnLTimeline from './StockPnLTimeline';

export function TopGainersLosers(props: { isPrivateMode: boolean; positions: Position[]; addon: any }) {
  const [sortByValue, setSortByValue] = useState(false);
  const [pnlSymbol, setPnlSymbol] = useState<string>();

  function getTopGainersLosers(gainers: boolean) {
    return [
      {
        name: gainers ? 'Top Gainers' : 'Top Losers',
        type: 'column',
        events: {
          click(event) {
            if (event.point.name && pnlSymbol !== event.point.name) {
              setPnlSymbol(event.point.name);
            }
          },
        },
        colorByPoint: true,
        data: props.positions
          .filter((position) => (gainers ? position.gain_percent > 0 : position.gain_percent <= 0))
          .sort((a, b) => (sortByValue ? a.gain_amount - b.gain_amount : a.gain_percent - b.gain_percent))
          .map((position) => {
            return {
              name: getSymbol(position.security),
              y: sortByValue ? position.gain_amount : position.gain_percent * 100,
              gainRatio: position.gain_percent * 100,
              gain: props.isPrivateMode ? '-' : formatMoney(position.gain_amount),
            };
          }),
        tooltip: {
          headerFormat: '',
          pointFormat: `<table>
            <tr><th colspan="2" style="text-align:center">{point.name}</th></tr>
            <tr>
              <td>P&L %</td>
              <td align="right"><b>{point.gainRatio:.1f}%</b></td>
            </tr>
            <tr>
              <td>P&L $</td>
              <td align="right" style="padding-left: 16px;"><b>{point.gain} CAD</b></td>
            </tr>
          </table>`,
        },
        dataLabels: {
          enabled: true,
          format: sortByValue ? '{point.y:.1f}' : '{point.y:.1f}%',
        },
        showInLegend: false,
      },
    ];
  }

  function getOptions({
    title,
    yAxisTitle,
    subtitle,
    series,
  }: {
    series: any;
    title?: string;
    subtitle?: string;
    yAxisTitle?: string;
  }): Highcharts.Options {
    return {
      series,

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
          enabled: sortByValue ? true : !props.isPrivateMode,
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
              yAxis: {
                labels: {
                  enabled: false,
                },
              },
              subtitle: {
                text: undefined,
              },
              navigator: {
                enabled: false,
              },
            },
          },
        ],
      },
    };
  }

  const { gainers, losers } = useMemo(() => {
    return {
      gainers: getTopGainersLosers(true),
      losers: getTopGainersLosers(false),
    };
  }, [sortByValue, props.isPrivateMode, props.positions]);

  const renderStockPnLTimeline = () => {
    if (!pnlSymbol) {
      return <></>;
    }
    const position = props.positions.filter((position) => getSymbol(position.security) === pnlSymbol)[0];

    if (!position) {
      return <></>;
    }

    return (
      <StockPnLTimeline
        isPrivateMode={props.isPrivateMode}
        symbol={pnlSymbol}
        position={position}
        addon={props.addon}
      />
    );
  };

  return !!props.positions.length ? (
    <>
      <Flex
        mb={3}
        mt={2}
        width={1}
        justifyContent="center"
        alignContent="center"
        justifyItems="center"
        alignItems="center"
      >
        <Switch
          checked={sortByValue}
          onChange={(checked) => {
            setSortByValue(checked);
            trackEvent('gainers-show-by-pnl-value', { checked });
          }}
        />
        <Box px={1} />
        <Typography.Text strong mark={sortByValue} style={{ fontSize: 17 }}>
          Show By P&amp;L Value ($)
        </Typography.Text>
      </Flex>

      {!!gainers[0].data.length && (
        <Charts
          options={getOptions({
            title: 'Top Gainers',
            subtitle: '(click on a stock to view the P/L timeline)',
            yAxisTitle: `Gain (${sortByValue ? '%' : '$'})`,
            series: gainers,
          })}
        />
      )}

      {renderStockPnLTimeline()}

      {!!losers[0].data.length && (
        <Charts
          options={getOptions({
            title: 'Top Losers',
            subtitle: '(click on a stock to view the P/L timeline)',
            yAxisTitle: `Loss (${sortByValue ? '%' : '$'})`,
            series: losers,
          })}
        />
      )}
    </>
  ) : (
    <Empty description="No Holdings" />
  );
}
