import { Switch } from 'antd';
import Typography from 'antd/es/typography';
import React, { useState } from 'react';
import Collapsible from 'react-collapsible';
import { Box, Flex } from 'rebass';
import { Position } from '../types';
import { formatMoney, getSymbol } from '../utils';
import Charts from './Charts';

export function TopGainersLosers(props: { isPrivateMode: boolean; positions: Position[] }) {
  const [sortByValue, setSortByValue] = useState(false);

  function getTopGainersLosers(gainers: boolean) {
    return [
      {
        name: gainers ? 'Top Gainers' : 'Top Losers',
        type: 'column',
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
  }

  const gainers = getTopGainersLosers(true);
  const losers = getTopGainersLosers(false);
  return (
    <Collapsible trigger="Top Losers/Gainers Chart" open>
      <Flex
        mb={3}
        mt={2}
        width={1}
        justifyContent="center"
        alignContent="center"
        justifyItems="center"
        alignItems="center"
      >
        <Switch checked={sortByValue} onChange={(checked) => setSortByValue(checked)} />
        <Box px={1} />
        <Typography.Text strong mark={sortByValue} style={{ fontSize: 17 }}>
          Show By P&amp;L Value ($)
        </Typography.Text>
      </Flex>

      {!!gainers[0].data.length && (
        <Charts
          options={getOptions({
            title: 'Top Gainers',
            yAxisTitle: `Gain (${sortByValue ? '%' : '$'})`,
            series: gainers,
          })}
        />
      )}

      {!!losers[0].data.length && (
        <Charts
          options={getOptions({
            title: 'Top Losers',
            yAxisTitle: `Loss (${sortByValue ? '%' : '$'})`,
            series: losers,
          })}
        />
      )}
    </Collapsible>
  );
}
