import Card from 'antd/lib/card';
import Statistic, { StatisticProps } from 'antd/lib/statistic';
import React from 'react';
import { Box, Flex } from 'rebass';
import { Portfolio, Position } from '../types';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

function StatisticBox(props: StatisticProps) {
  return (
    <Box p={1}>
      <Statistic {...props} />
    </Box>
  );
}

function PnLStatistics({
  portfolios,
  privateMode,
  positions,
}: {
  portfolios: Portfolio[];
  positions: Position[];
  privateMode: boolean;
}) {
  const portfolio = portfolios[portfolios.length - 1];
  const marketValue = positions.reduce((value, position) => value + position.market_value, 0);
  const bookValue = positions.reduce((value, position) => value + position.book_value, 0);
  const unrealizePnLValue = marketValue - bookValue;
  const unrealizedPnLRatio = unrealizePnLValue ? (unrealizePnLValue / bookValue) * 100 : 0;

  return (
    <Card bodyStyle={{ backgroundColor: '#f9f0ff' }} style={{ borderRadius: 6, borderColor: '#efdbff' }}>
      <Flex width={1} justifyContent="space-between" flexWrap="wrap">
        <StatisticBox title="Portfolio Value" value={privateMode ? '--' : portfolio.value} precision={2} prefix="$" />
        <StatisticBox title="Deposits" value={privateMode ? '--' : portfolio.deposits} precision={2} prefix="$" />
        <StatisticBox
          title="Overall P&L %"
          valueStyle={{ color: portfolio.value >= portfolio.deposits ? 'green' : 'red' }}
          value={((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100}
          precision={2}
          suffix="%"
          prefix={portfolio.value >= portfolio.deposits ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        />
        <StatisticBox
          title="Overall P&L Value"
          valueStyle={{ color: portfolio.value >= portfolio.deposits ? 'green' : 'red' }}
          value={privateMode ? '--' : portfolio.value - portfolio.deposits}
          precision={privateMode ? undefined : 2}
          prefix="$"
        />
        <StatisticBox
          title="Unrealized P&L Value"
          valueStyle={{ color: unrealizePnLValue >= 0 ? 'green' : 'red' }}
          value={privateMode ? '--' : unrealizePnLValue}
          precision={privateMode ? undefined : 2}
          prefix="$"
        />
        <StatisticBox
          title="Unrealized P&L %"
          valueStyle={{ color: unrealizedPnLRatio >= 0 ? 'green' : 'red' }}
          value={privateMode ? '--' : unrealizedPnLRatio}
          precision={privateMode ? undefined : 2}
          suffix="%"
          prefix={unrealizedPnLRatio >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        />
      </Flex>
    </Card>
  );
}

export default React.memo(PnLStatistics);
