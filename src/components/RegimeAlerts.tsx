import { useEffect, useState } from 'react';
interface RegimeResult {
    regime: string;
    score: number;
    confidence: string;
    context: string;
    characteristics: string[];
    marketBehavior: string;
    sectors: {
        overweight: string[];
        underweight: string[];
    };
    portfolioConsequence: string;
}

interface RegimeAlertsProps {
    currentRegime: RegimeResult | null;
}

interface Alert {
    id: string;
    timestamp: Date;
    regime: string;
    score: number;
    message: string;
    type: 'info' | 'warning' | 'success';
}

export function RegimeAlerts({ currentRegime }: RegimeAlertsProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [previousRegime, setPreviousRegime] = useState<string | null>(null);

    useEffect(() => {
        if (!currentRegime) return;

        const currentRegimeName = currentRegime.regime;

        // Detectar cambio de régimen
        if (previousRegime && previousRegime !== currentRegimeName) {
            const newAlert: Alert = {
                id: Date.now().toString(),
                timestamp: new Date(),
                regime: currentRegimeName,
                score: currentRegime.score,
                message: `Regime changed from ${previousRegime} to ${currentRegimeName}`,
                type: getAlertType(currentRegimeName)
            };

            setAlerts(prev => [newAlert, ...prev].slice(0, 5)); // Mantener últimas 5 alertas

            // Notificación del navegador (opcional)
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Economic Regime Change', {
                    body: newAlert.message,
                });
            }
        }

        setPreviousRegime(currentRegimeName);
    }, [currentRegime, previousRegime]);

    const getAlertType = (regime: string): 'info' | 'warning' | 'success' => {
        switch (regime) {
            case 'Expansion':
                return 'success';
            case 'Late-Cycle':
            case 'Contraction':
                return 'warning';
            default:
                return 'info';
        }
    };

    const getAlertIcon = (type: 'info' | 'warning' | 'success') => {
        switch (type) {
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            default:
                return 'ℹ️';
        }
    };

    const getAlertColor = (type: 'info' | 'warning' | 'success') => {
        switch (type) {
            case 'success':
                return 'border-green-500 bg-green-500/10';
            case 'warning':
                return 'border-yellow-500 bg-yellow-500/10';
            default:
                return 'border-cyan-500 bg-cyan-500/10';
        }
    };

    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    useEffect(() => {
        requestNotificationPermission();
    }, []);

    if (alerts.length === 0) {
        return null;
    }

    return (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                🔔 Recent Regime Changes
            </h3>
            <div className="space-y-3">
                {alerts.map(alert => (
                    <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
                    >
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                            <div className="flex-1">
                                <p className="text-white font-medium">{alert.message}</p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                    <span>Score: {alert.score}</span>
                                    <span>{alert.timestamp.toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
