import { Addon } from '@wealthica/wealthica.js/index';
import { Badge } from 'antd';
import Typography from 'antd/es/typography';
import Text from 'antd/es/typography/Text';
import Empty from 'antd/lib/empty';
import Spin from 'antd/lib/spin';
import Tabs from 'antd/lib/tabs';
import _ from 'lodash';
import moment from 'moment';
import React, { Component } from 'react';
import { Flex } from 'rebass';
import { initTracking, trackEvent } from './analytics';
import {
  parseAccountTransactionsResponse,
  parseCurrencyReponse,
  parseInstitutionsResponse,
  parsePortfolioResponse,
  parsePositionsResponse,
  parseSecurityTransactionsResponse,
  parseTransactionsResponse,
} from './api';
import './App.less';
import ChangeLog, { getNewChangeLogsCount, setChangeLogViewDate } from './components/ChangeLog';
import DepositVsPortfolioValueTimeline from './components/DepositsVsPortfolioValueTimeline';
import { Events } from './components/Events';
import HoldingsCharts from './components/HoldingsCharts';
import HoldingsTable from './components/HoldingsTable';
import News from './components/News';
import PnLStatistics from './components/PnLStatistics';
import PortfolioVisualizer from './components/PortfolioVisualizer';
import ProfitLossPercentageTimeline from './components/ProfitLossPercentageTimeline';
import ProfitLossTimeline from './components/ProfitLossTimeline';
import RealizedPnL from './components/RealizedPnL';
import { TopGainersLosers } from './components/TopGainersLosers';
import YoYPnLChart from './components/YoYPnLChart';
import { TRANSACTIONS_FROM_DATE } from './constants';
import { CURRENCIES_API_RESPONSE } from './mocks/currencies';
import { Account, AccountTransaction, Portfolio, Position, Transaction } from './types';
import { computeBookValue, getCurrencyInCAD, getSymbol } from './utils';

type State = {
  addon: any;
  currencyCache?: { [key: string]: number };
  securityTransactions: Transaction[];
  accountTransactions: AccountTransaction[];
  portfolios: Portfolio[];
  allPortfolios: Portfolio[];
  positions: Position[];
  accounts: Account[];
  isLoaded: boolean;
  privateMode: boolean;
  fromDate: string;

  options?: any;
  isLoadingOnUpdate?: boolean;
  newChangeLogsCount?: number;
};
type Props = {};

