import { Addon } from '@wealthica/wealthica.js/index';
import _ from 'lodash';
import moment, { Moment } from 'moment';
import React, { Component } from 'react';
import Loader from 'react-loader-spinner';
import {
  parseCurrencyReponse,
  parseInstitutionsResponse,
  parsePortfolioResponse,
  parsePositionsResponse,
  parseSecurityTransactionsResponse,
  parseTransactionsResponse,
} from './api';
import './App.css';
import './Collapsible.css';
import DepositVsPortfolioValueTimeline from './components/DepositsVsPortfolioValueTimeline';
import HoldingsCharts from './components/HoldingsCharts';
import ProfitLossPercentageTimeline from './components/ProfitLossPercentageTimeline';
import ProfitLossTimeline from './components/ProfitLossTimeline';
import { TRANSACTIONS_FROM_DATE } from './constants';
import { CURRENCIES_API_RESPONSE } from './mocks/currencies';
import { INSTITUTIONS_DATA } from './mocks/institutions';
import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio';
import { POSITIONS_API_RESPONSE } from './mocks/positions';
import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions';
// import {
//   INSTITUTIONS_DATA,
//   PORTFOLIO_API_RESPONSE,
//   POSITIONS_API_RESPONSE,
//   TRANSACTIONS_API_RESPONSE,
// } from './mocks/prod';
import { Account, Portfolio, PortfolioData, Position } from './types';
import { getDate, getSymbol } from './utils';
import { Flex } from 'rebass';

type State = {
  addon: any;
  currencyCache: { [key: string]: number };
  portfolioPerDay: { [key: string]: PortfolioData };
  portfolios: Portfolio[];
  positions: Position[];
  accounts: Account[];
  isLoaded: boolean;
  privateMode: boolean;
  firstTransactionDate?: Moment;
  options?: any;
  isLoadingOnUpdate?: boolean;
};
type Props = {};

