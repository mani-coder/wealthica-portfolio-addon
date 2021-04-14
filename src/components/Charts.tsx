// import HC_exporting from 'highcharts/modules/exporting';
// import HC_ExportData from 'highcharts/modules/export-data';
import ErrorBoundary from 'antd/lib/alert/ErrorBoundary';
import HighchartsReact from 'highcharts-react-official';
import * as Highcharts from 'highcharts/highstock';
import HC_DrillDown from 'highcharts/modules/drilldown';
import React from 'react';

// HC_exporting(Highcharts);
// HC_ExportData(Highcharts);
HC_DrillDown(Highcharts);

type Props = {
  options: Highcharts.Options;
  constructorType?: keyof typeof Highcharts;
};

export function Charts(props: Props) {
  const options = props.options;
  return !!options.series && !!options.series.length ? (
    <ErrorBoundary message="Failed to load the chart!">
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={props.constructorType}
        options={options}
        oneToOne={true}
      />
    </ErrorBoundary>
  ) : (
    <></>
  );
}

export default React.memo(Charts);
