import Collapse from 'antd/lib/collapse';
import React from 'react';
import { Box } from 'rebass';

export default function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box my={3}>
      <Collapse defaultActiveKey={['1']} expandIconPosition="right">
        <Collapse.Panel forceRender header={title} key="1" style={{ backgroundColor: '#f9f0ff' }}>
          {children}
        </Collapse.Panel>
      </Collapse>
    </Box>
  );
}
