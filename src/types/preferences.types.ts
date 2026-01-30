// src/types/preferences.types.ts

export type Density = 'compact' | 'normal' | 'spacious';
export type Theme = 'dark' | 'light';

export interface UserPreferences {
    // Favorites
    favoriteSectors: string[];
    watchlist: string[];

    // Alerts
    notifications: {
        enabled: boolean;
        priceChangeThreshold: number;
        scoreMinThreshold: number;
        earningsReminder: boolean;
        macroAlerts: boolean;
    };

    // Scoring
    scoring: {
        valueWeight: number;
        qualityWeight: number;
        growthWeight: number;
        riskWeight: number;
    };

    // Display
    display: {
        decimals: number;
        density: Density;
        theme: Theme;
        showBenchmark: boolean;
    };

    // Data
    dataRefreshInterval: number; // minutes
    autoSaveDossier: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    favoriteSectors: ['XLK', 'XLF', 'XLV'],
    watchlist: ['AAPL', 'MSFT', 'GOOGL'],
    notifications: {
        enabled: true,
        priceChangeThreshold: 5,
        scoreMinThreshold: 85,
        earningsReminder: true,
        macroAlerts: true
    },
    scoring: {
        valueWeight: 25,
        qualityWeight: 35,
        growthWeight: 25,
        riskWeight: 15
    },
    display: {
        decimals: 1,
        density: 'normal',
        theme: 'dark',
        showBenchmark: true
    },
    dataRefreshInterval: 15,
    autoSaveDossier: true
};
