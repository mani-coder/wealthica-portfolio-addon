import React, { Component } from "react";
import { Portfolio } from "../types";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import moment from "moment";

type Props = {
  portfolios: Portfolio[];
};

export default class DepositVsPortfolioValueTimeline extends Component<Props> {
  getSeries() {
    return [
      {
        name: "Portfolio",
        data: this.props.portfolios.map(portfolio => [
          moment(portfolio.date).valueOf(),
          portfolio.value
        ])
      },
      {
        name: "Deposits",
        data: this.props.portfolios.map(portfolio => [
          moment(portfolio.date).valueOf(),
          portfolio.deposits
        ])
      }
    ];
  }
  getOptions() {
    return {
      title: {
        text: "Deposits Vs Portfolio Value"
      },
      rangeSelector: {
        selected: 5
      },
      yAxis: {
        opposite: false,
        title: {
          text: "Dollars ($)"
        },
        plotLines: [
          {
            value: 0,
            width: 2,
            color: "silver"
          }
        ]
      },
      plotOptions: {},
      tooltip: {
        pointFormat:
          '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b><br/>',
        valueDecimals: 2,
        split: true
      },

      series: this.getSeries()
    };
  }

  render() {
    return (
      <div style={{ padding: 4 }}>
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={"stockChart"}
          options={this.getOptions()}
        />
      </div>
    );
  }
}
