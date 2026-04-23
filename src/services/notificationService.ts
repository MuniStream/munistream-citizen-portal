import api from './api';

export type NotificationChannelKey = 'email' | 'whatsapp';

export interface NotificationChannelToggle {
  email: boolean;
  whatsapp: boolean;
}

export interface NotificationPreferences {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  per_notification: Record<string, NotificationChannelToggle>;
  updated_at?: string;
}

export interface NotificationPreferencesPayload {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  per_notification?: Record<string, NotificationChannelToggle>;
}

export interface NotificationCatalogEntry {
  key: string;
  title: string;
  description: string;
  default_channels: NotificationChannelKey[];
}

export const notificationService = {
  async getCatalog(): Promise<NotificationCatalogEntry[]> {
    const { data } = await api.get<NotificationCatalogEntry[]>('/me/notification-catalog');
    return data;
  },
  async getPreferences(): Promise<NotificationPreferences> {
    const { data } = await api.get<NotificationPreferences>('/me/notification-preferences');
    return data;
  },
  async updatePreferences(
    payload: NotificationPreferencesPayload,
  ): Promise<NotificationPreferences> {
    const { data } = await api.put<NotificationPreferences>(
      '/me/notification-preferences',
      payload,
    );
    return data;
  },
};

export default notificationService;
