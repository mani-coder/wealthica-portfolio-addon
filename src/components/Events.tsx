import LeftOutlined from '@ant-design/icons/LeftOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';
import { Card } from 'antd';
import Button from 'antd/es/button';
import Typography from 'antd/es/typography';
import Calendar from 'antd/lib/calendar';
import Spin from 'antd/lib/spin';
import Table, { ColumnProps } from 'antd/lib/table';
import Tag from 'antd/lib/tag';
import moment, { Moment } from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Flex } from 'rebass';
import { Position } from '../types';
import { buildCorsFreeUrl } from '../utils';

type Dividend = {
  company: string;
  ticker: string;
  exDate: string;
  payDate: string;
  recDate: string;
  amount: number;
  yield: number;
};

type Earning = {
  ticker: string;
  date: string;
  company: string;
  periodEnding: string;
  eps: number;
  lastEps: number;
};

export function Events({ positions }: { positions: Position[] }) {
  const [events, setEvents] = useState<{ dividends: Dividend[]; earnings: Earning[] }>();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Moment>(moment().startOf('month'));
  const range = useMemo(() => {
    return { start: moment().startOf('month').subtract(1, 'month'), end: moment().endOf('month').add(1, 'year') };
  }, []);

  useEffect(() => {
    const _symbols = positions
      .filter((position) => {
        const symbol = position.security.symbol || position.security.name;
        return !(symbol.includes('-') || symbol.includes('.'));
      })
      .map((position) => position.security.symbol)
      .join(',');
    if (!_symbols.length) {
      return;
    }

    const url = buildCorsFreeUrl(
      `https://portfolio.nasdaq.com/api/portfolio/getPortfolioEvents/?fromDate=${date
        .clone()
        .subtract(30, 'days')
        .format('YYYY-MM-DD')}&toDate=${date
        .clone()
        .endOf('month')
        .add(60, 'days')
        .format('YYYY-MM-DD')}&tickers=${_symbols}`,
    );
    setLoading(true);

    fetch(url, {
      cache: 'force-cache',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((response) => {
        if (response) {
          setEvents({
            dividends: response.dividends,
            earnings: response.earnings,
          });
        }
      })
      .catch((error) => console.info('Failed to load events.', error))
      .finally(() => setLoading(false));
  }, [positions, date]);

  const eventsByDate = useMemo(() => {
    if (!events) {
      return {};
    }

    const result = events.earnings.reduce(
      (hash, earning) => {
        const earningDate = moment(earning.date).format('YYYY-MM-DD');
        let earnings = hash[earningDate];
        if (!earnings) {
          earnings = [];
          hash[earningDate] = earnings;
        }
        earnings.push({ ticker: earning.ticker, name: earning.company, type: 'earning' });
        return hash;
      },
      {} as {
        [K: string]: {
          ticker: string;
          name: string;
          type: 'earning' | 'ex-dividend' | 'pay-dividend' | 'rec-dividend';
        }[];
      },
    );

    return events.dividends.reduce((hash, dividend) => {
      ['exDate', 'payDate', 'recDate'].forEach((field) => {
        if (!dividend[field]) {
          return;
        }

        const dividendDate = moment(dividend[field]).format('YYYY-MM-DD');
        let dividends = hash[dividendDate];
        if (!dividends) {
          dividends = [];
          hash[dividendDate] = dividends;
        }
        dividends.push({
          ticker: dividend.ticker,
          name: dividend.company,
          type: field === 'exDate' ? 'ex-dividend' : field === 'payDate' ? 'pay-dividend' : 'rec-dividend',
        });
      });
      return hash;
    }, result);
  }, [events]);

  function dateCellRender(date: Moment) {
    const _events = eventsByDate[date.format('YYYY-MM-DD')];

    return _events && _events.length ? (
      <Flex flexWrap="wrap">
        {_events.map((item) => (
          <Box mr={1} mb={1} key={item.ticker}>
            <Tag
              color={
                item.type === 'earning'
                  ? 'magenta'
                  : item.type === 'ex-dividend'
                  ? 'blue'
                  : item.type === 'pay-dividend'
                  ? 'green'
                  : 'geekblue'
              }
            >
              {item.type === 'earning'
                ? ''
                : item.type === 'ex-dividend'
                ? 'ED: '
                : item.type === 'pay-dividend'
                ? 'PD: '
                : 'RD: '}
              {item.ticker}
            </Tag>
          </Box>
        ))}
      </Flex>
    ) : (
      <></>
    );
  }

  function getColumns(): ColumnProps<Earning>[] {
    return [
      {
        key: 'date',
        title: 'Date',
        dataIndex: 'date',
        render: (text) => moment(text).format('MMM DD, YY'),
      },
      {
        key: 'Company',
        title: 'Symbol',
        dataIndex: 'ticker',
      },
      {
        key: 'periodEnding',
        title: 'Period Ending',
        dataIndex: 'periodEnding',
      },
      {
        key: 'lastEps',
        title: 'Last EPS',
        dataIndex: 'lastEps',
        align: 'right',
      },
      {
        key: 'eps',
        title: 'EPS',
        dataIndex: 'eps',
        align: 'right',
      },
    ];
  }

  return (
    <>
      <Typography.Title level={3} style={{ textAlign: 'center' }}>
        Earnings &amp; Dividends
      </Typography.Title>
      <Calendar
        value={date}
        validRange={[moment().startOf('month'), moment().endOf('month').add(1, 'year')]}
        dateCellRender={dateCellRender}
        headerRender={() => (
          <Box>
            <Flex justifyContent="space-between" alignItems="center">
              <Button
                loading={loading}
                disabled={date.isSameOrBefore(range.start)}
                type="primary"
                icon={<LeftOutlined />}
                onClick={() => {
                  setDate(date.subtract(1, 'month').clone());
                }}
              >
                Prev Month
              </Button>
              <Typography.Title level={3}>
                {date.format('MMMM YYYY')} {loading && <Spin />}
              </Typography.Title>
              <Button
                loading={loading}
                disabled={date.clone().endOf('month').isSameOrAfter(range.end)}
                type="primary"
                onClick={() => {
                  setDate(date.add(1, 'month').clone());
                }}
              >
                Next Month <RightOutlined />
              </Button>
            </Flex>
            <Flex my={2} justifyContent="center">
              <Tag color="magenta">Earning</Tag>
              <Tag color="blue">ED: Ex-Dividend</Tag>
              <Tag color="green">PD: Pay Dividend</Tag>
              <Tag color="geekblue">RD: Record Dividend</Tag>
            </Flex>
          </Box>
        )}
      />

      {events?.earnings && !!events?.earnings.length && (
        <Card
          title={<>Upcoming Earnings (Starting {date.format('MMM DD, YYYY')})</>}
          headStyle={{ paddingLeft: 16, fontSize: 18, fontWeight: 'bold' }}
          style={{ marginTop: 16, marginBottom: 16 }}
          bodyStyle={{ padding: 0 }}
        >
          <Table<Earning>
            columns={getColumns()}
            dataSource={events.earnings.filter((earning) => moment(earning.date).isSameOrAfter(date))}
          />
        </Card>
      )}
    </>
  );
}
