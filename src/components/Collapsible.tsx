import Collapse from 'antd/lib/collapse';
import React from 'react';
import { Box } from 'rebass';

export default function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box my={3}>
      <Collapse defaultActiveKey={['1']}>
        <Collapse.Panel forceRender header={title} key="1">
          {children}
        </Collapse.Panel>
      </Collapse>
    </Box>
  );
}
