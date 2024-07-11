// @ts-nocheck

import { create } from 'zustand';
import { formatUnits } from 'viem';
import { DataPoint, MetricsData, GroupedData, DashboardState, Totals } from '@/app/types';
import { formatUSD } from '@/app/lib/currencyUtils';
import axios from 'axios';

const calculateDateRange = (filter: string): { fromDate: string; toDate: string; include15MinutesData: boolean } => {
    const now = new Date();
    let fromDate: string, toDate: string;
    let include15MinutesData = false;

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (filter) {
        case '15m':
            include15MinutesData = true;
            toDate = formatDate(now);
            fromDate = formatDate(now);
            break;
        case '24h':
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 1)));
            break;
        case '48h':
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 2)));
            break;
        case '7d':
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 7)));
            break;
        case '30d':
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 30)));
            break;
        case '90d':
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 90)));
            break;
        case '365d':
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 365)));
            break;
        case 'today':
            fromDate = toDate = formatDate(now);
            break;
        case 'yesterday':
            toDate = formatDate(new Date(now.setDate(now.getDate() - 1)));
            fromDate = toDate;
            break;
        case 'last_week':
            now.setDate(now.getDate() - now.getDay());
            toDate = formatDate(now);
            fromDate = formatDate(new Date(now.setDate(now.getDate() - 6)));
            break;
        case 'last_month':
            now.setMonth(now.getMonth() - 1);
            toDate = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
            fromDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
            break;
        case 'last_year':
            now.setFullYear(now.getFullYear() - 1);
            toDate = formatDate(new Date(now.getFullYear(), 11, 31));
            fromDate = formatDate(new Date(now.getFullYear(), 0, 1));
            break;
        default:
            if (filter && filter.includes('_')) {
                const dates = filter.split('_');
                fromDate = dates[1];
                toDate = dates[2];
            } else {
                throw new Error(`Invalid filter format: ${filter}`);
            }
            break;
    }

    return { fromDate, toDate, include15MinutesData };
};

const fetchAllData = async (fromDate: string, toDate: string, is15Minute: boolean = false): Promise<MetricsData[]> => {
    const url = `/api/zos/metrics?fromDate=${fromDate}&toDate=${toDate}&includeLast15Minutes=${is15Minute}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
    }
    return await response.json();
};

const fetchDashboardDataFromTime = async (filter: string): Promise<{ metricsData: MetricsData[], totalRewards: { amount: string, unit: string } }> => {
    const url = `/api/zos/metrics-time?filter=${filter}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
    }
    return await response.json();
};

const fetchCurrentTokenPriceInUSD = async (): Promise<{ price: number; holders: number }> => {
    const response = await fetch('/api/meow/token-price');
    if (!response.ok) {
        throw new Error(`Error fetching MEOW price: ${response.statusText}`);
    }
    const data = await response.json();
    return {
        price: data.price,
        holders: data.holders
    };
};

const fetchPairDataFromAPI = async (): Promise<any> => {
    const response = await fetch('/api/meow/pairs');
    if (!response.ok) {
        throw new Error(`Error fetching pair data: ${response.statusText}`);
    }
    return await response.json();
};