class App extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      addon: this.getAddon(),
      currencyCache: undefined,
      securityTransactions: [],
      accountTransactions: [],
      portfolios: [],
      allPortfolios: [],
      positions: [],
      accounts: [],
      isLoaded: false,
      privateMode: false,
      fromDate: TRANSACTIONS_FROM_DATE,
    };
  }

  getAddon = (): any => {
    try {
      const addon = new Addon({});

      addon.on('init', (options) => {
        console.debug('Addon initialization', options);
        this.load(options);
        initTracking(options.authUser && options.authUser.id);
      });

      addon.on('reload', () => {
        // Start reloading
        console.debug('Reload invoked!');
      });

      addon.on('update', (options) => {
        // Update according to the received options
        console.debug('Addon update - options: ', options);
        this.setState({ isLoadingOnUpdate: true });
        this.load(options);
        trackEvent('update');
      });

      return addon;
    } catch (error) {
      console.warn('Falied to load the addon -- ', error);
    }

    return null;
  };

  loadCurrenciesCache() {
    if (this.state.currencyCache) {
      return null;
    }

    console.debug('Loading currencies data.');
    return this.state.addon
      .request({
        method: 'GET',
        endpoint: 'currencies/usd/history',
        query: {
          base: 'cad',
        },
      })
      .then((response) => parseCurrencyReponse(response))
      .catch((error) => {
        console.error('Failed to load currency data.', error);
      });
  }

  // loadGroupsCache() {
  //   if (this.state.groupsCache) {
  //     return;
  //   }

  //   console.debug('Loading groups data.');
  //   return this.state.addon
  //     .request({ method: 'GET', endpoint: 'groups' })
  //     .then((response) => parseGroupNameByIdReponse(response))
  //     .catch((error) => {
  //       console.error('Failed to load groups data.', error);
  //     });
  // }

  load = _.debounce(
    (options: any) => {
      this.loadData(options);
    },
    100,
    { leading: true },
  );

  mergeOptions(options) {
    if (!this.state.options) {
      this.setState({ options });
    }
    const oldOptions = this.state.options;
    Object.keys(options).forEach((key) => {
      oldOptions[key] = options[key];
    });
    this.setState({ options: oldOptions });
    return oldOptions;
  }

  async loadData(options) {
    options = this.mergeOptions(options);
    this.setState({ privateMode: options.privateMode, fromDate: options.fromDate });

    const [positions, portfolioByDate, transactions, accounts, currencyCache] = await Promise.all([
      this.loadPositions(options),
      this.loadPortfolioData(options),
      this.loadTransactions(options),
      this.loadInstitutionsData(options),
      this.loadCurrenciesCache(),
    ]);

    const _currencyCache = currencyCache || this.state.currencyCache;

    console.debug('Loaded data', {
      positions,
      portfolioByDate,
      transactions,
      accounts,
      currencyCache: _currencyCache,
    });

    this.computePortfolios(positions, portfolioByDate, transactions, accounts, _currencyCache);
  }

  computePortfolios = (
    positions: Position[],
    portfolioByDate: any,
    transactions: any,
    accounts: Account[],
    currencyCache: any,
  ) => {
    const securityTransactions = parseSecurityTransactionsResponse(transactions, currencyCache);
    const securityTransactionsBySymbol = securityTransactions.reduce((hash, transaction) => {
      if (!hash[transaction.symbol]) {
        hash[transaction.symbol] = [];
      }
      hash[transaction.symbol].push(transaction);
      return hash;
    }, {});

    positions.forEach((position) => {
      if (position.security.type === 'crypto') {
        position.currency = position.security.currency = 'cad';
        position.security.last_price = getCurrencyInCAD(
          position.security?.last_date ? moment(position.security.last_date.slice(0, 10)) : moment(),
          position.security.last_price,
          currencyCache,
        );
      }
      position.transactions = securityTransactionsBySymbol[getSymbol(position.security)] || [];
      computeBookValue(position);
    });

    const transactionsByDate = parseTransactionsResponse(transactions, currencyCache, accounts);
    const portfolioPerDay = Object.keys(portfolioByDate).reduce((hash, date) => {
      const data = transactionsByDate[date] || {};
      hash[date] = {
        value: portfolioByDate[date],
        deposit: data.deposit || 0,
        withdrawal: data.withdrawal || 0,
        income: data.income || 0,
        interest: data.interest || 0,
      };
      return hash;
    }, {});

    const portfolios: Portfolio[] = [];

    const sortedDates = Object.keys(portfolioPerDay).sort();
    let deposits = Object.keys(transactionsByDate)
      .filter((date) => date < sortedDates[0])
      .reduce((totalDeposits, date) => {
        const transaction = transactionsByDate[date];
        totalDeposits += transaction.deposit - transaction.withdrawal;
        return totalDeposits;
      }, 0);

    sortedDates.forEach((date) => {
      const portfolio = portfolioPerDay[date];
      deposits += portfolio.deposit - portfolio.withdrawal;
      portfolios.push({
        date: date,
        value: portfolio.value,
        deposits: deposits,
      });
    });

    this.setState({
      positions,
      securityTransactions,
      accountTransactions: parseAccountTransactionsResponse(transactions, currencyCache),

      allPortfolios: portfolios,
      portfolios: portfolios.filter((portfolio) => moment(portfolio.date).isoWeekday() <= 5),
      isLoaded: true,
      isLoadingOnUpdate: false,
      accounts,
      currencyCache,
    });
  };

  loadPortfolioData(options) {
    console.debug('Loading portfolio data.');
    const query = {
      from: options.fromDate,
      to: options.toDate,
      assets: false,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return this.state.addon
      .request({
        query,
        method: 'GET',
        endpoint: 'portfolio',
      })
      .then((response) => parsePortfolioResponse(response))
      .catch((error) => {
        console.error('Failed to load portfolio data.', error);
      });
  }

  loadPositions(options) {
    console.debug('Loading positions data.');
    const query = {
      assets: false,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return this.state.addon
      .request({
        query,
        method: 'GET',
        endpoint: 'positions',
      })
      .then((response) => parsePositionsResponse(response))
      .catch((error) => {
        console.error('Failed to load position data.', error);
      });
  }

  loadInstitutionsData(options) {
    console.debug('Loading institutions data..');
    const query = {
      assets: false,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return this.state.addon
      .request({
        query,
        method: 'GET',
        endpoint: 'institutions',
      })
      .then((response) =>
        parseInstitutionsResponse(
          response,
          options.groupsFilter ? options.groupsFilter.split(',') : [],
          options.institutionsFilter ? options.institutionsFilter.split(',') : [],
        ),
      )
      .catch((error) => {
        console.error('Failed to load institutions data.', error);
      });
  }

  loadTransactions(options) {
    console.debug('Loading transactions data.');
    const fromDate = options.fromDate;
    const query = {
      assets: false,
      from: fromDate && fromDate < TRANSACTIONS_FROM_DATE ? fromDate : TRANSACTIONS_FROM_DATE,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return this.state.addon
      .request({
        query,
        method: 'GET',
        endpoint: 'transactions',
      })
      .then((response) => response)
      .catch((error) => {
        console.error('Failed to load transactions data.', error);
      });
  }

  async loadStaticPortfolioData() {
    let institutionsData, portfolioData, positionsData, transactionsData;
    if (process.env.NODE_ENV === 'development') {
      [institutionsData, portfolioData, positionsData, transactionsData] = await Promise.all([
        import('./mocks/institutions-prod').then((response) => response.DATA),
        import('./mocks/portfolio-prod').then((response) => response.DATA),
        import('./mocks/positions-prod').then((response) => response.DATA),
        import('./mocks/transactions-prod').then((response) => response.DATA),
      ]);
    } else {
      [institutionsData, portfolioData, positionsData, transactionsData] = await Promise.all([
        import('./mocks/institutions').then((response) => response.DATA),
        import('./mocks/portfolio').then((response) => response.DATA),
        import('./mocks/positions').then((response) => response.DATA),
        import('./mocks/transactions').then((response) => response.DATA),
      ]);
    }
    const currencyCache = parseCurrencyReponse(CURRENCIES_API_RESPONSE);
    const portfolioByDate = parsePortfolioResponse(portfolioData);
    const positions = parsePositionsResponse(positionsData);
    const accounts = parseInstitutionsResponse(institutionsData);

    this.computePortfolios(positions, portfolioByDate, transactionsData, accounts, currencyCache);
    console.debug('State:', this.state);
  }

  componentDidMount() {
    if (!this.state.addon) {
      setTimeout(() => this.loadStaticPortfolioData(), 0);
    }

    setTimeout(() => this.computeChangeLogCount(), 1000);
  }

  computeChangeLogCount() {
    const newChangeLogsCount = getNewChangeLogsCount();
    if (newChangeLogsCount) {
      this.setState({ newChangeLogsCount });
    }
  }

  render() {
    return (
      <Flex width={1} justifyContent="center">
        <div style={{ padding: 4, maxWidth: this.state.addon ? '100%' : 1100, width: '100%' }}>
          {this.state.isLoaded ? (
            <>
              {!this.state.addon && (
                <>
                  <p
                    style={{ fontWeight: 'bolder', textAlign: 'center', color: '#C00316', textDecoration: 'underline' }}
                  >
                    <img
                      src="/wealthica-portfolio-addon/favicon.png"
                      alt="favicon"
                      width="50"
                      height="50"
                      style={{ backgroundColor: '#fff' }}
                    />
                    !! This is sample data !!
                  </p>
                </>
              )}
              {this.state.isLoadingOnUpdate && (
                <Flex width={1} justifyContent="center" alignItems="center">
                  <Spin size="small" />
                </Flex>
              )}

              <Tabs
                defaultActiveKey="pnl"
                onChange={(tab) => {
                  if (tab === 'change-log' && this.state.newChangeLogsCount) {
                    setChangeLogViewDate();
                    this.setState({ newChangeLogsCount: undefined });
                  }
                  trackEvent('tab-change', { tab });
                }}
                size="large"
              >
                <Tabs.TabPane destroyInactiveTabPane forceRender tab="P&L Charts" key="pnl">
                  <PnLStatistics
                    portfolios={this.state.portfolios}
                    privateMode={this.state.privateMode}
                    positions={this.state.positions}
                  />

                  <DepositVsPortfolioValueTimeline
                    portfolios={this.state.portfolios}
                    isPrivateMode={this.state.privateMode}
                  />

                  <YoYPnLChart portfolios={this.state.allPortfolios} isPrivateMode={this.state.privateMode} />
                  <ProfitLossPercentageTimeline
                    portfolios={this.state.portfolios}
                    isPrivateMode={this.state.privateMode}
                  />
                  <ProfitLossTimeline portfolios={this.state.portfolios} isPrivateMode={this.state.privateMode} />
                </Tabs.TabPane>

                <Tabs.TabPane forceRender tab="Holdings Analyzer" key="holdings">
                  {!!this.state.positions.length ? (
                    <>
                      <HoldingsCharts
                        currencyCache={this.state.currencyCache || {}}
                        positions={this.state.positions}
                        accounts={this.state.accounts}
                        isPrivateMode={this.state.privateMode}
                        addon={this.state.addon}
                      />

                      <PortfolioVisualizer positions={this.state.positions} />

                      <HoldingsTable positions={this.state.positions} isPrivateMode={this.state.privateMode} />
                    </>
                  ) : (
                    <Empty description="No Holdings" />
                  )}
                </Tabs.TabPane>

                <Tabs.TabPane destroyInactiveTabPane tab="Gainers/Losers" key="gainers-losers">
                  <TopGainersLosers
                    positions={this.state.positions}
                    isPrivateMode={this.state.privateMode}
                    addon={this.state.addon}
                    currencyCache={this.state.currencyCache || {}}
                  />
                </Tabs.TabPane>

                <Tabs.TabPane destroyInactiveTabPane tab="Realized P&L" key="realized-pnl">
                  <RealizedPnL
                    currencyCache={this.state.currencyCache || {}}
                    fromDate={this.state.fromDate}
                    transactions={this.state.securityTransactions}
                    accountTransactions={this.state.accountTransactions}
                    accounts={this.state.accounts}
                    isPrivateMode={this.state.privateMode}
                  />
                </Tabs.TabPane>

                <Tabs.TabPane destroyInactiveTabPane tab="News" key="news">
                  <News positions={this.state.positions} />
                </Tabs.TabPane>

                <Tabs.TabPane destroyInactiveTabPane tab="Events" key="events">
                  <Events positions={this.state.positions} />
                </Tabs.TabPane>

                <Tabs.TabPane
                  destroyInactiveTabPane
                  tab={
                    <Badge count={this.state.newChangeLogsCount} overflowCount={9} offset={[15, 2]}>
                      Latest Changes
                    </Badge>
                  }
                  key="change-log"
                >
                  <ChangeLog />
                </Tabs.TabPane>
              </Tabs>
            </>
          ) : (
            <Flex justifyContent="center" width={1}>
              <Spin size="large" />
            </Flex>
          )}

          <br />
          <hr />
          <Typography.Title level={4} type="secondary">
            Disclaimer
          </Typography.Title>
          <Text type="secondary">
            This tool is simply a calculator of profit and loss using the deposits/withdrawals and daily portfolio
            values. Results provided by this tool do not constitute investment advice. The makers of this tool are not
            responsible for the consequences of any decisions or actions taken in reliance upon or as a result of the
            information provided by this tool. The information on the add-on may contain errors or inaccuracies. The use
            of the add-on is at your own risk and is provided without any warranty.
            <br />
            <br />
            Please trade responsibly. For any issues or feedback, contact the developer at{' '}
            <a href="mailto:k.elayamani@gmail.com">k.elayamani@gmail.com</a> or create a github issue{' '}
            <a
              href="https://github.com/mani-coder/wealthica-portfolio-addon/issues/new?assignees=&labels=&template=custom.md&title="
              target="_blank"
              rel="noopener noreferrer"
            >
              here
            </a>
            .
          </Text>
          <br />
          <hr />
        </div>
      </Flex>
    );
  }
}

export default App;
