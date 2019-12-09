import Typography from 'antd/es/typography';
import { TextProps } from 'antd/es/typography/Text';
import React from 'react';
import { Flex, FlexProps } from 'rebass';
import { Account, Position } from '../types';
import { formatMoney, getSymbol } from '../utils';

type Props = {
  symbol: string;
  positions: Position[];
  accounts: Account[];
  isPrivateMode: boolean;
};

function LabelValue({
  label,
  value,
  valueProps,
  ...rest
}: { label: string; value: string; valueProps?: TextProps } & FlexProps) {
  return (
    <Flex justifyContent="space-between" py={1} style={{ borderBottom: `1px solid #f0f0f0` }} {...rest}>
      <Typography.Text strong>{label}</Typography.Text>
      <Typography.Text {...valueProps}>{value}</Typography.Text>
    </Flex>
  );
}

export default (props: Props) => {
  const marketValue = props.positions.reduce((sum, position) => {
    return sum + position.market_value;
  }, 0);

  const position = props.positions.find(position => getSymbol(position.security) === props.symbol);
  if (!position) {
    return <></>;
  }

  const accounts = (props.accounts || [])
    .map(account => {
      const position = account.positions.filter(position => position.symbol === props.symbol)[0];
      return position ? { name: account.name, type: account.type, quantity: position.quantity } : undefined;
    })
    .filter(value => value)
    .sort((a, b) => b!.quantity - a!.quantity);

  return (
    <Flex flexDirection="column" p={2}>
      <LabelValue label="Symbol" value={getSymbol(position.security)} />
      <LabelValue
        label="Value"
        value={`C$ ${formatMoney(position.market_value)} (${(position.market_value
          ? (position.market_value / marketValue) * 100
          : 0
        ).toFixed(2)}%)`}
      />
      <LabelValue
        label="Proft/Loss"
        value={`C$ ${formatMoney(position.gain_amount)} (${(position.gain_percent
          ? position.gain_percent * 100
          : position.gain_percent
        ).toFixed(2)}%)`}
        valueProps={{ type: position.gain_percent > 0 ? undefined : 'danger' }}
      />
      <LabelValue label="Shares" value={`${position.quantity}`} />
      <LabelValue
        label="Currency"
        value={position.security.currency ? position.security.currency.toUpperCase() : position.security.currency}
      />
      <LabelValue
        label="Buy Price"
        value={formatMoney(
          position.investments.reduce((cost, investment) => {
            return cost + investment.book_value / investment.quantity;
          }, 0) / position.investments.length,
        )}
      />
      <LabelValue label="Last Price" value={formatMoney(position.security.last_price)} />
      <LabelValue
        label="Account"
        value="Shares"
        valueProps={{ strong: true }}
        pt={2}
        style={{ borderBottom: `2px solid #7b7b7b` }}
      />
      {accounts.map(
        account => account && <LabelValue label={`${account.name} ${account.type}`} value={`${account.quantity}`} />,
      )}
    </Flex>
  );
};
