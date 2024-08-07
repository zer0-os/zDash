// @ts-nocheck

import React, { useCallback, useEffect, memo } from 'react';
import Filters from '@/components/Filters';
import LinkIcons from '@/components/LinkIcons';
import ProductivitySection from './ProductivitySection';
import ZeroDomainsSection from './ZeroDomainsSection';
import useDashboardStore from '@/store/useDashboardStore';
import ZeroGlobal from './ZeroGlobal';
import MeowSection from './MeowSection';
import FinanceSection from './FinanceSection';
import WildSection from './WildSection';
import RacingSection from './RacingSection';

interface DashboardProps {
    activeSection: string;
}

const sectionComponents = {
    Zero: ZeroGlobal,
    ZNS: ZeroDomainsSection,
    MEOW: MeowSection,
    WILD: WildSection,
    Finance: FinanceSection,
    Productivity: ProductivitySection,
    Racing: RacingSection,
};

const sectionTitles = {
    Zero: "ZERO HQ",
    ZNS: "ZERO Domains",
    MEOW: "M.E.O.W",
    WILD: "W.I.L.D",
    Finance: "Finance",
    Productivity: "Productivity Section",
    Racing: "W.I.L.D Racing",
};

const Dashboard: React.FC<DashboardProps> = ({ activeSection }) => {
    const { setActiveSection, filter, setFilter } = useDashboardStore();

    useEffect(() => {
        setActiveSection(activeSection);
    }, [activeSection, setActiveSection]);

    const renderSection = useCallback(() => {
        const SectionComponent = sectionComponents[activeSection];
        return SectionComponent ? <SectionComponent /> : null;
    }, [activeSection]);

    const getTitle = () => {
        return sectionTitles[activeSection] || "Dashboard";
    };

    const show15MinFilter = activeSection === 'Zero';

    return (
        <div className="dashboard">
            <div className='filter-box'>
                <div className="menu-box">
                    <h3 className="title-dashboard">{getTitle()}</h3>
                    <div className="links-box"><LinkIcons /></div>
                </div>
                <Filters setFilter={setFilter} show15MinFilter={show15MinFilter} />
            </div>
            <div className='filter-box-line'></div>
            {renderSection()}
        </div>
    );
};

export default memo(Dashboard);
