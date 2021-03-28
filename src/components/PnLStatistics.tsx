import Card from 'antd/lib/card';
import Statistic from 'antd/lib/statistic';
import React from 'react';
import { Flex } from 'rebass';
import { Portfolio } from '../types';

export default function ({ portfolios, privateMode }: { portfolios: Portfolio[]; privateMode: boolean }) {
  const portfolio = portfolios[portfolios.length - 1];
  return (
    <Card bodyStyle={{ backgroundColor: '#f9f0ff' }} style={{ borderRadius: 6, borderColor: '#efdbff' }}>
      <Flex width={1} justifyContent="space-between" flexWrap="wrap">
        <Statistic title="Portfolio Value" value={privateMode ? '--' : portfolio.value} precision={2} prefix="$" />
        <Statistic title="Deposits" value={privateMode ? '--' : portfolio.deposits} precision={2} prefix="$" />
        <Statistic
          title="P&L %"
          valueStyle={{ color: portfolio.value >= portfolio.deposits ? 'green' : 'red' }}
          value={((portfolio.value - portfolio.deposits) / portfolio.deposits) * 100}
          precision={2}
          suffix="%"
        />
        <Statistic
          title="P&L Value"
          valueStyle={{ color: portfolio.value >= portfolio.deposits ? 'green' : 'red' }}
          value={privateMode ? '--' : portfolio.value - portfolio.deposits}
          precision={privateMode ? undefined : 2}
          prefix="$"
        />
      </Flex>
    </Card>
  );
}