const useDashboardStore = create<DashboardState>((set, get) => ({
    filter: '7d',
    data: [],
    activeSection: 'Zero',
    pairData: null,
    zosData: [],
    znsData: [],
    znsDataCache: {},
    zosDataCache: {},
    totals: {
        totalRegistrations: 0,
        totalWorlds: 0,
        totalDomains: 0,
        dailyActiveUsers: 0,
        totalMessagesSent: 0,
        userSignUps: 0,
        newlyMintedDomains: 0,
        totalRewardsEarned: '0',
        dayCount: 0,
    },
    rewardsData: [],
    tokenPriceInUSD: null,
    meowHolders: 0,
    volume: 0,
    holderCount: 0,
    lpHolderCount: 0,
    isLoadingDashboard: false,
    isLoadingZns: false,
    isLoadingPairData: false,
    isInfoLoading: false,

    setFilter: (filter: string) => {
        const { activeSection } = get();
        if (filter === '15m' && activeSection !== 'Zero') {
            filter = '7d';
        }
        if (filter !== '15m') {
            localStorage.setItem('selectedOption', filter);
        }
        set({ filter });
    },

    setActiveSection: (section: string) => {
        const { filter } = get();
        if (filter === '15m' && section !== 'Zero') {
            set({ filter: '7d' });
        }
        set({ activeSection: section });
    },

    setData: (data: DataPoint[]) => set({ data }),

    setZosData: (data: MetricsData[]) => set({ zosData: data }),

    fetchTokenPrice: async () => {
        try {
            const info = await fetchCurrentTokenPriceInUSD();
            set({ tokenPriceInUSD: info.price, meowHolders: info.holders });
        } catch (error) {
            console.error('Error fetching token price:', error);
        }
    },

    fetchDashboardData: async (fromDate: string, toDate: string, is15Minute?: boolean) => {
        try {
            set({ isLoadingDashboard: true });
            const data: DataPoint[] = await fetchAllData(fromDate, toDate, is15Minute);
            const tokenPriceInUSD = get().tokenPriceInUSD;

            if (tokenPriceInUSD === null) {
                throw new Error('Token price is not available');
            }

            const initialTotals = {
                dailyActiveUsers: 0,
                totalMessagesSent: 0,
                userSignUps: 0,
                newlyMintedDomains: 0,
                totalRewardsEarned: '0',
                totalRegistrations: 0,
                totalWorlds: 0,
                totalDomains: 0,
                dayCount: 0,
            };

            const rewardsData: { date: string; totalRewardsEarned: number }[] = [];

            const totals = data.reduce((acc, curr) => {
                acc.dailyActiveUsers += curr.dailyActiveUsers;
                acc.totalMessagesSent += curr.totalMessagesSent;
                acc.userSignUps += curr.userSignUps;
                acc.newlyMintedDomains += curr.newlyMintedDomains;
                const rewardInEther = parseFloat(formatUnits(BigInt(curr.totalRewardsEarned.amount), curr.totalRewardsEarned.precision));
                const rewardInUSD = rewardInEther * tokenPriceInUSD;
                acc.totalRewardsEarned = (parseFloat(acc.totalRewardsEarned) + rewardInUSD).toString();
                rewardsData.push({ date: curr.date, totalRewardsEarned: rewardInUSD });
                acc.dayCount += 1;
                return acc;
            }, initialTotals);

            totals.dailyActiveUsers = Math.round(totals.dailyActiveUsers / totals.dayCount);
            totals.totalRewardsEarned = formatUSD(parseFloat(totals.totalRewardsEarned) * 100);

            set((state) => ({
                zosData: data,
                zosDataCache: { ...state.zosDataCache, [`${fromDate}_${toDate}`]: data },
                totals,
                rewardsData,
                isLoadingDashboard: false,
            }));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            set({ isLoadingDashboard: false });
        }
    },

    fetchDashboardDataByFilter: async (filter: string) => {
        if (!filter) {
            throw new Error('Filter is required');
        }

        try {
            const { activeSection } = get();

            if ((filter === '24h' || filter === '48h') && activeSection === 'Zero') {
                const { metricsData, totalRewards } = await fetchDashboardDataFromTime(filter);
                const tokenPriceInUSD = get().tokenPriceInUSD;

                const initialTotals = {
                    dailyActiveUsers: 0,
                    totalMessagesSent: 0,
                    userSignUps: 0,
                    newlyMintedDomains: 0,
                    totalRewardsEarned: '0',
                    totalRegistrations: 0,
                    totalWorlds: 0,
                    totalDomains: 0,
                    dayCount: 0,
                };

                const rewardsData: { date: string; totalRewardsEarned: number }[] = [];
                const hours = filter === '24h' ? 24 : 48;
                const rewardPerHour = parseFloat(totalRewards.amount) / hours;

                for (let i = 0; i < hours; i++) {
                    const hourTimestamp = new Date(new Date().setHours(new Date().getHours() - i)).toISOString();
                    rewardsData.push({ date: hourTimestamp, totalRewardsEarned: rewardPerHour });
                }

                const totals = metricsData.reduce((acc, curr) => {
                    acc.dailyActiveUsers += curr.dailyActiveUsers;
                    acc.totalMessagesSent += curr.totalMessagesSent;
                    acc.userSignUps += curr.userSignUps;
                    acc.newlyMintedDomains += curr.newlyMintedDomains;
                    return acc;
                }, initialTotals);

                totals.dailyActiveUsers = Math.round(totals.dailyActiveUsers / hours);
                totals.totalRewardsEarned = formatUSD(parseFloat(totalRewards.amount) * 100);

                set((state) => ({
                    zosData: metricsData,
                    zosDataCache: { ...state.zosDataCache, [`${filter}`]: metricsData },
                    totals,
                    rewardsData,
                    isLoadingDashboard: false,
                }));
            } else {
                const { fromDate, toDate, include15MinutesData } = calculateDateRange(filter);
                const { fetchTokenPrice, fetchDashboardData } = get();
                await fetchTokenPrice();
                await fetchDashboardData(fromDate, toDate, include15MinutesData);
            }
        } catch (error) {
            console.error('Error in fetchDashboardDataByFilter:', error);
        }
    },

    fetchTotals: async (filter: string) => {
        const cacheKey = filter;
        const state = get();

        if (filter === '15m') {
            console.warn('not supported on fetchTotals.');
            return;
        }

        const cachedData = state.znsDataCache[cacheKey];
        if (cachedData) {
            set({
                totals: {
                    totalRegistrations: cachedData.totalDomainRegistrations,
                    totalWorlds: cachedData.totalWorlds,
                    totalDomains: cachedData.totalDomains,
                }
            });
            return;
        }

        try {
            set({ isLoadingZns: true });
            const response = await fetch(`/api/domains?range=${filter}`);
            if (!response.ok) {
                throw new Error(`Error fetching totals data: ${response.statusText}`);
            }
            const result: Record<string, GroupedData> = await response.json();
            const totals = calculateTotals(result);

            set((state) => ({
                znsDataCache: { ...state.znsDataCache, [cacheKey]: result },
                totals,
                isLoadingZns: false,
            }));
        } catch (error) {
            console.error('Error in fetchTotals:', error);
            set({ isLoadingZns: false });
        }
    },

    fetchPairData: async () => {
        try {
            set({ isLoadingPairData: true });
            const data = await fetchPairDataFromAPI();
            set({ pairData: data, isLoadingPairData: false });
        } catch (error) {
            console.error('Error fetching pair data:', error);
            set({ isLoadingPairData: false });
        }
    },

    fetchMeowInfo: async () => {
        set({ isInfoLoading: true });
        try {
            const response = await axios.get('/api/meow/info');
            const { volume, holder_count, lp_holder_count } = response.data;
            set({
                volume,
                holdersCount: holder_count,
                lpHolderCount: lp_holder_count,
                isInfoLoading: false
            });
        } catch (error) {
            console.error('Failed to fetch wild info:', error);
            set(
                { isInfoLoading: false });
        }
    },
}));

const calculateTotals = (data: Record<string, GroupedData>): Totals => {
    return {
        totalRegistrations: Object.values(data).reduce((acc, val) => acc + val.totalDomainRegistrations, 0),
        totalWorlds: Object.values(data).reduce((acc, val) => acc + val.totalWorlds, 0),
        totalDomains: Object.values(data).reduce((acc, val) => acc + val.totalDomains, 0),
    };
};

export default useDashboardStore;
