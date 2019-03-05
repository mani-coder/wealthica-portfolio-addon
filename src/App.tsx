import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";

import { Addon } from "@wealthica/wealthica.js/index";
import {
  parseCurrencyReponse,
  parsePortfolioResponse,
  parseTransactionsResponse
} from "./api";
import { PortfolioData, Portfolio } from "./types";

type State = {
  addon: any;
  currencyCache: { [key: string]: number };
  portfolioPerDay: { [key: string]: PortfolioData };
  portfolios: Portfolio[];
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
      isLoaded: false
    };
  }

  getAddon = (): any => {
    try {
      const addon = new Addon({});

      addon.on("init", options => {
        console.log("Addon initialization", options);
        this.loadData(options);
      });

      addon.on("reload", () => {
        // Start reloading
      });

      addon.on("update", (options: any) => {
        // Update according to the received options
        console.log("Addon update - options: ", options);
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
      console.log("Skip re-loading currency cache.");
      return;
    }
    console.log("Loading currencies data.");
    await this.state.addon
      .request({
        method: "GET",
        endpoint: "currencies/usd/history",
        query: {
          base: "cad"
        }
      })
      .then(response => {
        const currencyCache = parseCurrencyReponse(response);
        console.log("Currency cache: ", currencyCache);
        this.setState({ currencyCache });
      })
      .catch(error => {
        console.error("Failed to load currency data.", error);
      });
  }

  async loadData(options) {
    await this.loadCurrenciesCache();

    const portfolioByDate = await this.loadPortfolioData(options);
    const transactionsByDate = await this.loadTransactions(options);

    const portfolioPerDay = Object.keys(portfolioByDate).reduce(
      (hash, date) => {
        const data = transactionsByDate[date] || {};
        hash[date] = {
          value: portfolioByDate[date],
          deposit: data.deposit || 0,
          withdrawal: data.withdrawal || 0,
          income: data.income || 0,
          interest: data.interest || 0
        };
        return hash;
      },
      {}
    );

    const portfolios: Portfolio[] = [];

    const sortedDates = Object.keys(portfolioPerDay).sort();
    let deposits = Object.keys(transactionsByDate)
      .filter(date => date < sortedDates[0])
      .reduce((totalDeposits, date) => {
        const transaction = transactionsByDate[date];
        totalDeposits += transaction.deposit + transaction.withdrawal;
        return totalDeposits;
      }, 0);

    sortedDates.forEach(date => {
      const portfolio = portfolioPerDay[date];
      deposits += portfolio.deposit - portfolio.withdrawal;
      portfolios.push({
        date: date,
        value: portfolio.value,
        deposits: deposits
      });
    });

    this.setState({ portfolios, portfolioPerDay, isLoaded: true });
    console.log("Loaded the data", portfolios);
  }

  async loadPortfolioAndTransactions(options) {
    return {
      portfolio: this.loadPortfolioData(options),
      transactions: this.loadTransactions(options)
    };
  }

  loadPortfolioData(options) {
    console.log("Loading portfolio data.");
    const query = {
      from: options.dateRangeFilter && options.dateRangeFilter[0],
      to: options.dateRangeFilter && options.dateRangeFilter[1],
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments:
        options.investmentsFilter === "all" ? null : options.investmentsFilter
    };
    return this.state.addon
      .request({
        query,
        method: "GET",
        endpoint: "portfolio"
      })
      .then(response => {
        const portfolio = parsePortfolioResponse(response);
        console.log("Portfolio data: ", portfolio);
        return portfolio;
      })
      .catch(error => {
        console.error("Failed to load portfolio data.", error);
      });
  }

  loadTransactions(options) {
    console.log("Loading transactions data.");
    const query = {
      groups: options.groupsFilter,
      institutions: options.institutionsFilter,
      investments:
        options.investmentsFilter === "all" ? null : options.investmentsFilter
    };
    return this.state.addon
      .request({
        query,
        method: "GET",
        endpoint: "transactions"
      })
      .then(response => {
        const transactions = parseTransactionsResponse(
          response,
          this.state.currencyCache
        );
        console.log("Transactions data: ", transactions);
        return transactions;
      })
      .catch(error => {
        console.error("Failed to load transactions data.", error);
      });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>Wealthica React Portfolio add using highcharts.</p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
