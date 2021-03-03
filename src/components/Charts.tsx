// import HC_exporting from 'highcharts/modules/exporting';
// import HC_ExportData from 'highcharts/modules/export-data';
// import HC_DrillDown from 'highcharts/modules/drilldown';
import HighchartsReact from 'highcharts-react-official';
import * as Highcharts from 'highcharts/highstock';
import React, { Component } from 'react';

// HC_exporting(Highcharts);
// HC_ExportData(Highcharts);
// HC_DrillDown(Highcharts);

type Props = {
  options: Highcharts.Options;
  constructorType?: keyof typeof Highcharts;
};

export default class Charts extends Component<Props> {
  render() {
    try {
      const options = this.props.options;
      return (
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={this.props.constructorType}
          options={options}
          oneToOne={true}
        />
      );
    } catch {
      console.debug('Failed to load high charts...');
    }
  }
}
