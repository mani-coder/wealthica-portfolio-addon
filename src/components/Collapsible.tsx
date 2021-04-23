import Collapse from 'antd/lib/collapse';
import React from 'react';
import { Box } from 'rebass';
import { trackEvent } from '../analytics';

export default function Collapsible({
  title,
  closed,
  children,
}: {
  closed?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box my={3}>
      <Collapse
        defaultActiveKey={closed ? [] : ['1']}
        expandIconPosition="right"
        onChange={() => trackEvent('collapse-panel', { title })}
      >
        <Collapse.Panel header={title} key="1" style={{ backgroundColor: '#f9f0ff' }}>
          {children}
        </Collapse.Panel>
      </Collapse>
    </Box>
  );
}
