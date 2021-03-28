import { Addon } from '@wealthica/wealthica.js/index';
import { Tabs } from 'antd';
import Typography from 'antd/es/typography';
import Text from 'antd/es/typography/Text';
import Spin from 'antd/lib/spin';
import _ from 'lodash';
import moment from 'moment';
import React, { Component } from 'react';
import { Flex } from 'rebass';
import { trackEvent } from './analytics';
import {
  parseCurrencyReponse,
  parseInstitutionsResponse,
  parsePortfolioResponse,
  parsePositionsResponse,
  parseSecurityTransactionsResponse,
  parseTransactionsResponse,
} from './api';
import './App.less';
import DepositVsPortfolioValueTimeline from './components/DepositsVsPortfolioValueTimeline';
import HoldingsCharts from './components/HoldingsCharts';
import PnLStatistics from './components/PnLStatistics';
import ProfitLossPercentageTimeline from './components/ProfitLossPercentageTimeline';
import ProfitLossTimeline from './components/ProfitLossTimeline';
import { TopGainersLosers } from './components/TopGainersLosers';
import YoYPnLChart from './components/YoYPnLChart';
import { TRANSACTIONS_FROM_DATE } from './constants';
import { CURRENCIES_API_RESPONSE } from './mocks/currencies';
import { INSTITUTIONS_DATA } from './mocks/institutions';
import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio';
import { POSITIONS_API_RESPONSE } from './mocks/positions';
import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions';
// import { INSTITUTIONS_DATA } from './mocks/institutions-prod';
// import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio-prod';
// import { POSITIONS_API_RESPONSE } from './mocks/positions-prod';
// import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions-prod';
import { Account, Portfolio, Position } from './types';
import { getSymbol } from './utils';
import { StickyContainer, Sticky } from 'react-sticky';

const renderTabBar = (props, DefaultTabBar) => (
  <Sticky bottomOffset={80}>
    {({ style }) => <DefaultTabBar {...props} className="custom-tab-bar" style={{ ...style }} />}
  </Sticky>
);

type State = {
  addon: any;
  currencyCache?: { [key: string]: number };
  // groupsCache?: { [key: string]: string };
  portfolios: Portfolio[];
  allPortfolios: Portfolio[];
  positions: Position[];
  accounts: Account[];
  isLoaded: boolean;
  privateMode: boolean;

  options?: any;
  isLoadingOnUpdate?: boolean;
};
type Props = {};

