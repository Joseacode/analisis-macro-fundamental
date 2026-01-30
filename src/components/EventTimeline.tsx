// src/components/EventTimeline.tsx

interface TimelineEvent {
    date: string;
    title: string;
    description?: string;
    type: 'earnings' | 'dividend' | 'buyback' | 'split' | 'event';
}

interface EventTimelineProps {
    events: TimelineEvent[];
    ticker: string;
}

export function EventTimeline({ events, ticker }: EventTimelineProps) {
    const getEventIcon = (type: string) => {
        switch (type) {
            case 'earnings': return '📊';
            case 'dividend': return '💰';
            case 'buyback': return '🔄';
            case 'split': return '✂️';
            default: return '📌';
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'earnings': return 'rgba(59,130,246,0.3)';
            case 'dividend': return 'rgba(34,197,94,0.3)';
            case 'buyback': return 'rgba(251,191,36,0.3)';
            case 'split': return 'rgba(147,51,234,0.3)';
            default: return 'rgba(255,255,255,0.2)';
        }
    };

    if (events.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                opacity: 0.5
            }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📅</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>No recent events</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                    Key events will appear here
                </div>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
            {/* Vertical line */}
            <div style={{
                position: 'absolute',
                left: 6,
                top: 8,
                bottom: 8,
                width: 2,
                background: 'linear-gradient(180deg, rgba(59,130,246,0.3), rgba(147,51,234,0.3))',
                borderRadius: 1
            }} />

            {/* Events */}
            <div style={{ display: 'grid', gap: 14 }}>
                {events.map((event, idx) => {
                    const icon = getEventIcon(event.type);
                    const color = getEventColor(event.type);

                    return (
                        <div
                            key={idx}
                            style={{
                                position: 'relative',
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: `1px solid ${color}`,
                                background: `linear-gradient(135deg, ${color.replace('0.3', '0.08')}, ${color.replace('0.3', '0.03')})`,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = color.replace('0.3', '0.12');
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = `linear-gradient(135deg, ${color.replace('0.3', '0.08')}, ${color.replace('0.3', '0.03')})`;
                                e.currentTarget.style.transform = 'translateX(0)';
                            }}
                        >
                            {/* Dot */}
                            <div style={{
                                position: 'absolute',
                                left: -30,
                                top: 16,
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: color,
                                border: '2px solid rgba(10,14,28,1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 8
                            }}>
                                {icon}
                            </div>

                            {/* Content */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 12
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: 12,
                                        fontWeight: 900,
                                        marginBottom: 4,
                                        color: 'rgba(255,255,255,0.95)'
                                    }}>
                                        {event.title}
                                    </div>
                                    {event.description && (
                                        <div style={{
                                            fontSize: 11,
                                            opacity: 0.75,
                                            lineHeight: 1.4
                                        }}>
                                            {event.description}
                                        </div>
                                    )}
                                </div>
                                <div style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    opacity: 0.6,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {event.date}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
