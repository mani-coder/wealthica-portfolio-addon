import { Addon } from '@wealthica/wealthica.js/index';
import Typography from 'antd/es/typography';
import Text from 'antd/es/typography/Text';
import _ from 'lodash';
import moment, { Moment } from 'moment';
import React, { useEffect, useState } from 'react';
import Loader from 'react-loader-spinner';
import { Flex } from 'rebass';
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
import YoYPnLChart from './components/YoYPnLChart';
import { TRANSACTIONS_FROM_DATE } from './constants';
// import { CURRENCIES_API_RESPONSE } from './mocks/currencies';
// import { INSTITUTIONS_DATA } from './mocks/institutions';
// import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio';
// import { POSITIONS_API_RESPONSE } from './mocks/positions';
// import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions';
import { CURRENCIES_API_RESPONSE } from './mocks/currencies-prod';
import { INSTITUTIONS_DATA } from './mocks/institutions-prod';
import { PORTFOLIO_API_RESPONSE } from './mocks/portfolio-prod';
import { POSITIONS_API_RESPONSE } from './mocks/positions-prod';
import { TRANSACTIONS_API_RESPONSE } from './mocks/transactions-prod';
import { Account, Portfolio, Position } from './types';
import { getDate, getSymbol } from './utils';

type State = {
  firstTransactionDate?: Moment;
  options?: any;
  isLoadingOnUpdate?: boolean;
};

