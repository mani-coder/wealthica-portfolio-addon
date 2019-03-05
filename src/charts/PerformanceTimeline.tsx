import React, { Component } from "react";
import { Portfolio } from "../types";
import Highcharts from "highcharts/highstock";
import HighchartsReact from "highcharts-react-official";
import moment from "moment";

type Props = {
  portfolios: Portfolio[];
};

export default class PerformanceTimeline extends Component<Props> {
  getSeries() {
    return [
      {
        name: "Performance",
        data: this.props.portfolios.map(portfolio => [
          moment(portfolio.date).valueOf(),
          portfolio.value - portfolio.deposits
        ]),
        tooltip: {
          valueDecimals: 2
        }
      }
    ];
  }
  getOptions() {
    return {
      title: {
        text: "Performance"
      },
      rangeSelector: {
        selected: 5
      },
      yAxis: {
        labels: {
          // formatter: function(value) {
          //   return (value > 0 ? " + " : "") + value + "%";
          // }
        },

        opposite: false,
        plotLines: [
          {
            value: 0,
            width: 2,
            color: "silver"
          }
        ]
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
