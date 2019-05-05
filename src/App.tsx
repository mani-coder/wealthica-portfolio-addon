import React, { Component } from 'react';
import './App.css';
import './Collapsible.css';

import { Addon } from '@wealthica/wealthica.js/index';
import Loader from 'react-loader-spinner';
import moment from 'moment';

import {
  parseCurrencyReponse,
  parsePortfolioResponse,
  parseTransactionsResponse,
  parsePositionsResponse,
  parseInstitutionsResponse,
} from './api';
import { PortfolioData, Portfolio, Position, Account } from './types';
import { TRANSACTIONS_FROM_DATE } from './constants';
import { CURRENCIES_API_RESPONSE } from './mocks/currencies';
import { POSITIONS_API_RESPONSE } from './mocks/positions';
import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio';
import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions';
// import { POSITIONS_API_RESPONSE, PORTFOLIO_API_RESPONSE, TRANSACTIONS_API_RESPONSE } from './mocks/prod';

import DepositVsPortfolioValueTimeline from './components/DepositsVsPortfolioValueTimeline';
import ProfitLossTimeline from './components/ProfitLossTimeline';
import ProfitLossPercentageTimeline from './components/ProfitLossPercentageTimeline';
import HoldingsCharts from './components/HoldingsCharts';
import HoldingsTable from './components/HoldingsTable';
import { INSTITUITIONS_DATA } from './mocks/institutions';

type State = {
  addon: any;
  currencyCache: { [key: string]: number };
  portfolioPerDay: { [key: string]: PortfolioData };
  portfolios: Portfolio[];
  positions: Position[];
  accounts: Account[];
  isLoaded: boolean;
  privateMode: boolean;
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
        console.log('Addon initialization', options);
        this.loadData(options);
      });

      addon.on('reload', () => {
        // Start reloading
      });

      addon.on('update', (options: any) => {
        // Update according to the received options
        console.log('Addon update - options: ', options);
        this.loadData(options);
      });

      return addon;
    } catch (error) {
      console.log(error);
    }

    return null;
  };

  async loadCurrenciesCache() {
    if (Object.keys(this.state.currencyCache).length) {
      console.log('Skip re-loading currency cache.');
      return;
    }
    console.log('Loading currencies data.');
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
        console.log('Currency cache: ', currencyCache);
        this.setState({ currencyCache });
      })
      .catch(error => {
        console.error('Failed to load currency data.', error);
      });
  }

  async loadData(options) {
    await this.loadCurrenciesCache();

    this.loadPositions(options);
    this.setState({ privateMode: options.privateMode });

    const portfolioByDate = await this.loadPortfolioData(options);
    const transactionsByDate = await this.loadTransactions(options);
    const accounts = await this.loadInstitutionsData(options);

    this.computePortfolios(portfolioByDate, transactionsByDate, accounts);
  }

  computePortfolios = (portfolioByDate, transactionsByDate, accounts) => {
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
    console.log('Loaded the data', portfolios);
  };

  loadPortfolioData(options) {
    console.log('Loading portfolio data.');
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
        console.log('Portfolio data: ', portfolio);
        return portfolio;
      })
      .catch(error => {
        console.error('Failed to load portfolio data.', error);
      });
  }

  loadPositions(options) {
    console.log('Loading positions data.');
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
        console.log('Positions data: ', positions);
        this.setState({ positions });
      })
      .catch(error => {
        console.error('Failed to load position data.', error);
      });
  }

  loadInstitutionsData(options) {
    console.log('Loading institutions data..');
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
        const accounts = parseInstitutionsResponse(response);
        console.log('Accounts data: ', accounts);
        return accounts;
      })
      .catch(error => {
        console.error('Failed to load position data.', error);
      });
  }

  loadTransactions(options) {
    console.log('Loading transactions data.');
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
      .then(response => {
        const transactions = parseTransactionsResponse(response, this.state.currencyCache);
        console.log('Transactions data: ', transactions);
        return transactions;
      })
      .catch(error => {
        console.error('Failed to load transactions data.', error);
      });
  }

  loadStaticPortfolioData() {
    const currencyCache = parseCurrencyReponse(CURRENCIES_API_RESPONSE);
    const portfolioByDate = parsePortfolioResponse(PORTFOLIO_API_RESPONSE);
    const transactionsByDate = parseTransactionsResponse(TRANSACTIONS_API_RESPONSE, currencyCache);
    const positions = parsePositionsResponse(POSITIONS_API_RESPONSE);
    const accounts = parseInstitutionsResponse(INSTITUITIONS_DATA);

    console.log(positions);
    this.setState({ currencyCache, positions });
    this.computePortfolios(portfolioByDate, transactionsByDate, accounts);
    console.log(this.state);
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
              <p style={{ fontWeight: 'bolder', textAlign: 'center', color: '#C00316', textDecoration: 'underline' }}>
                !! This is sample data !!
              </p>
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
                />
                <HoldingsTable positions={this.state.positions} isPrivateMode={this.state.privateMode} />
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
