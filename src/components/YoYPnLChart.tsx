/* eslint-disable react/jsx-no-target-blank */
/* eslint-disable react-hooks/exhaustive-deps */
import Alert from 'antd/lib/alert';
import moment, { Moment } from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { Portfolio } from '../types';
import { formatCurrency, getLocalCache, getPreviousWeekday, setLocalCache } from '../utils';
import Charts from './Charts';
import Collapsible from './Collapsible';

type Props = {
  portfolios: Portfolio[];
  isPrivateMode: boolean;
};

const DATE_DISPLAY_FORMAT = 'MMM DD, YYYY';
const PNL_WIDGET_OOKIE_NAME = '__pnl_widget_notification__';

function YoYPnLChart(props: Props) {
  const [showPnLWidgetInfo, setShowPnLWidgetInfo] = useState(false);
  useEffect(() => {
    setShowPnLWidgetInfo(!getLocalCache(PNL_WIDGET_OOKIE_NAME));
  }, []);

  const portfoliosByDate = props.portfolios.reduce((hash, portfolio) => {
    hash[portfolio.date] = portfolio;
    return hash;
  }, {});

  const getOptions = ({ series }: { series: any }): Highcharts.Options => {
    return {
      series,

      tooltip: {
        outside: true,

        useHTML: true,
        backgroundColor: '#FFF',
        style: {
          color: '#1F2A33',
        },
      },

      title: {
        text: 'P&L % Change Over Multiple Time Periods',
      },
      subtitle: {
        text:
          'This chart shows how your portfolio had performed in multiple time slices. This chart is inspired based on YoY growth. You might want to see the change in your P&L in the last few days, weeks, months, years etc.,',
        style: {
          color: '#1F2A33',
        },
      },
      xAxis: {
        type: 'category',
        labels: {
          // rotation: -45,
          style: {
            fontSize: '13px',
            fontFamily: 'Verdana, sans-serif',
          },
        },
      },

      yAxis: {
        labels: {
          enabled: !props.isPrivateMode,
        },
        title: {
          text: 'P&L Change (%)',
        },
      },

      plotOptions: {
        column: {
          zones: [
            {
              value: -0.00000001,
              color: '#FF897C',
            },
            {
              color: '#84C341',
            },
          ],
        },
      },
    };
  };

  const getNearestPortfolioDate = (date: string): Portfolio | undefined => {
    return portfoliosByDate[date];
  };

  const getData = () => {
    let currentPortfolio = props.portfolios[props.portfolios.length - 1];
    const currentDate = moment().utc();
    if (
      currentDate.format('YYYY-MM-DD') === currentPortfolio.date &&
      currentDate.hour() < 20 &&
      props.portfolios.length > 1
    ) {
      currentPortfolio = props.portfolios[props.portfolios.length - 2];
    }
    if (moment(currentPortfolio.date).isoWeekday() > 5) {
      const weekday = getPreviousWeekday(currentPortfolio.date).format('YYYY-MM-DD');
      currentPortfolio = portfoliosByDate[weekday];
    }

    const lastDate = currentPortfolio.date;

    const portfolioKeys = new Set();
    const portfolioValues: {
      id: string;
      label: string;
      date: Moment;
      startPortfolio: Portfolio;
      endPortfolio: Portfolio;
    }[] = [];

    [
      { id: '1D', label: '1 Day', date: getPreviousWeekday(lastDate) },
      { id: '1W', label: '1 Week', date: moment(lastDate).subtract(1, 'weeks') },
      { id: '1M', label: '1 Month', date: moment(lastDate).subtract(1, 'months').add(1, 'days') },
      { id: '3M', label: '3 Months', date: moment(lastDate).subtract(3, 'months').add(1, 'days') },
      { id: '6M', label: '6 Months', date: moment(lastDate).subtract(6, 'months').add(1, 'days') },
      { id: '1Y', label: '1 Year', date: moment(lastDate).subtract(1, 'years').add(1, 'days') },
      { id: '2Y', label: '2 Years', date: moment(lastDate).subtract(2, 'years').add(1, 'days') },
      { id: '3Y', label: '3 Years', date: moment(lastDate).subtract(3, 'years').add(1, 'days') },
      { id: '5Y', label: '5 Years', date: moment(lastDate).subtract(5, 'years').add(1, 'days') },
      { id: 'MTD', label: 'Month To Date', date: moment(lastDate).startOf('month') },
      { id: 'WTD', label: 'Week To Date', date: moment(lastDate).startOf('week') },
      { id: 'YTD', label: 'Year To Date', date: moment(lastDate).startOf('year') },
    ].map((value) => {
      const portfolio = getNearestPortfolioDate(value.date.format('YYYY-MM-DD'));
      if (portfolio) {
        const key = `${portfolio.date}-${currentPortfolio.date}`;
        if (!portfolioKeys.has(key)) {
          portfolioValues.push({
            id: value.id,
            label: value.label,
            date: value.date,
            startPortfolio: portfolio,
            endPortfolio: currentPortfolio,
          });
          portfolioKeys.add(key);
        }
      }
      return null;
    });

    [1, 2, 3, 4].forEach((value) => {
      const year = moment(lastDate).subtract(value, 'years').year();
      const startDate = moment().year(year).month('Jan').startOf('month');
      const startPortfolio = getNearestPortfolioDate(startDate.format('YYYY-MM-DD'));
      const endPortfolio = getNearestPortfolioDate(
        moment().year(year).month('Dec').endOf('month').format('YYYY-MM-DD'),
      );

      if (startPortfolio && endPortfolio) {
        const key = `${startPortfolio.date}-${endPortfolio.date}`;
        if (!portfolioKeys.has(key)) {
          portfolioValues.push({
            id: `FY ${year}`,
            label: `Jan - Dec ${year}`,
            date: startDate,
            startPortfolio,
            endPortfolio,
          });
          portfolioKeys.add(key);
        }
      }
    });

    const data = portfolioValues
      .filter((value) => value.endPortfolio.date !== value.startPortfolio.date)
      .sort((a, b) => (a.date.valueOf() > b.date.valueOf() ? 1 : -1))
      .map((value) => {
        const startPnl = value.startPortfolio.value - value.startPortfolio.deposits;
        const endPnl = value.endPortfolio.value - value.endPortfolio.deposits;

        const startRatio = (startPnl / value.startPortfolio.deposits) * 100;
        const endRatio = (endPnl / value.endPortfolio.deposits) * 100;

        const changeValue = endPnl - startPnl;
        const changeRatio = endRatio - startRatio;

        return {
          id: value.id,
          label: value.label,
          date: value.date.format(DATE_DISPLAY_FORMAT),
          startDate: moment(value.startPortfolio.date).format(DATE_DISPLAY_FORMAT),
          endDate: moment(value.endPortfolio.date).format(DATE_DISPLAY_FORMAT),
          startPnl,
          startRatio,
          endPnl,
          endRatio,
          changeRatio,
          changeValue,
          color: changeRatio >= 0 ? 'green' : 'red',
        };
      });

    console.debug('PnL change data -- ', data);

    const series: Highcharts.SeriesColumnOptions[] = [
      {
        name: 'PnL Change %',
        type: 'column',
        data: data.map((value) => ({
          key: value.id,
          name: value.id,
          label: value.label,
          y: value.changeRatio,

          startDate: value.startDate,
          startPnl: !props.isPrivateMode ? formatCurrency(value.startPnl, 2) : '-',
          startRatio: value.startRatio,

          endDate: value.endDate,
          endPnl: !props.isPrivateMode ? formatCurrency(value.endPnl, 2) : '-',
          endRatio: value.endRatio,

          changeValue: !props.isPrivateMode ? `$${formatCurrency(value.changeValue, 1)}` : '-',
        })),
        point: {
          events: {
            mouseOver: (e: any) => {
              trackEvent('mouse-over-point', {
                chart: 'pnl-change-over-periods',
                name: e && e.target ? e.target.key : null,
              });
            },
          },
        },
        tooltip: {
          headerFormat: '',
          pointFormat: `<b style="font-size: 13px;">{point.label} ({point.key})</b><br /><b style="color: {point.color};font-size: 14px;">{point.y:.1f}% ({point.changeValue})</b><br /><hr />
            {point.startDate}: <b>{point.startRatio:.2f}%</b> (\${point.startPnl})<br />
            {point.endDate}: <b>{point.endRatio:.2f}%</b> (\${point.endPnl})<br />`,
        },
        dataLabels: {
          enabled: true,
          format: '{point.y:.1f}% ({point.changeValue})',
        },
        showInLegend: false,
      },
    ];

    return series;
  };

  const options = useMemo(() => {
    return getOptions({ series: getData() });
  }, [props.isPrivateMode, props.portfolios]);

  return (
    <Collapsible title="P&L % Change Over Multiple Time Periods">
      <Charts options={options} />

      {showPnLWidgetInfo && (
        <Flex my={2}>
          <Alert
            message={
              <>
                This chart is available as a developer widget which can be added to the dashboard. If you want to give
                it a try, please follow the instructions outlined{' '}
                <a
                  href="https://github.com/mani-coder/wealthica-pnl-widget"
                  target="_blank"
                  onClick={() => trackEvent('click-pnl-widget-info')}
                >
                  here
                </a>
                .
              </>
            }
            type="info"
            showIcon
            closable
            onClose={() => {
              setLocalCache(PNL_WIDGET_OOKIE_NAME, 1);
              setShowPnLWidgetInfo(false);
              trackEvent('close-pnl-widget-info');
            }}
          />
        </Flex>
      )}
    </Collapsible>
  );
}

export default React.memo(YoYPnLChart);
