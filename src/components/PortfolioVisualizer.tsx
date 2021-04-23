import Typography from 'antd/es/typography';
import React from 'react';
import { Box, Flex } from 'rebass';
import { trackEvent } from '../analytics';
import { Position } from '../types';
import { getSymbol, getURLParams } from '../utils';
import Collapsible from './Collapsible';

const Link = ({ href, title }: { href: string; title: string }) => {
  return (
    <Box width={275}>
      <Typography.Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('portfolio-visualizer-link', { title })}
      >
        {title}
      </Typography.Link>
    </Box>
  );
};

function PortfolioVisualizer({ positions }: { positions: Position[] }) {
  function getBacktestPortfolioAssetAllocationLink() {
    const marketValue = positions.reduce((sum, position) => {
      return sum + position.market_value;
    }, 0);

    let remainingWeightage = 100;
    const params = getURLParams(
      positions.reduce((hash, position, index) => {
        // symbol1=QD&allocation1_1=1&
        // symbol2=TTD&allocation2_1=15
        let weightage = Number(((position.market_value / marketValue) * 100).toFixed(1));
        remainingWeightage -= weightage;
        remainingWeightage = Number(remainingWeightage.toFixed(1));
        if (index + 1 === positions.length) {
          weightage += remainingWeightage;
        }
        hash[`symbol${index + 1}`] = getSymbol(position.security);
        hash[`allocation${index + 1}_1`] = weightage;
        return hash;
      }, {}),
    );
    return `https://www.portfoliovisualizer.com/backtest-portfolio?s=y&timePeriod=4&initialAmount=10000&annualOperation=0&annualAdjustment=0&inflationAdjusted=true&annualPercentage=0.0&frequency=4&rebalanceType=1&showYield=false&reinvestDividends=true&${params}#analysisResults`;
  }

  function factorRegression() {
    const link =
      'https://www.portfoliovisualizer.com/factor-analysis?s=y&regressionType=1&sharedTimePeriod=true&factorDataSet=0&marketArea=0&factorModel=3&useHMLDevFactor=false&includeQualityFactor=false&includeLowBetaFactor=false&fixedIncomeFactorModel=0&__checkbox_ffmkt=true&__checkbox_ffsmb=true&__checkbox_ffsmb5=true&__checkbox_ffhml=true&__checkbox_ffmom=true&__checkbox_ffrmw=true&__checkbox_ffcma=true&__checkbox_ffstrev=true&__checkbox_ffltrev=true&__checkbox_aqrmkt=true&__checkbox_aqrsmb=true&__checkbox_aqrhml=true&__checkbox_aqrhmldev=true&__checkbox_aqrmom=true&__checkbox_aqrqmj=true&__checkbox_aqrbab=true&__checkbox_aamkt=true&__checkbox_aasmb=true&__checkbox_aahml=true&__checkbox_aamom=true&__checkbox_aaqmj=true&__checkbox_qmkt=true&__checkbox_qme=true&__checkbox_qia=true&__checkbox_qroe=true&__checkbox_qeg=true&__checkbox_trm=true&__checkbox_cdt=true&timePeriod=2&rollPeriod=36&marketAssetType=1&robustRegression=false&symbols=';
    const symbols = positions
      .filter((position) => {
        const symbol = position.security.symbol || position.security.name;
        return !(symbol.includes('-') || symbol.includes('.'));
      })
      .sort((a, b) =>
        a.security.currency === 'usd' && b.security.currency === 'usd' ? 1 : b.market_value > a.market_value ? 1 : -1,
      )
      .slice(0, 20)
      .map((position) => getSymbol(position.security))
      .sort((a, b) => a.localeCompare(b))
      .join(',');

    return `${link}${symbols}`;
  }

  return (
    <Collapsible title="Portoflio Visualizer Tools">
      <Flex width={1}>
        <Link href={getBacktestPortfolioAssetAllocationLink()} title="Backtest Portfolio Asset Allocation" />
        <Link href={factorRegression()} title="Factor Regression (US Stocks)" />
      </Flex>
    </Collapsible>
  );
}

export default React.memo(PortfolioVisualizer);
