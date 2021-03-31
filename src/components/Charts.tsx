// import HC_exporting from 'highcharts/modules/exporting';
// import HC_ExportData from 'highcharts/modules/export-data';
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
  try {
    const options = props.options;
    return !!options.series && !!options.series.length ? (
      <HighchartsReact
        highcharts={Highcharts}
        constructorType={props.constructorType}
        options={options}
        oneToOne={true}
      />
    ) : (
      <></>
    );
  } catch {
    console.debug('Failed to load high charts...');
    return <></>;
  }
  return <></>;
}

export default React.memo(Charts);