const App = () => {
  const [currencyCache, setCurrencyCache] = useState<{ [key: string]: number }>({});
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoaded, setLoaded] = useState<boolean>(false);

  const [state, setState] = useState<State>({});
  const privateMode = !!(state.options && state.options.privateMode);

  function getAddon(): any {
    try {
      const addon = new Addon({});

      addon.on('init', (options) => {
        console.debug('Addon initialization', options);
        load(options);
      });

      addon.on('reload', () => {
        // Start reloading
        console.debug('Reload invoked!');
      });

      addon.on('update', (options) => {
        // Update according to the received options
        console.debug('Addon update - options: ', options);
        setState({ ...state, isLoadingOnUpdate: true });
        load(options);
      });

      return addon;
    } catch (error) {
      console.warn('Falied to load the addon -- ', error);
    }

    return null;
  }
  const addon = getAddon();

  async function loadCurrenciesCache() {
    if (Object.keys(currencyCache).length) {
      console.debug('Skip re-loading currency cache.');
      return;
    }

    console.debug('Loading currencies data.');
    await addon
      .request({
        method: 'GET',
        endpoint: 'currencies/usd/history',
        query: {
          base: 'cad',
        },
      })
      .then((response) => {
        const _currencyCache = parseCurrencyReponse(response);
        console.debug('Currency cache: ', _currencyCache);
        setCurrencyCache(_currencyCache);
      })
      .catch((error) => {
        console.error('Failed to load currency data.', error);
      });
  }

  const load = _.debounce(
    (options: any) => {
      loadData(options);
    },
    250,
    { leading: true },
  );

  function mergeOptions(options) {
    if (!state.options) {
      setState({ ...state, options });
    }
    const oldOptions = state.options;
    Object.keys(options).forEach((key) => {
      oldOptions[key] = options[key];
    });
    setState({ ...state, options: oldOptions });
  }

  async function loadData(options) {
    await loadCurrenciesCache();
    mergeOptions(options);

    const positions = await loadPositions(state.options);

    const portfolioByDate = await loadPortfolioData(state.options);
    const transactions = await loadTransactions(state.options);
    const accounts = await loadInstitutionsData(state.options);

    // console.debug('Transactions', transactions);
    computePositions(positions, transactions);
    computePortfolios(portfolioByDate, transactions, accounts);
  }

  function computePositions(positions, transactions) {
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

    setPositions(positions);
    setState({
      ...state,
      firstTransactionDate: getDate(!!transactions && transactions.length ? transactions[0].date : undefined),
    });
  }

  function computePortfolios(portfolioByDate, transactions, accounts) {
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
      if (moment(date).isoWeekday() <= 5) {
        portfolios.push({
          date: date,
          value: portfolio.value,
          deposits: deposits,
        });
      }
    });

    setPortfolios(portfolios);
    // setPortfolioPerDay(portfolioPerDay);
    setLoaded(true);
    setAccounts(accounts);

    setState({ ...state, isLoadingOnUpdate: false });
    // console.debug('Loaded the data', portfolios);
  }

  function loadPortfolioData(options) {
    console.debug('Loading portfolio data.');
    const query = {
      from: options.dateRangeFilter && options.dateRangeFilter[0],
      to: options.dateRangeFilter && options.dateRangeFilter[1],
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return addon
      .request({
        query,
        method: 'GET',
        endpoint: 'portfolio',
      })
      .then((response) => {
        const portfolio = parsePortfolioResponse(response);
        console.debug('Portfolio data: ', portfolio);
        return portfolio;
      })
      .catch((error) => {
        console.error('Failed to load portfolio data.', error);
      });
  }

  function loadPositions(options) {
    console.debug('Loading positions data.');
    const query = {
      assets: true,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return addon
      .request({
        query,
        method: 'GET',
        endpoint: 'positions',
      })
      .then((response) => {
        const positions = parsePositionsResponse(response);
        console.debug('Positions data: ', positions);
        return positions;
      })
      .catch((error) => {
        console.error('Failed to load position data.', error);
      });
  }

  function loadInstitutionsData(options) {
    console.debug('Loading institutions data..');
    const query = {
      assets: true,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return addon
      .request({
        query,
        method: 'GET',
        endpoint: 'institutions',
      })
      .then((response) => {
        const accounts = parseInstitutionsResponse(
          response,
          options.groupsFilter ? options.groupsFilter.split(',') : [],
          options.institutionsFilter ? options.institutionsFilter.split(',') : [],
        );
        console.debug('Accounts data: ', accounts);
        return accounts;
      })
      .catch((error) => {
        console.error('Failed to load institutions data.', error);
      });
  }

  function loadTransactions(options) {
    console.debug('Loading transactions data.');
    const fromDate = options.dateRangeFilter && options.dateRangeFilter[0];
    const query = {
      from: fromDate && fromDate < TRANSACTIONS_FROM_DATE ? fromDate : TRANSACTIONS_FROM_DATE,
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments: options.investmentsFilter === 'all' ? null : options.investmentsFilter,
    };
    return addon
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

  function loadStaticPortfolioData() {
    const currencyCache = parseCurrencyReponse(CURRENCIES_API_RESPONSE);
    const portfolioByDate = parsePortfolioResponse(PORTFOLIO_API_RESPONSE);
    const positions = parsePositionsResponse(POSITIONS_API_RESPONSE);
    const accounts = parseInstitutionsResponse(INSTITUTIONS_DATA);

    // console.debug('Positions:', positions);
    setCurrencyCache(currencyCache);
    computePositions(positions, TRANSACTIONS_API_RESPONSE);
    computePortfolios(portfolioByDate, TRANSACTIONS_API_RESPONSE, accounts);
  }

  useEffect(() => {
    if (!addon) {
      setTimeout(() => loadStaticPortfolioData(), 0);
    }
  }, []);

  // console.debug('State:', state);

  return (
    <div style={{ paddingTop: 4, paddingBottom: 4 }}>
      {isLoaded ? (
        <>
          {!addon && (
            <>
              <p style={{ fontWeight: 'bolder', textAlign: 'center', color: '#C00316', textDecoration: 'underline' }}>
                <img src="./favicon.png" alt="favicon" width="50" height="50" style={{ backgroundColor: '#fff' }} />
                !! This is sample data !!
              </p>
            </>
          )}

          {state.isLoadingOnUpdate && (
            <Flex width={1} justifyContent="center" alignItems="center">
              <Loader type="ThreeDots" color="#7f3eab" height="30" width="75" />
            </Flex>
          )}
          <DepositVsPortfolioValueTimeline portfolios={portfolios} isPrivateMode={privateMode} />
          <ProfitLossPercentageTimeline portfolios={portfolios} isPrivateMode={privateMode} />
          <ProfitLossTimeline portfolios={portfolios} isPrivateMode={privateMode} />
          <YoYPnLChart portfolios={portfolios} isPrivateMode={privateMode} />

          {!!positions.length && (
            <>
              <HoldingsCharts positions={positions} accounts={accounts} isPrivateMode={privateMode} addon={addon} />

              {/* {process.env.NODE_ENV === 'development' && <Earnings positions={state.positions} />} */}

              {/* <HoldingsTable positions={state.positions} isPrivateMode={state.privateMode} /> */}
            </>
          )}
        </>
      ) : (
        <div className="App-header">
          <Loader type="Circles" color="#7f3eab" height="75" width="75" />
        </div>
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
        Please trade responsibly. Contact the developer at{' '}
        <a href="mailto:k.elayamani@gmail.com">k.elayamani@gmail.com</a>
      </Text>
      <br />
      <hr />
    </div>
  );
};

export default App;
