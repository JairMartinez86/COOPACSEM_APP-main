export interface SocioAlertItem {
  code: string;
  messageKey: string;
  severity: 'info' | 'warning' | 'danger' | string;
  params?: Record<string, string> | null;
}

export interface SocioAlerts {
  count: number;
  hasAlerts: boolean;
  isExpired: boolean;
  highestSeverity: 'info' | 'warning' | 'danger' | string;
  items: SocioAlertItem[];
}
