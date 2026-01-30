// src/components/NotificationCenter.tsx

import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NewsItem } from './NewsItem';

export function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

    // ✅ NUEVO: Market news state
    const [marketNews, setMarketNews] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(false);

    // ✅ NUEVO: Fetch market news when panel opens
    useEffect(() => {
        if (!open) return;

        const fetchMarketNews = async () => {
            setLoadingNews(true);
            try {
                const response = await fetch('http://localhost:8787/api/serpapi/market-news?limit=5');
                const data = await response.json();
                setMarketNews(data.news || []);
            } catch (error) {
                console.error('Error fetching market news:', error);
            } finally {
                setLoadingNews(false);
            }
        };

        fetchMarketNews();
    }, [open]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'rgba(239,68,68,0.3)';
            case 'medium': return 'rgba(251,191,36,0.3)';
            default: return 'rgba(59,130,246,0.3)';
        }
    };

    const getTypeEmoji = (type: string) => {
        switch (type) {
            case 'price': return '📈';
            case 'earnings': return '📊';
            case 'macro': return '🌍';
            case 'research': return '📝';
            case 'screening': return '🔍';
            default: return '🔔';
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    position: 'relative',
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
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        background: 'linear-gradient(135deg, rgba(239,68,68,1), rgba(220,38,38,1))',
                        color: '#fff',
                        borderRadius: '50%',
                        minWidth: 20,
                        height: 20,
                        fontSize: 10,
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(10,14,28,1)',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <>
                    <div
                        onClick={() => setOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 998
                        }}
                    />

                    <div style={{
                        position: 'absolute',
                        top: 55,
                        right: 0,
                        width: 420,
                        maxHeight: 600,
                        background: 'rgba(10,14,28,0.98)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 16,
                        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                        zIndex: 999,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        backdropFilter: 'blur(20px)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '16px 18px',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(147,51,234,0.05))'
                        }}>
                            <div style={{
                                fontWeight: 900,
                                fontSize: 15,
                                background: 'linear-gradient(135deg, rgba(59,130,246,1), rgba(147,51,234,1))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        style={{
                                            background: 'rgba(59,130,246,0.12)',
                                            border: '1px solid rgba(59,130,246,0.3)',
                                            borderRadius: 6,
                                            padding: '4px 10px',
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: 'rgba(59,130,246,1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={clearAll}
                                    style={{
                                        background: 'rgba(239,68,68,0.12)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: 6,
                                        padding: '4px 10px',
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: 'rgba(239,68,68,1)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{
                            overflowY: 'auto',
                            flex: 1,
                            padding: 10
                        }}>
                            {/* ✅ NUEVO: Market News Section */}
                            {marketNews.length > 0 && (
                                <>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 900,
                                        opacity: 0.7,
                                        marginBottom: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        paddingLeft: 4
                                    }}>
                                        <span>📰</span>
                                        <span>Latest Market News</span>
                                    </div>
                                    <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                                        {marketNews.map((news, idx) => (
                                            <NewsItem
                                                key={idx}
                                                title={news.title}
                                                link={news.link}
                                                source={news.source}
                                                date={news.date}
                                                thumbnail={news.thumbnail}
                                                compact
                                            />
                                        ))}
                                    </div>
                                    <div style={{
                                        height: 1,
                                        background: 'rgba(255,255,255,0.08)',
                                        marginBottom: 16
                                    }} />
                                </>
                            )}

                            {/* Notifications Section */}
                            {notifications.length === 0 ? (
                                <div style={{
                                    padding: '60px 20px',
                                    textAlign: 'center',
                                    opacity: 0.5
                                }}>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔕</div>
                                    <div style={{ fontSize: 14, fontWeight: 700 }}>No notifications</div>
                                    <div style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
                                        You're all caught up!
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 900,
                                        opacity: 0.7,
                                        marginBottom: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        paddingLeft: 4
                                    }}>
                                        <span>🔔</span>
                                        <span>Alerts & Updates</span>
                                    </div>
                                    {notifications.map(n => {
                                        const priorityColor = getPriorityColor(n.priority);
                                        const typeEmoji = getTypeEmoji(n.type);

                                        return (
                                            <div
                                                key={n.id}
                                                onClick={() => markAsRead(n.id)}
                                                style={{
                                                    padding: 14,
                                                    marginBottom: 8,
                                                    borderRadius: 12,
                                                    background: n.read
                                                        ? 'rgba(255,255,255,0.02)'
                                                        : 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(147,51,234,0.05))',
                                                    border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : priorityColor}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    position: 'relative',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {/* Priority indicator bar */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    bottom: 0,
                                                    width: 4,
                                                    background: priorityColor,
                                                    opacity: n.read ? 0.3 : 1
                                                }} />

                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: 8,
                                                    marginLeft: 8
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8
                                                    }}>
                                                        <span style={{ fontSize: 16 }}>{typeEmoji}</span>
                                                        <div style={{
                                                            fontWeight: 900,
                                                            fontSize: 13,
                                                            opacity: n.read ? 0.6 : 1
                                                        }}>
                                                            {n.ticker && (
                                                                <span style={{
                                                                    color: 'rgba(59,130,246,1)',
                                                                    marginRight: 6
                                                                }}>
                                                                    {n.ticker}
                                                                </span>
                                                            )}
                                                            {n.title}
                                                        </div>
                                                    </div>
                                                    {!n.read && (
                                                        <div style={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            background: 'rgba(59,130,246,1)',
                                                            flexShrink: 0,
                                                            boxShadow: '0 0 8px rgba(59,130,246,0.6)'
                                                        }} />
                                                    )}
                                                </div>

                                                <div style={{
                                                    fontSize: 12,
                                                    opacity: 0.75,
                                                    lineHeight: 1.5,
                                                    marginLeft: 32
                                                }}>
                                                    {n.message}
                                                </div>

                                                <div style={{
                                                    fontSize: 10,
                                                    opacity: 0.5,
                                                    marginTop: 8,
                                                    marginLeft: 32
                                                }}>
                                                    {new Date(n.timestamp).toLocaleString('es-AR')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
