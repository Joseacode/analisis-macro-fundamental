import { useEffect, useRef } from 'react';

interface UseAutoRefreshOptions {
    interval: number; // En milisegundos
    enabled: boolean;
    onRefresh: () => void;
}

export function useAutoRefresh({ interval, enabled, onRefresh }: UseAutoRefreshOptions) {
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Ejecutar inmediatamente al activar
        onRefresh();

        // Configurar intervalo
        intervalRef.current = window.setInterval(() => {
            console.log('🔄 Auto-refresh triggered');
            onRefresh();
        }, interval);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
            }
        };
    }, [interval, enabled, onRefresh]);

    return null;
}
