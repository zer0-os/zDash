// @ts-nocheck

import React, { useEffect } from 'react';
import useChartStore from '@/store/useChartStore';
import Filters from '@/components/Filters';
import Chart from '@/components/Chart';
import Card from '@/components/Card';
import useDashboardStore from '@/store/useDashboardStore';
import useWildStore from '@/store/useWildStore';
import { formatUSD } from '@/app/lib/currencyUtils';

const WildSection: React.FC = () => {
    const { totalDaos, totalBalances, fetchData, isLoading, isPriceLoading, fetchTransactions, isTransactionsLoading, aggregatedTransactionsData, transactionCount, isInfoLoading, volume, holderCount, fetchWildInfo, lpHolderCount, fetchNFTVolumes, totalNFTVolume, nftVolumes, totalOwners } = useWildStore();
    const { chartData, fetchChartData, isLoadingChart } = useChartStore();
    const { filter } = useDashboardStore();

    useEffect(() => {
        if (!filter) {
            console.error('Filter is undefined');
            return;
        }

        const now = new Date();
        let start: Date;

        switch (filter) {
            case '24h':
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '48h':
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                start.setHours(0, 0, 0, 0);
                break;
            case '7d':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '365d':
                start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case 'today':
                start = new Date();
                start.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                start.setHours(0, 0, 0, 0);
                break;
            case 'last_week':
                start = new Date(now.getTime() - (now.getDay() + 7) * 24 * 60 * 60 * 1000);
                start.setHours(0, 0, 0, 0);
                break;
            case 'last_month':
                start = new Date();
                start.setMonth(now.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'last_year':
                start = new Date();
                start.setFullYear(now.getFullYear() - 1);
                start.setHours(0, 0, 0, 0);
                break;
            default:
                if (filter.startsWith('custom')) {
                    const dates = filter.split('_');
                    start = new Date(dates[1]);
                    const end = new Date(dates[2]);
                    fetchChartData('ethereum:0x2a3bff78b79a009976eea096a51a948a3dc00e34', start, end);
                    return;
                } else {
                    throw new Error(`Invalid filter format: ${filter}`);
                }
        }
        fetchData();
        fetchWildInfo();
        fetchTransactions(start, now);
        fetchNFTVolumes();
        fetchChartData('ethereum:0x2a3bff78b79a009976eea096a51a948a3dc00e34', start, now);
    }, [filter, fetchChartData, fetchData, fetchTransactions, fetchWildInfo, fetchNFTVolumes]);

    return (
        <div className="section">            
            <div className="zero-wild">
                <div className="cards">
                    <Card title="Token price" value={formatUSD(chartData[0]?.price) || 0} isLoading={isLoadingChart || isLoading || isPriceLoading} />
                    <Card title="Volume (DEX)" value={volume || 0} isLoading={isInfoLoading} />
                    <Card title="Volume NFT" value={totalNFTVolume || 0} isLoading={isInfoLoading} />
                    <Card title="Holders" value={holderCount || 0} isLoading={isInfoLoading} />                                        
                </div>
                
                <div className="cards">
                    <Card title="DAO Total WILD (USD)" value={totalBalances.WILD} isLoading={isPriceLoading} />
                    <Card title="DAO Total ETH (USD)" value={totalBalances.ETH} isLoading={isPriceLoading} />
                    <Card title="DAO Global Total (USD)" value={totalBalances.GLOBAL} isLoading={isPriceLoading} />
                    <Card title="DAO Transactions" value={transactionCount} isLoading={isTransactionsLoading} />
                    
                </div>
                <div className="cards">
                    <Card title="Wild DAOS" value={totalDaos} isLoading={isLoading} />
                    <Card title="Liquidity holders" value={lpHolderCount} isLoading={isInfoLoading} />
                    <Card title="NFTs holders" value={totalOwners} isLoading={isInfoLoading} />
                </div>
                <div className="charts">
                    <div className="chart-row">                                                    
                        <Chart data={chartData} dataKey="price" chartType="area" isCurrency={true} title="Token price over time" />                                            
                        <Chart data={nftVolumes} dataKey="volume" chartType="line" isCurrency={true} title="NFTs Volume" />                        
                    </div>
                    <div className="chart-row">                                                 
                        <Chart data={aggregatedTransactionsData} dataKey="count" chartType="line" title="Dao transactions" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WildSection;
