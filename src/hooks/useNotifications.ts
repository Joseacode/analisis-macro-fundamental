// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '../types/notifications.types';

const API_URL = 'http://localhost:8787';

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch notifications from backend
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/notifications`);
            const data = await res.json();
            setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Mark as read
    const markAsRead = useCallback(async (id: string) => {
        try {
            await fetch(`${API_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: true } : n))
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        try {
            await fetch(`${API_URL}/api/notifications/read-all`, { method: 'PATCH' });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }, []);

    // Clear all
    const clearAll = useCallback(async () => {
        try {
            await fetch(`${API_URL}/api/notifications`, { method: 'DELETE' });
            setNotifications([]);
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    }, []);

    // Poll for new notifications every 30s
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const unreadCount = notifications.filter(n => !n.read).length;

    return {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        refetch: fetchNotifications
    };
}
