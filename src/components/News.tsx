import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import { Radio, Spin } from 'antd';
import Empty from 'antd/es/empty';
import Typography from 'antd/es/typography';
import moment, { Moment } from 'moment';
import React, { useEffect, useState } from 'react';
import { Box, Flex } from 'rebass';
import { Position } from '../types';
import { buildCorsFreeUrl } from '../utils';

type NewsResult = {
  timestamp: Moment;
  name: string;
  symbol: string;
  sentiment: string;
  title: string;
  url: string;
  source: string;
};

function Dot() {
  return <span style={{ fontSize: 16 }}> &bull; </span>;
}

function NewsItem({ news }: { news: NewsResult }) {
  return (
    <Box pb={2} key={news.title}>
      <div style={{ fontSize: 15, fontWeight: 500, paddingBottom: 4, paddingRight: 4 }}>
        <Typography.Link href={news.url} target="_blank" rel="noopener noreferrer">
          {news.title}
        </Typography.Link>
      </div>

      {news.sentiment === 'positive' ? (
        <CaretUpOutlined style={{ color: 'green', fontSize: 22 }} />
      ) : news.sentiment === 'negative' ? (
        <CaretDownOutlined style={{ color: 'red', fontSize: 22 }} />
      ) : undefined}

      <div style={{ fontSize: 13, color: '#8c8c8c' }}>
        {news.source}
        <Dot />
        {moment(news.timestamp).format('MMM DD, YYYY')}
        <Dot />
        {news.name} <Dot />
        {news.symbol}
      </div>

      <hr />
    </Box>
  );
}

function News({ positions }: { positions: Position[] }) {
  const [news, setNews] = useState<NewsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [symbol, setSymbol] = useState<string>('All');

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
      `https://portfolio.nasdaq.com/api/portfolio/getPortfolioNews/?tickers=${_symbols}&sentiment=yes`,
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
          const validSymbols = new Set<string>();
          setNews(
            // addedOn: "2021-04-09T21:25:20.63"
            // articleTimestamp: "2021-04-09T16:16:09"
            // companyName: "Apple"
            // date: "2021-04-09T00:00:00"
            // publishTimeFull: "2021-04-09T16:16:09-04:00"
            // sentiment: "neutral"
            // siteName: "Reuters"
            // stockType: "stock"
            // ticker: "AAPL"
            // title: "US STOCKS-S&P 500, Dow climb for third day and close at records"
            // url: "https://www.nasdaq.com/articles/us-stocks-sp-500-dow-climb-for-third-day-and-close-at-records-2021-04-09-0"
            // urlString: "https://www.nasdaq.com/articles/us-stocks-sp-500-dow-climb-for-third-day-and-close-at-records-2021-04-09-0"
            response.map((news) => {
              validSymbols.add(news.ticker);
              return {
                timestamp: moment(news.articleTimestamp || news.addedOn),
                name: news.companyName,
                symbol: news.ticker,
                sentiment: news.sentiment,
                title: news.title,
                url: news.url,
                source: news.siteName,
              };
            }),
          );

          setSymbols(Array.from(validSymbols).sort((a, b) => a.localeCompare(b)));
        }
      })
      .catch((error) => console.info('Failed to load news articles.', error))
      .finally(() => setLoading(false));
  }, [positions]);

  return (
    <Flex py={3} justifyContent="center">
      {!!news.length ? (
        <>
          <Flex flexDirection="column" alignItems="flex-end" px={2} width={1 / 4}>
            <Radio.Group
              style={{ width: '100%' }}
              onChange={(e) => setSymbol(e.target.value)}
              value={symbol}
              buttonStyle="solid"
              optionType="button"
            >
              {['All', ...symbols].map((symbol) => (
                <Radio.Button
                  style={{
                    width: '100%',
                    display: 'flex',
                    height: '50px',
                    justifyContent: 'center',
                    alignItems: 'center',
                    lineHeight: '30px',
                  }}
                  value={symbol}
                >
                  {symbol}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Flex>
          <Box width={3 / 4} px={2}>
            {news
              .filter((_news) => symbol === 'All' || _news.symbol === symbol)
              .map((_news, index) => (
                <NewsItem key={`${symbol}-${index}`} news={_news} />
              ))}
          </Box>
        </>
      ) : loading ? (
        <Spin size="large" />
      ) : (
        <Empty description="No News Found!" />
      )}
    </Flex>
  );
}

export default React.memo(News);
