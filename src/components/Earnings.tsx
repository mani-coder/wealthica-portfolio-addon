import Typography from 'antd/es/typography';
import Select from 'antd/lib/select';
import Table from 'antd/lib/table';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { Flex } from 'rebass';
import { Position } from '../types';
import { buildCorsFreeUrl, getSymbol } from '../utils';
import Collapsible from './Collapsible';

type Props = {
  positions: Position[];
};

export default function Earnings(props: Props) {
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<any>();
  const symbol = 'test';
  // const [symbol, setSymbol] = useState();

  useEffect(() => {
    if (!props.positions) {
      return;
    }

    setLoading(true);

    const content = {
      sortType: 'asc',
      entityIdType: 'earnings',
      sortField: 'startdatetime',
      includeFields: ['ticker', 'companyshortname', 'startdatetime', 'startdatetimetype', 'epsestimate'],
      query: {
        operator: 'and',
        operands: [
          { operator: 'gte', operands: ['startdatetime', moment().format('YYYY-MM-DD')] },
          {
            operator: 'lt',
            operands: ['startdatetime', moment().add(6, 'months').format('YYYY-MM-DD')],
          },
          {
            operator: 'or',
            operands: props.positions.map((position) => ({
              operator: 'eq',
              operands: ['ticker', getSymbol(position.security)],
            })),
          },
        ],
      },
      offset: 0,
      size: 200,
    };

    fetch(buildCorsFreeUrl('https://query2.finance.yahoo.com/v1/finance/visualization'), {
      cache: 'force-cache',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    })
      .then((response) => response.json())
      .then((response) => {
        console.log('earnings', response);
        const document = response.finance.result[0].documents[0];
        setDocument(document);
      })
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  }, [props.positions]);

  function data() {
    if (!document) {
      return [];
    }

    return (document.rows || [])
      .map((row, idx) =>
        document.columns.reduce(
          (hash, col, index) => {
            let value = row[index];
            if (col.id === 'startdatetime') {
              value = moment(value.slice(0, 10), 'YYYY-MM-DD').format('MMM DD, YYYY');
            } else if (col.id === 'startdatetimetype') {
              value =
                value === 'TNS'
                  ? 'Time Not Supplied'
                  : value === 'BMO'
                  ? 'Before Market Open'
                  : value === 'AMC'
                  ? 'After Market Close'
                  : value;
            }
            hash[col.id] = value;
            return hash;
          },
          { key: idx },
        ),
      )
      .filter((row) => !symbol || row.ticker === symbol);
  }

  function columns() {
    if (!document) {
      return [];
    }

    return [
      {
        title: 'Stock',
        key: 'ticker',
        dataIndex: 'ticker',
        // ...getColumnSearchProps('ticker'),
      },
      {
        title: 'Company',
        key: 'companyshortname',
        dataIndex: 'companyshortname',
        // ...getColumnSearchProps('companyshortname'),
      },
      {
        title: 'Earnings Date',
        key: 'startdatetime',
        dataIndex: 'startdatetime',
      },
      {
        title: 'Earnings Time',
        key: 'startdatetimetype',
        dataIndex: 'startdatetimetype',
      },
      {
        title: 'EPS Estimate',
        key: 'epsestimate',
        dataIndex: 'epsestimate',
      },
    ];
  }

  const symbols = props.positions
    .map((position) => getSymbol(position.security))
    .sort()
    .map((symbol, index) => (
      <Select.Option key={index} value={symbol}>
        {symbol}
      </Select.Option>
    ));

  return (
    <Collapsible title="Upcoming Earnings">
      <Table
        title={() => (
          <Flex flexDirection="row" flexWrap="wrap">
            <Typography.Text strong>Stock lookup:</Typography.Text>
            <Flex p={2} />
            <Select
              allowClear
              showSearch
              value={symbol}
              placeholder="Enter a stock, e.g: FB, SHOP.TO"
              showArrow
              style={{ width: '100%', maxWidth: 350 }}
              // onChange={setSymbol}
              filterOption={(inputValue: any, option: any) =>
                (option!.props!.value! as string).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            >
              {symbols}
            </Select>
          </Flex>
        )}
        rowKey="key"
        loading={loading}
        dataSource={data()}
        columns={columns()}
      />
    </Collapsible>
  );
}
