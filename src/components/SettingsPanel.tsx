// src/components/SettingsPanel.tsx

import { useState, useEffect } from 'react';
import { usePreferences } from '../hooks/usePreferences';

type SettingsTab = 'alerts' | 'scoring' | 'display' | 'watchlist';

// Interfaces para los componentes helper
interface ToggleSettingProps {
    label: string;
    description: string;
    value: boolean;
    onChange: (value: boolean) => void;
}

interface SliderSettingProps {
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    unit: string;
}

interface SelectOption {
    value: number;
    label: string;
}

interface SelectSettingProps {
    label: string;
    description: string;
    value: number;
    onChange: (value: number) => void;
    options: SelectOption[];
}

export function SettingsPanel() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<SettingsTab>('scoring');
    const { preferences, savePreferences, resetPreferences, removeFromWatchlist } = usePreferences();

    // Local state para editar sin guardar inmediatamente
    const [localPrefs, setLocalPrefs] = useState(preferences);

    useEffect(() => {
        setLocalPrefs(preferences);
    }, [preferences]);

    const handleSave = () => {
        savePreferences(localPrefs);
        alert('✅ Preferencias guardadas');
        setOpen(false);
    };

    const totalWeight =
        localPrefs.scoring.valueWeight +
        localPrefs.scoring.qualityWeight +
        localPrefs.scoring.growthWeight +
        localPrefs.scoring.riskWeight;

    const isWeightValid = totalWeight === 100;

    const tabs = [
        { id: 'scoring', label: 'Scoring', icon: '📊' },
        { id: 'alerts', label: 'Alerts', icon: '🔔' },
        { id: 'display', label: 'Display', icon: '🎨' },
        { id: 'watchlist', label: 'Watchlist', icon: '⭐' }
    ] as const;

    return (
        <div style={{ position: 'relative' }}>
            {/* Settings Button */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 18,
                    transition: 'all 0.2s ease',
                }}
            >
                ⚙️
            </button>

            {/* Settings Modal */}
            {open && (
                <>
                    <div
                        onClick={() => setOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            zIndex: 998
                        }}
                    />

                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 'min(640px, 90vw)',
                        maxHeight: '80vh',
                        background: 'rgba(10,14,28,0.98)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 20,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                        zIndex: 999,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(147,51,234,0.05))'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 16
                            }}>
                                <div>
                                    <h2 style={{
                                        margin: 0,
                                        fontSize: 20,
                                        fontWeight: 900,
                                        background: 'linear-gradient(135deg, rgba(59,130,246,1), rgba(147,51,234,1))',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent'
                                    }}>
                                        ⚙️ Settings
                                    </h2>
                                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
                                        Customize your dashboard experience
                                    </div>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 8,
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        color: '#fff',
                                        fontSize: 16
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tabs */}
                            <div style={{
                                display: 'flex',
                                gap: 6
                            }}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            border: activeTab === tab.id
                                                ? '1px solid rgba(59,130,246,0.4)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            background: activeTab === tab.id
                                                ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.1))'
                                                : 'rgba(255,255,255,0.02)',
                                            color: activeTab === tab.id
                                                ? 'rgba(59,130,246,1)'
                                                : 'rgba(255,255,255,0.7)',
                                            fontSize: 12,
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <span>{tab.icon}</span>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px 24px'
                        }}>
                            {activeTab === 'scoring' && (
                                <div>
                                    <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 16, opacity: 0.9 }}>
                                        📊 Scoring Weights
                                    </h3>
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: 10,
                                        background: isWeightValid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                        border: `1px solid ${isWeightValid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: isWeightValid ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)',
                                        marginBottom: 20
                                    }}>
                                        {isWeightValid ? '✅' : '⚠️'} Total: {totalWeight}% {isWeightValid ? '(Valid)' : '(Must equal 100%)'}
                                    </div>

                                    {(['valueWeight', 'qualityWeight', 'growthWeight', 'riskWeight'] as const).map(key => (
                                        <div key={key} style={{ marginBottom: 20 }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: 8
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>
                                                        {key === 'valueWeight' && 'Value Weight'}
                                                        {key === 'qualityWeight' && 'Quality Weight'}
                                                        {key === 'growthWeight' && 'Growth Weight'}
                                                        {key === 'riskWeight' && 'Risk Weight'}
                                                    </div>
                                                    <div style={{ fontSize: 11, opacity: 0.65 }}>
                                                        {key === 'valueWeight' && 'P/E, EV/EBITDA, P/B metrics'}
                                                        {key === 'qualityWeight' && 'ROE, margins, ratios'}
                                                        {key === 'growthWeight' && 'Revenue, EPS growth'}
                                                        {key === 'riskWeight' && 'Beta, debt, volatility'}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: 18,
                                                    fontWeight: 900,
                                                    color: 'rgba(59,130,246,1)'
                                                }}>
                                                    {localPrefs.scoring[key]}%
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={localPrefs.scoring[key]}
                                                onChange={(e) => setLocalPrefs({
                                                    ...localPrefs,
                                                    scoring: { ...localPrefs.scoring, [key]: +e.target.value }
                                                })}
                                                style={{
                                                    width: '100%',
                                                    height: 6,
                                                    borderRadius: 3,
                                                    background: `linear-gradient(to right, 
                                                        rgba(59,130,246,0.5) 0%, 
                                                        rgba(59,130,246,0.5) ${localPrefs.scoring[key]}%, 
                                                        rgba(255,255,255,0.1) ${localPrefs.scoring[key]}%, 
                                                        rgba(255,255,255,0.1) 100%)`,
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'alerts' && (
                                <div style={{ display: 'grid', gap: 20 }}>
                                    <ToggleSetting
                                        label="Enable Notifications"
                                        description="Receive alerts for price changes and market events"
                                        value={localPrefs.notifications.enabled}
                                        onChange={(v) => setLocalPrefs({
                                            ...localPrefs,
                                            notifications: { ...localPrefs.notifications, enabled: v }
                                        })}
                                    />
                                    <SliderSetting
                                        label="Price Change Threshold"
                                        description="Alert when price moves by this percentage"
                                        value={localPrefs.notifications.priceChangeThreshold}
                                        onChange={(v) => setLocalPrefs({
                                            ...localPrefs,
                                            notifications: { ...localPrefs.notifications, priceChangeThreshold: v }
                                        })}
                                        min={1}
                                        max={20}
                                        step={1}
                                        unit="%"
                                    />
                                    <ToggleSetting
                                        label="Earnings Reminder"
                                        description="Get notified 1 day before earnings reports"
                                        value={localPrefs.notifications.earningsReminder}
                                        onChange={(v) => setLocalPrefs({
                                            ...localPrefs,
                                            notifications: { ...localPrefs.notifications, earningsReminder: v }
                                        })}
                                    />
                                </div>
                            )}

                            {activeTab === 'display' && (
                                <div style={{ display: 'grid', gap: 20 }}>
                                    <SelectSetting
                                        label="Decimals Precision"
                                        description="Number of decimal places for metrics"
                                        value={localPrefs.display.decimals}
                                        onChange={(v) => setLocalPrefs({
                                            ...localPrefs,
                                            display: { ...localPrefs.display, decimals: v }
                                        })}
                                        options={[
                                            { value: 0, label: '0 decimals (100)' },
                                            { value: 1, label: '1 decimal (100.5)' },
                                            { value: 2, label: '2 decimals (100.50)' }
                                        ]}
                                    />
                                    <ToggleSetting
                                        label="Show Benchmark"
                                        description="Display sector median comparisons"
                                        value={localPrefs.display.showBenchmark}
                                        onChange={(v) => setLocalPrefs({
                                            ...localPrefs,
                                            display: { ...localPrefs.display, showBenchmark: v }
                                        })}
                                    />
                                </div>
                            )}

                            {activeTab === 'watchlist' && (
                                <div>
                                    <h3 style={{ fontSize: 14, fontWeight: 900, marginBottom: 12, opacity: 0.9 }}>
                                        ⭐ Monitored Tickers ({preferences.watchlist.length})
                                    </h3>
                                    {preferences.watchlist.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px 20px',
                                            opacity: 0.5
                                        }}>
                                            <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>No tickers in watchlist</div>
                                            <div style={{ fontSize: 11, marginTop: 6 }}>
                                                Add tickers from the Company Drawer
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {preferences.watchlist.map((ticker: string) => (
                                                <div
                                                    key={ticker}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px 14px',
                                                        borderRadius: 10,
                                                        background: 'rgba(255,255,255,0.02)',
                                                        border: '1px solid rgba(255,255,255,0.08)'
                                                    }}
                                                >
                                                    <div style={{
                                                        fontSize: 14,
                                                        fontWeight: 900,
                                                        color: 'rgba(59,130,246,1)'
                                                    }}>
                                                        {ticker}
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromWatchlist(ticker)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: 8,
                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                            background: 'rgba(239,68,68,0.1)',
                                                            color: 'rgba(239,68,68,1)',
                                                            fontSize: 11,
                                                            fontWeight: 800,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            gap: 12
                        }}>
                            <button
                                onClick={() => {
                                    if (confirm('¿Resetear todas las preferencias a valores por defecto?')) {
                                        resetPreferences();
                                        setLocalPrefs(preferences);
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    padding: 12,
                                    cursor: 'pointer',
                                    color: '#fff',
                                    fontWeight: 800,
                                    fontSize: 13
                                }}
                            >
                                🔄 Reset
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={activeTab === 'scoring' && !isWeightValid}
                                style={{
                                    flex: 2,
                                    background: (activeTab === 'scoring' && !isWeightValid)
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(147,51,234,0.9))',
                                    border: 'none',
                                    borderRadius: 10,
                                    padding: 12,
                                    cursor: (activeTab === 'scoring' && !isWeightValid) ? 'not-allowed' : 'pointer',
                                    color: '#fff',
                                    fontWeight: 900,
                                    fontSize: 13,
                                    opacity: (activeTab === 'scoring' && !isWeightValid) ? 0.5 : 1
                                }}
                            >
                                💾 Save Changes
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Helper Components
function ToggleSetting({ label, description, value, onChange }: ToggleSettingProps) {
    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 8
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}>{description}</div>
                </div>
                <button
                    onClick={() => onChange(!value)}
                    style={{
                        width: 50,
                        height: 28,
                        borderRadius: 14,
                        border: `1px solid ${value ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
                        background: value
                            ? 'linear-gradient(135deg, rgba(34,197,94,0.3), rgba(22,163,74,0.2))'
                            : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: 2,
                        left: value ? 24 : 2,
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: value ? 'rgba(34,197,94,1)' : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.2s ease'
                    }} />
                </button>
            </div>
        </div>
    );
}

function SliderSetting({ label, description, value, onChange, min, max, step, unit }: SliderSettingProps) {
    return (
        <div>
            <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}>{description}</div>
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
            }}>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{min}{unit}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'rgba(59,130,246,1)' }}>
                    {value}{unit}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{max}{unit}</div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: `linear-gradient(to right, 
                        rgba(59,130,246,0.5) 0%, 
                        rgba(59,130,246,0.5) ${((value - min) / (max - min)) * 100}%, 
                        rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, 
                        rgba(255,255,255,0.1) 100%)`,
                    outline: 'none',
                    cursor: 'pointer'
                }}
            />
        </div>
    );
}

function SelectSetting({ label, description, value, onChange, options }: SelectSettingProps) {
    return (
        <div>
            <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.4 }}>{description}</div>
            </div>
            <select
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                }}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: '#0a0e1c' }}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}