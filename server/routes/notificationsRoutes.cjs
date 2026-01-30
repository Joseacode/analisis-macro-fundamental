// server/routes/notificationsRoutes.cjs

const express = require('express');
const router = express.Router();
const fs = require('fs/promises');
const path = require('path');

const NOTIFICATIONS_FILE = path.join(__dirname, '../data/notifications.json');

// Ensure data directory exists
async function ensureDataDir() {
    const dir = path.dirname(NOTIFICATIONS_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Read notifications
async function readNotifications() {
    try {
        await ensureDataDir();
        const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // File doesn't exist, return default mock data
        return [
            {
                id: '1',
                type: 'price',
                ticker: 'AAPL',
                title: 'AAPL -5.2%',
                message: 'Apple cayó 5.2% hoy. Precio actual: $172.45',
                timestamp: new Date().toISOString(),
                read: false,
                priority: 'high'
            },
            {
                id: '2',
                type: 'earnings',
                ticker: 'MSFT',
                title: 'MSFT Earnings Tomorrow',
                message: 'Microsoft reporta Q4 earnings mañana after market close',
                timestamp: new Date().toISOString(),
                read: false,
                priority: 'medium'
            },
            {
                id: '3',
                type: 'screening',
                title: '3 New High Scores',
                message: '3 empresas nuevas con score >90 en sector Tech',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                read: true,
                priority: 'low'
            }
        ];
    }
}

// Write notifications
async function writeNotifications(notifications) {
    await ensureDataDir();
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
}

// GET /api/notifications
router.get('/', async (req, res) => {
    try {
        const notifications = await readNotifications();
        res.json(notifications);
    } catch (error) {
        console.error('Error reading notifications:', error);
        res.status(500).json({ error: 'Failed to read notifications' });
    }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const notifications = await readNotifications();
        const updated = notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        await writeNotifications(updated);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
    try {
        const notifications = await readNotifications();
        const updated = notifications.map(n => ({ ...n, read: true }));
        await writeNotifications(updated);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// DELETE /api/notifications
router.delete('/', async (req, res) => {
    try {
        await writeNotifications([]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

// POST /api/notifications (for creating new notifications)
router.post('/', async (req, res) => {
    try {
        const { type, ticker, title, message, priority = 'medium' } = req.body;
        const notifications = await readNotifications();

        const newNotification = {
            id: Date.now().toString(),
            type,
            ticker,
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false,
            priority
        };

        notifications.unshift(newNotification);

        // Keep only last 50 notifications
        const trimmed = notifications.slice(0, 50);
        await writeNotifications(trimmed);

        res.json(newNotification);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

module.exports = router;
