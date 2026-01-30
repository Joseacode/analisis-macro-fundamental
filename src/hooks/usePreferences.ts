// src/hooks/usePreferences.ts

import { useState, useEffect, useCallback } from 'react';
import type { UserPreferences } from '../types/preferences.types';
import { DEFAULT_PREFERENCES } from '../types/preferences.types';

const STORAGE_KEY = 'userPreferences';
const API_URL = 'http://localhost:8787';

export function usePreferences() {
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
                console.log('✅ Preferences loaded from localStorage');
            } catch (error) {
                console.error('Error parsing preferences:', error);
            }
        }
    }, []);

    // Save to localStorage AND backend
    const savePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
        setPreferences(prev => {
            const updated = { ...prev, ...newPrefs };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            // ✅ Sync con backend
            fetch(`${API_URL}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            })
                .then(() => console.log('✅ Preferences synced to backend'))
                .catch(err => console.error('❌ Error saving to backend:', err));

            return updated;
        });
    }, []);

    // Reset to defaults
    const resetPreferences = useCallback(() => {
        setPreferences(DEFAULT_PREFERENCES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));

        // ✅ Sync con backend
        fetch(`${API_URL}/api/preferences`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(DEFAULT_PREFERENCES)
        })
            .then(() => console.log('✅ Preferences reset to defaults'))
            .catch(err => console.error('❌ Error resetting preferences:', err));
    }, []);

    // Add to watchlist
    const addToWatchlist = useCallback((ticker: string) => {
        setPreferences(prev => {
            const upperTicker = ticker.toUpperCase();

            // ✅ Ya existe, mostrar warning
            if (prev.watchlist.includes(upperTicker)) {
                console.warn(`⚠️  ${upperTicker} is already in watchlist`);
                return prev;
            }

            const updated = {
                ...prev,
                watchlist: [...prev.watchlist, upperTicker]
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            // ✅ Sync con backend
            fetch(`${API_URL}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            })
                .then(() => {
                    console.log(`⭐ ${upperTicker} added to watchlist`);

                    // ✅ Crear notificación de confirmación
                    return fetch(`${API_URL}/api/notifications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'screening',
                            ticker: upperTicker,
                            title: `${upperTicker} added to Watchlist`,
                            message: `Now monitoring price changes for ${upperTicker} (threshold: ±${prev.notifications.priceChangeThreshold}%). You'll receive alerts when price moves significantly.`,
                            priority: 'low'
                        })
                    });
                })
                .catch(err => console.error('❌ Error syncing watchlist:', err));

            return updated;
        });
    }, []);

    // Remove from watchlist
    const removeFromWatchlist = useCallback((ticker: string) => {
        setPreferences(prev => {
            const upperTicker = ticker.toUpperCase();

            // ✅ No existe en watchlist
            if (!prev.watchlist.includes(upperTicker)) {
                console.warn(`⚠️  ${upperTicker} is not in watchlist`);
                return prev;
            }

            const updated = {
                ...prev,
                watchlist: prev.watchlist.filter(t => t !== upperTicker)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

            // ✅ Sync con backend
            fetch(`${API_URL}/api/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            })
                .then(() => {
                    console.log(`☆ ${upperTicker} removed from watchlist`);

                    // ✅ Crear notificación de confirmación
                    return fetch(`${API_URL}/api/notifications`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'screening',
                            ticker: upperTicker,
                            title: `${upperTicker} removed from Watchlist`,
                            message: `No longer monitoring price changes for ${upperTicker}. You won't receive alerts for this ticker anymore.`,
                            priority: 'low'
                        })
                    });
                })
                .catch(err => console.error('❌ Error syncing watchlist:', err));

            return updated;
        });
    }, []);

    return {
        preferences,
        savePreferences,
        resetPreferences,
        addToWatchlist,
        removeFromWatchlist
    };
}