class App extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      addon: this.getAddon(),
      currencyCache: undefined,
      portfolios: [],
      allPortfolios: [],
      positions: [],
      accounts: [],
      isLoaded: false,
      privateMode: false,
    };
  }

  getAddon = (): any => {
    try {
      const addon = new Addon({});

      addon.on('init', (options) => {
        console.debug('Addon initialization', options);
        this.load(options);
        if (window.analytics) {
          window.analytics.identify(options.authUserId);
        }
        trackEvent('init');
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
  }

  async loadData(options) {
    this.mergeOptions(options);
    this.setState({ privateMode: this.state.options.privateMode });

    const [
      positions,
      portfolioByDate,
      transactions,
      accounts,
      currencyCache,
      // groupsCache
    ] = await Promise.all([
      this.loadPositions(this.state.options),
      this.loadPortfolioData(this.state.options),
      this.loadTransactions(this.state.options),
      this.loadInstitutionsData(this.state.options),
      this.loadCurrenciesCache(),
      // this.loadGroupsCache(),
    ]);

    const _currencyCache = currencyCache || this.state.currencyCache;
    // const _groupsCache = groupsCache || this.state.groupsCache;
    console.debug('Loaded data', {
      positions,
      portfolioByDate,
      transactions,
      accounts,
      currencyCache: _currencyCache,
      // groupsCache: _groupsCache,
    });

    this.computePositions(positions, transactions, _currencyCache);
    this.computePortfolios(portfolioByDate, transactions, accounts, _currencyCache);
  }

  computePositions(positions, transactions, currencyCache) {
    const securityTransactions = parseSecurityTransactionsResponse(transactions, currencyCache);
    const securityTransactionsBySymbol = securityTransactions.reduce((hash, transaction) => {
      if (!hash[transaction.symbol]) {
        hash[transaction.symbol] = [];
      }
      hash[transaction.symbol].push(transaction);
      return hash;
    }, {});

    positions.forEach((position) => {
      position.transactions = securityTransactionsBySymbol[getSymbol(position.security)] || [];
    });

    this.setState({ positions });
  }

  computePortfolios = (portfolioByDate, transactions, accounts, currencyCache) => {
    const transactionsByDate = parseTransactionsResponse(transactions, currencyCache, accounts);
    // console.debug('Transactions by date: ', transactionsByDate);

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
      allPortfolios: portfolios,
      portfolios: portfolios.filter((portfolio) => moment(portfolio.date).isoWeekday() <= 5),
      isLoaded: true,
      isLoadingOnUpdate: false,
      accounts,
      currencyCache,
      // accounts: (accounts || []).map((account) => ({
      //   ...account,
      //   group: groupsCache ? groupsCache[account.group] || account.group : account.group,
      // })),
      // groupsCache,
    });
    // console.debug('Loaded the data', portfolios);
  };

  loadPortfolioData(options) {
    console.debug('Loading portfolio data.');
    const query = {
      from: options.dateRangeFilter && options.dateRangeFilter[0],
      to: options.dateRangeFilter && options.dateRangeFilter[1],
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
      assets: true,
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
      assets: true,
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
    const fromDate = options.dateRangeFilter && options.dateRangeFilter[0];
    const query = {
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

  loadStaticPortfolioData() {
    // const groupsCache = parseGroupNameByIdReponse(GROUPS_API_RESPONSE);
    const currencyCache = parseCurrencyReponse(CURRENCIES_API_RESPONSE);
    const portfolioByDate = parsePortfolioResponse(PORTFOLIO_API_RESPONSE);
    const positions = parsePositionsResponse(POSITIONS_API_RESPONSE);
    const accounts = parseInstitutionsResponse(INSTITUTIONS_DATA);

    // console.debug('Positions:', positions);
    this.computePositions(positions, TRANSACTIONS_API_RESPONSE, currencyCache);
    this.computePortfolios(portfolioByDate, TRANSACTIONS_API_RESPONSE, accounts, currencyCache);
    console.debug('State:', this.state);
  }

  componentDidMount() {
    if (!this.state.addon) {
      setTimeout(() => this.loadStaticPortfolioData(), 0);
    } else if (window.analytics) {
      window.analytics.page();
    }
  }

  render() {
    return (
      <div style={{ padding: this.state.addon ? 0 : 12, paddingTop: 4, paddingBottom: 4 }}>
        {this.state.isLoaded ? (
          <>
            {!this.state.addon && (
              <>
                <p style={{ fontWeight: 'bolder', textAlign: 'center', color: '#C00316', textDecoration: 'underline' }}>
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
            <StickyContainer>
              <Tabs
                onChange={(tab) => {
                  window.scrollTo({
                    top: 0,
                    left: 0,
                    behavior: 'smooth',
                  });
                  trackEvent('tab-change', { tab });
                }}
                size="large"
                renderTabBar={renderTabBar}
              >
                <Tabs.TabPane tab="P&L Charts" key="pnl">
                  <PnLStatistics portfolios={this.state.portfolios} privateMode={this.state.privateMode} />

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

                <Tabs.TabPane tab="Holdings Analyzer" key="holdings">
                  <HoldingsCharts
                    positions={this.state.positions}
                    accounts={this.state.accounts}
                    isPrivateMode={this.state.privateMode}
                    addon={this.state.addon}
                  />
                </Tabs.TabPane>

                <Tabs.TabPane tab="Gainers/Losers" key="gainers-losers">
                  <TopGainersLosers positions={this.state.positions} isPrivateMode={this.state.privateMode} />
                </Tabs.TabPane>
              </Tabs>
            </StickyContainer>
          </>
        ) : (
          <Flex justifyContent="center" width={1}>
            <Spin size="large" />
          </Flex>
        )}

        <Typography.Title level={4} type="secondary">
          Disclaimer
        </Typography.Title>
        <Text type="secondary">
          This tool is simply a calculator of profit and loss using the deposits/withdrawals and daily portfolio values.
          Results provided by this tool do not constitute investment advice. The makers of this tool are not responsible
          for the consequences of any decisions or actions taken in reliance upon or as a result of the information
          provided by this tool. The information on the add-on may contain errors or inaccuracies. The use of the add-on
          is at your own risk and is provided without any warranty.
          <br />
          <br />
          Please trade responsibly. Contact the developer at k.elayamani@gmail.com
        </Text>
        <br />
        <hr />
      </div>
    );
  }
}

export default App;
