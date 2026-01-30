// src/components/NewsItem.tsx

import { useState } from 'react';

interface NewsItemProps {
    title: string;
    link: string;
    source: string;
    date: string;
    thumbnail?: string;
    snippet?: string;
    compact?: boolean;
}

export function NewsItem({
    title,
    link,
    source,
    date,
    thumbnail,
    snippet,
    compact = false
}: NewsItemProps) {
    const [imageError, setImageError] = useState(false);

    const handleClick = () => {
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    if (compact) {
        return (
            <div
                onClick={handleClick}
                style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
            >
                {/* Thumbnail */}
                {thumbnail && !imageError ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        onError={() => setImageError(true)}
                        style={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 8,
                            flexShrink: 0,
                            background: 'rgba(255,255,255,0.05)'
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.08))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                            flexShrink: 0
                        }}
                    >
                        📰
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 800,
                            lineHeight: 1.3,
                            marginBottom: 6,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            color: 'rgba(255,255,255,0.95)'
                        }}
                    >
                        {title}
                    </div>
                    <div
                        style={{
                            fontSize: 11,
                            opacity: 0.65,
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center'
                        }}
                    >
                        <span style={{ fontWeight: 700 }}>{source}</span>
                        <span>·</span>
                        <span>{date}</span>
                    </div>
                </div>

                {/* Arrow */}
                <div style={{ opacity: 0.5, fontSize: 16 }}>→</div>
            </div>
        );
    }

    // Full mode (with snippet)
    return (
        <div
            onClick={handleClick}
            style={{
                padding: 14,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{ display: 'flex', gap: 14 }}>
                {/* Thumbnail */}
                {thumbnail && !imageError ? (
                    <img
                        src={thumbnail}
                        alt={title}
                        onError={() => setImageError(true)}
                        style={{
                            width: 120,
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 10,
                            flexShrink: 0,
                            background: 'rgba(255,255,255,0.05)'
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: 120,
                            height: 120,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(147,51,234,0.08))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 40,
                            flexShrink: 0
                        }}
                    >
                        📰
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 14,
                            fontWeight: 900,
                            lineHeight: 1.35,
                            marginBottom: 8,
                            color: 'rgba(255,255,255,0.95)'
                        }}
                    >
                        {title}
                    </div>

                    {snippet && (
                        <div
                            style={{
                                fontSize: 12,
                                opacity: 0.75,
                                lineHeight: 1.4,
                                marginBottom: 10,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                            }}
                        >
                            {snippet}
                        </div>
                    )}

                    <div
                        style={{
                            fontSize: 11,
                            opacity: 0.65,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center'
                        }}
                    >
                        <span style={{ fontWeight: 700, color: 'rgba(59,130,246,0.9)' }}>
                            {source}
                        </span>
                        <span>·</span>
                        <span>{date}</span>
                        <span>·</span>
                        <span style={{ color: 'rgba(59,130,246,0.7)' }}>Read more →</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
