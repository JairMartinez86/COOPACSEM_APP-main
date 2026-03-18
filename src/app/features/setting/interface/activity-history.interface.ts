export type ActivityFilter = 'all' | 'security' | 'profile';

export interface ActivityDashboardResponse {
  selectedDays: number;
  metrics: ActivityMetrics;
  riskSnapshot: ActivityRiskItem[];
  activeSessions: ActivitySessionItem[];
  recentActivity: ActivityTimelineItem[];
}

export interface ActivityMetrics {
  loginsLastDays: number;
  securityCriticalCount: number;
  profileChangesThisMonth: number;
  failedAttemptsBlocked: number;
}

export interface ActivityRiskItem {
  id: string;
  title: string;
  description: string;
  level: 'low' | 'medium' | 'high' | 'critical' | string;
}

export interface ActivitySessionItem {
  id: string;
  sessionId?: string;
  deviceType: 'Unknown' | 'Desktop' | 'Mobile' | 'Tablet' | string;
  deviceName: string;
  browser?: string | null;
  operatingSystem?: string | null;
  location?: string | null;
  isCurrent: boolean;
  isActive: boolean;
  startedAtUtc: string;
  lastSeenAtUtc: string;
}

export interface TrustedDeviceItem {
  id: string;
  user: string;
  sessionId?: string | null;
  deviceName?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  createdAtUtc?: string | null;
  lastUsedAtUtc?: string | null;
  expiresAtUtc?: string | null;
  isCurrent?: boolean;
  isActiveSession?: boolean;
}

export interface ActivityTimelineItem {
  id: string | number;
  user: string;
  category: string;
  type: string;
  severity: string;
  title: string;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  location?: string | null;
  deviceName?: string | null;
  isSuccessful?: boolean | null;
  occurredAtUtc: string;
}