class App extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      addon: this.getAddon(),
      currencyCache: {},
      portfolioPerDay: {},
      portfolios: [],
      positions: [],
      accounts: [],
      isLoaded: false,
      privateMode: false,
    };
  }

  getAddon = (): any => {
    try {
      const addon = new Addon({});

      addon.on('init', options => {
        console.debug('Addon initialization', options);
        this.load(options);
      });

      addon.on('reload', () => {
        // Start reloading
        console.debug('Reload invoked!');
      });

      addon.on('update', options => {
        // Update according to the received options
        console.debug('Addon update - options: ', options);
        this.setState({ isLoadingOnUpdate: true });
        this.load(options);
      });

      return addon;
    } catch (error) {
      console.warn('Falied to load the addon -- ', error);
    }

    return null;
  };

  async loadCurrenciesCache() {
    if (Object.keys(this.state.currencyCache).length) {
      console.debug('Skip re-loading currency cache.');
      return;
    }
    console.debug('Loading currencies data.');
    await this.state.addon
      .request({
        method: 'GET',
        endpoint: 'currencies/usd/history',
        query: {
          base: 'cad',
        },
      })
      .then(response => {
        const currencyCache = parseCurrencyReponse(response);
        console.debug('Currency cache: ', currencyCache);
        this.setState({ currencyCache });
      })
      .catch(error => {
        console.error('Failed to load currency data.', error);
      });
  }

  load = _.debounce(
    (options: any) => {
      this.loadData(options);
    },
    250,
    { leading: true },
  );

  mergeOptions(options) {
    if (!this.state.options) {
      this.setState({ options });
    }
    const oldOptions = this.state.options;
    Object.keys(options).forEach(key => {
      oldOptions[key] = options[key];
    });
    this.setState({ options: oldOptions });
  }

  async loadData(options) {
    await this.loadCurrenciesCache();
    this.mergeOptions(options);

    const positions = await this.loadPositions(this.state.options);
    this.setState({ privateMode: this.state.options.privateMode });

    const portfolioByDate = await this.loadPortfolioData(this.state.options);
    const transactions = await this.loadTransactions(this.state.options);
    const accounts = await this.loadInstitutionsData(this.state.options);

    this.computePositions(positions, transactions);
    this.computePortfolios(portfolioByDate, transactions, accounts);
  }

  computePositions(positions, transactions) {
    const securityTransactions = parseSecurityTransactionsResponse(transactions, this.state.currencyCache);
    const securityTransactionsBySymbol = securityTransactions.reduce((hash, transaction) => {
      if (!hash[transaction.symbol]) {
        hash[transaction.symbol] = [];
      }
      hash[transaction.symbol].push(transaction);
      return hash;
    }, {});

    positions.forEach(position => {
      position.transactions = securityTransactionsBySymbol[getSymbol(position.security)] || [];
    });

    this.setState({
      positions,
      firstTransactionDate: getDate(!!transactions && transactions.length ? transactions[0].date : undefined),
    });
  }

  computePortfolios = (portfolioByDate, transactions, accounts) => {
    const transactionsByDate = parseTransactionsResponse(transactions, this.state.currencyCache, accounts);
    console.debug('Transactions by date: ', transactionsByDate);

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
      .filter(date => date < sortedDates[0])
      .reduce((totalDeposits, date) => {
        const transaction = transactionsByDate[date];
        totalDeposits += transaction.deposit - transaction.withdrawal;
        return totalDeposits;
      }, 0);

    sortedDates.forEach(date => {
      const portfolio = portfolioPerDay[date];
      deposits += portfolio.deposit - portfolio.withdrawal;
      if (moment(date).isoWeekday() <= 5) {
        portfolios.push({
          date: date,
          value: portfolio.value,
          deposits: deposits,
        });
      }
    });

    this.setState({ portfolios, portfolioPerDay, isLoaded: true, accounts });
    console.debug('Loaded the data', portfolios);
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
      .then(response => {
        const portfolio = parsePortfolioResponse(response);
        console.debug('Portfolio data: ', portfolio);
        return portfolio;
      })
      .catch(error => {
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
      .then(response => {
        const positions = parsePositionsResponse(response);
        console.debug('Positions data: ', positions);
        return positions;
      })
      .catch(error => {
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
      .then(response => {
        const accounts = parseInstitutionsResponse(
          response,
          options.groupsFilter ? options.groupsFilter.split(',') : [],
          options.institutionsFilter ? options.institutionsFilter.split(',') : [],
        );
        console.debug('Accounts data: ', accounts);
        return accounts;
      })
      .catch(error => {
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
      .then(response => response)
      .catch(error => {
        console.error('Failed to load transactions data.', error);
      });
  }

  loadStaticPortfolioData() {
    const currencyCache = parseCurrencyReponse(CURRENCIES_API_RESPONSE);
    const portfolioByDate = parsePortfolioResponse(PORTFOLIO_API_RESPONSE);
    const positions = parsePositionsResponse(POSITIONS_API_RESPONSE);
    const accounts = parseInstitutionsResponse(INSTITUTIONS_DATA);

    console.debug(positions);
    this.setState({ currencyCache });
    this.computePositions(positions, TRANSACTIONS_API_RESPONSE);
    this.computePortfolios(portfolioByDate, TRANSACTIONS_API_RESPONSE, accounts);
    console.debug(this.state);
  }

  componentDidMount() {
    if (!this.state.addon) {
      setTimeout(() => this.loadStaticPortfolioData(), 0);
    }
  }

  render() {
    return (
      <div style={{ paddingTop: 4, paddingBottom: 4 }}>
        {this.state.isLoaded ? (
          <>
            {!this.state.addon && (
              <>
                <p style={{ fontWeight: 'bolder', textAlign: 'center', color: '#C00316', textDecoration: 'underline' }}>
                  <img src="./favicon.png" width="50" height="50" style={{ backgroundColor: '#fff' }} />
                  !! This is sample data !!
                </p>
              </>
            )}

            {!this.state.isLoadingOnUpdate && (
              <Flex width={1} justifyContent="center" alignItems="center">
                <Loader type="ThreeDots" color="#7f3eab" height="75" width="75" />
              </Flex>
            )}
            <DepositVsPortfolioValueTimeline
              portfolios={this.state.portfolios}
              isPrivateMode={this.state.privateMode}
            />
            <ProfitLossPercentageTimeline portfolios={this.state.portfolios} isPrivateMode={this.state.privateMode} />
            <ProfitLossTimeline portfolios={this.state.portfolios} isPrivateMode={this.state.privateMode} />
            {!!this.state.positions.length && (
              <>
                <HoldingsCharts
                  positions={this.state.positions}
                  accounts={this.state.accounts}
                  isPrivateMode={this.state.privateMode}
                  addon={this.state.addon}
                />
                {/* <HoldingsTable positions={this.state.positions} isPrivateMode={this.state.privateMode} /> */}
              </>
            )}
          </>
        ) : (
          <div className="App-header">
            <Loader type="Circles" color="#7f3eab" height="75" width="75" />
          </div>
        )}
      </div>
    );
  }
}

export default App;
