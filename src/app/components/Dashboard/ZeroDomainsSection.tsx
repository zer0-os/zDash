import React, { useEffect } from 'react';
import useDashboardStore from '@/store/useDashboardStore';
import Chart from '@/components/Chart';
import Card from '@/components/Card';

const ZeroDomainsSection: React.FC = () => {
    const {
        filter,        
        znsDataCache,        
        fetchTotals,
        isLoadingZns,
    } = useDashboardStore();

    useEffect(() => {
        fetchTotals(filter);
    }, [filter]);

    const cachedData = znsDataCache[filter] || {};

    const totals = {
        totalRegistrations: Object.values(cachedData).reduce((acc, val) => acc + val.totalDomainRegistrations, 0),
        totalWorlds: Object.values(cachedData).reduce((acc, val) => acc + val.totalWorlds, 0),
        totalDomains: Object.values(cachedData).reduce((acc, val) => acc + val.totalDomains, 0),
    };

    const znsData = Object.values(cachedData);
    
    return (
        <div className="section">
            <h2 id="zero-domains">ZERO Domains</h2>            
            <div className="zero-domains">
                <div className="cards">
                    <Card title="Total Domain Registrations" value={totals.totalRegistrations} isLoading={isLoadingZns} />
                    <Card title="Total Worlds" value={totals.totalWorlds} isLoading={isLoadingZns} />
                    <Card title="Total Domains" value={totals.totalDomains} isLoading={isLoadingZns} />
                </div>
                <div className="charts">
                    <div className="chart-row">
                        <div className="chart-container">
                            <h3>Total Domain Registrations</h3>
                            <Chart data={znsData} dataKey="totalDomainRegistrations" chartType="bar" />
                        </div>
                        <div className="chart-container">
                            <h3>Total Worlds</h3>
                            <Chart data={znsData} dataKey="totalWorlds" chartType="area" />
                        </div>
                    </div>
                    <div className="chart-row">
                        <div className="chart-container">
                            <h3>Total Domains</h3>
                            <Chart data={znsData} dataKey="totalDomains" chartType="line" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ZeroDomainsSection;
