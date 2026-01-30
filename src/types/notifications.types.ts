// src/types/notifications.types.ts

export type NotificationType = 'price' | 'earnings' | 'macro' | 'research' | 'screening';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
  id: string;
  type: NotificationType;
  ticker?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: NotificationPriority;
  link?: string;
  actionable?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  priceChangeThreshold: number;
  scoreMinThreshold: number;
  earningsReminder: boolean;
  macroAlerts: boolean;
}
