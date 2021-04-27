import Typography from 'antd/es/typography';
import Radio from 'antd/lib/radio';
import React from 'react';
import { Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { Account } from '../types';

export type GroupType = 'type' | 'accounts' | 'institution' | 'currency';

type Props = {
  group?: GroupType;
  changeGroup: (group: GroupType) => void;
  tracker: string;
};

export default function CompositionGroup({ group = 'currency', changeGroup, tracker }: Props) {
  return (
    <Flex width={1} flexDirection="column" alignItems="center" py={2} mb={2}>
      <Typography.Title level={4}>Group By</Typography.Title>
      <Radio.Group
        optionType="button"
        buttonStyle="solid"
        defaultValue={group}
        onChange={(e) => {
          changeGroup(e.target.value);
          trackEvent(tracker, { group: e.target.value });
        }}
        options={[
          { label: 'USD vs CAD', value: 'currency' },
          { label: 'Account Type', value: 'type' },
          { label: 'Institution', value: 'institution' },
          { label: 'Account', value: 'accounts' },
        ]}
      />
    </Flex>
  );
}

export function getGroupKey(group: GroupType, account?: Account) {
  if (!account) {
    return 'N/A';
  }

  switch (group) {
    case 'currency':
      return account.currency.toUpperCase();
    case 'type':
      return account.type;
    case 'institution':
      return account.instutitionName;
    default:
      return account.name;
  }
}
