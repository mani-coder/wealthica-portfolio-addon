import React, { Component } from 'react';
import './App.css';
import './Collapsible.css';

import { Addon } from '@wealthica/wealthica.js/index';
import Loader from 'react-loader-spinner';
import Collapsible from 'react-collapsible';

import { parseCurrencyReponse, parsePortfolioResponse, parseTransactionsResponse, parsePositionsResponse } from './api';
import { PortfolioData, Portfolio, Position } from './types';
import { TRANSACTIONS_FROM_DATE } from './constants';
import { CURRENCIES_API_RESPONSE } from './mocks/currencies';
import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio';
import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions';
// import { PORTFOLIO_API_RESPONSE, TRANSACTIONS_API_RESPONSE } from './mocks/prod';

import DepositVsPortfolioValueTimeline from './charts/DepositsVsPortfolioValueTimeline';
import ProfitLossTimeline from './charts/ProfitLossTimeline';
import ProfitLossPercentageTimeline from './charts/ProfitLossPercentageTimeline';
import moment from 'moment';
import { POSITIONS_API_RESPONSE } from './mocks/positions';
import HoldingsCharts from './charts/HoldingsCharts';

type State = {
  addon: any;
  currencyCache: { [key: string]: number };
  portfolioPerDay: { [key: string]: PortfolioData };
  portfolios: Portfolio[];
  positions: Position[];
  isLoaded: boolean;
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
      isLoaded: false,
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

    const portfolioByDate = await this.loadPortfolioData(options);
    const transactionsByDate = await this.loadTransactions(options);

    this.computePortfolios(portfolioByDate, transactionsByDate);
  }

  computePortfolios = (portfolioByDate, transactionsByDate) => {
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

    sortedDates
      .filter(date => moment(date).isoWeekday() <= 5)
      .forEach(date => {
        const portfolio = portfolioPerDay[date];
        deposits += portfolio.deposit - portfolio.withdrawal;
        portfolios.push({
          date: date,
          value: portfolio.value,
          deposits: deposits,
        });
      });

    this.setState({ portfolios, portfolioPerDay, isLoaded: true });
    console.log('Loaded the data', portfolios);
  };

  async loadPortfolioAndTransactions(options) {
    return {
      portfolio: this.loadPortfolioData(options),
      transactions: this.loadTransactions(options),
    };
  }

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

    console.log(positions);
    this.setState({ currencyCache, positions });
    this.computePortfolios(portfolioByDate, transactionsByDate);
  }

  componentDidMount() {
    if (!this.state.addon) {
      setTimeout(() => this.loadStaticPortfolioData(), 100);
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
            <Collapsible trigger="Deposits Vs Portfolio Value Timeline" open>
              <DepositVsPortfolioValueTimeline portfolios={this.state.portfolios} />
            </Collapsible>
            <Collapsible trigger="P/L Percentage Timeline" open>
              <ProfitLossPercentageTimeline portfolios={this.state.portfolios} />
            </Collapsible>
            <Collapsible trigger="P/L Timeline" open>
              <ProfitLossTimeline portfolios={this.state.portfolios} />
            </Collapsible>
            {!!this.state.positions.length && (
              <Collapsible trigger="Holdings" open>
                <HoldingsCharts positions={this.state.positions} />
              </Collapsible>
            )}
          </>
        ) : (
          <div className="App-header">
            <Loader type="Circles" color="#a04ba5" height="75" width="75" />
          </div>
        )}
      </div>
    );
  }
}

export default App;
