import CaretDownOutlined from '@ant-design/icons/CaretDownOutlined';
import CaretUpOutlined from '@ant-design/icons/CaretUpOutlined';
import Empty from 'antd/es/empty';
import Typography from 'antd/es/typography';
import Radio from 'antd/lib/radio';
import Spin from 'antd/lib/spin';
import moment, { Moment } from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { Box, Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { Position } from '../types';
import { buildCorsFreeUrl, getNasdaqTicker, getSymbolFromNasdaqTicker } from '../utils';

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
      <Flex alignItems="center">
        <div style={{ fontSize: 15, fontWeight: 500, paddingBottom: 4, paddingRight: 4 }}>
          <Typography.Link href={news.url} target="_blank" rel="noopener noreferrer">
            {news.title}
          </Typography.Link>
        </div>

        {news.sentiment === 'positive' ? (
          <CaretUpOutlined style={{ color: 'green', fontSize: 25 }} />
        ) : news.sentiment !== 'neutral' ? (
          <CaretDownOutlined style={{ color: 'red', fontSize: 25 }} />
        ) : undefined}
      </Flex>

      <div style={{ fontSize: 13, color: '#8c8c8c' }}>
        {news.source}
        <Dot />
        {moment(news.timestamp).format('MMM DD, YYYY hh:mm A')} EDT
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
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | 'all'>('all');

  useEffect(() => {
    const _symbols = positions
      .filter((position) => {
        const symbol = position.security.symbol || position.security.name;
        return !(symbol.includes('-') || position.security.type === 'crypto');
      })
      .map((position) => getNasdaqTicker(position.security))
      .join(',');
    if (!_symbols.length) {
      return;
    }

    const url = buildCorsFreeUrl(`https://portfolio.nasdaq.com/api/portfolio/getPortfolioNews/?tickers=${_symbols}`);
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
              const symbol = getSymbolFromNasdaqTicker(news.ticker);
              validSymbols.add(symbol);
              return {
                timestamp: moment(news.articleTimestamp || news.addedOn),
                name: news.companyName,
                symbol,
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

  const sidebarContainerRef = useRef<HTMLDivElement>();
  const newsContainerRef = useRef<HTMLDivElement>();

  const selectedNews = news.filter(
    (_news) => (sentiment === 'all' || _news.sentiment === sentiment) && (symbol === 'All' || _news.symbol === symbol),
  );
  return (
    <Flex flexDirection="column" mb={3} alignItems="center">
      <Flex width={1} justifyContent="center" mb={3}>
        <Radio.Group
          size="large"
          defaultValue={sentiment}
          onChange={(e) => {
            setSentiment(e.target.value);
            trackEvent('news-sentiment-toggle', { sentiment: e.target.value });
          }}
          buttonStyle="solid"
        >
          <Radio.Button key="all" value="all">
            All
          </Radio.Button>
          <Radio.Button key="positive" value="positive">
            <CaretUpOutlined style={{ color: 'green' }} /> Bullish
          </Radio.Button>
          <Radio.Button key="negative" value="negative">
            <CaretDownOutlined style={{ color: 'red' }} /> Bearish
          </Radio.Button>
        </Radio.Group>
      </Flex>
      {!!news.length ? (
        <Flex width={1}>
          <Flex flexDirection="column" alignItems="flex-end" px={2} width={1 / 4}>
            <Box width={1} ref={sidebarContainerRef}>
              <Radio.Group
                style={{ width: '100%' }}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  window.scroll({ top: 0, left: 0, behavior: 'smooth' });
                  if (newsContainerRef?.current) {
                    newsContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  }
                }}
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
            </Box>
          </Flex>

          {!!selectedNews.length ? (
            <Box
              ref={newsContainerRef}
              width={3 / 4}
              px={2}
              height={sidebarContainerRef?.current && sidebarContainerRef.current.clientHeight}
              style={{ overflow: 'scroll' }}
            >
              {selectedNews.map((_news, index) => (
                <NewsItem key={`${symbol}-${index}`} news={_news} />
              ))}
            </Box>
          ) : (
            <Flex justifyContent="center" width={3 / 4} py={3}>
              <Empty description="No News Articles Found!" />
            </Flex>
          )}
        </Flex>
      ) : loading ? (
        <Spin size="large" />
      ) : (
        <Empty description="No News Articles Found!" />
      )}
    </Flex>
  );
}

export default React.memo(News);
