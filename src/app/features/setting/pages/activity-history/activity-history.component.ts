import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ActivityFilter, ActivityTimelineItem, TrustedDeviceItem } from '../../interface/activity-history.interface';
import { ActivityHistoryService } from '../../services/activity-history.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TokenStorageService } from '../../../../core/auth/services/token-storage.service';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';

type TimelineGroup = {
  labelKey?: string;
  labelText?: string;
  items: ActivityTimelineItem[];
};

type ActivityMetrics = {
  logins: number;
  security: number;
  profileChanges: number;
  failedAttempts: number;
};

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type RiskSnapshotItem = {
  id: string;
  title: string;
  description: string;
  level: RiskLevel;
};

type ActiveSessionItem = {
  id: string;
  sessionId: string;
  deviceType?: string | null;
  deviceName?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  isCurrent?: boolean;
  isTrusted?: boolean;
  startedAtUtc?: string | null;
  lastSeenAtUtc?: string | null;
};

@Component({
  selector: 'app-activity-history',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, DatePipe, Breadcrumb],
  templateUrl: './activity-history.component.html'
})
export class ActivityHistoryComponent implements OnInit {
  private readonly activityService = inject(ActivityHistoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly notify = inject(NotificationService);
  private readonly storage = inject(TokenStorageService);

  readonly loading = signal(true);
  readonly selectedFilter = signal<ActivityFilter>('all');
  readonly selectedDays = signal(7);
  readonly availableRanges = [7, 10, 30];

  readonly username = signal('');
  readonly userInfo = signal<any | null>(null);
  readonly activities = signal<ActivityTimelineItem[]>([]);
  readonly pagination = signal<any | null>(null);
  readonly metrics = signal<ActivityMetrics>({
    logins: 0,
    security: 0,
    profileChanges: 0,
    failedAttempts: 0
  });
  readonly riskSnapshot = signal<RiskSnapshotItem[]>([]);
  readonly activeSessions = signal<ActiveSessionItem[]>([]);
  readonly revokingSessionId = signal<string | null>(null);

  readonly trustedDevicesModalOpen = signal(false);
  readonly trustedDevicesLoading = signal(false);
  readonly trustedDevices = signal<TrustedDeviceItem[]>([]);
  readonly revokingTrustedDeviceId = signal<string | null>(null);

    breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const routeUser = params.get('user');
      const currentUser = this.getUserFromLocalStorage();
      const finalUser = routeUser || currentUser;

      if (!finalUser) {
        this.userInfo.set(null);
        this.activities.set([]);
        this.pagination.set(null);
        this.metrics.set({ logins: 0, security: 0, profileChanges: 0, failedAttempts: 0 });
        this.riskSnapshot.set([]);
        this.activeSessions.set([]);
        this.loading.set(false);
        return;
      }

      this.username.set(finalUser);
      this.loadUserHistory(1);
    });
  }

  private getUserFromLocalStorage(): string {
    if (!isPlatformBrowser(this.platformId)) return '';

    this.breadcrumbs = this.translate.instant('activity.breadcrumbs') || [];

    try {
      const raw = localStorage.getItem('user');
      if (!raw) return '';

      const parsed = JSON.parse(raw);
      return parsed?.user || parsed?.username || parsed?.email || '';
    } catch {
      return '';
    }
  }

  readonly filteredActivities = computed(() => {
    const items = this.activities();
    const filter = this.selectedFilter();
    if (filter === 'all') return items;
    return items.filter(item => (item.category || '').toLowerCase() === filter);
  });

  readonly groupedActivities = computed<TimelineGroup[]>(() => {
    const activities = this.filteredActivities();
    if (!activities.length) return [];

    const groups = new Map<string, TimelineGroup>();

    for (const item of activities) {
      const group = this.resolveGroup(item.occurredAtUtc);

      if (!groups.has(group.key)) {
        groups.set(group.key, {
          labelKey: group.labelKey,
          labelText: group.labelText,
          items: []
        });
      }

      groups.get(group.key)!.items.push(item);
    }

    return Array.from(groups.values());
  });

  loadUserHistory(page: number = 1): void {
    const user = this.username();
    const days = this.selectedDays();
    if (!user) return;

    this.loading.set(true);

    this.activityService.getByUser(user, days, page, 30).subscribe({
      next: (response) => {
        const data = response?.data ?? null;
        this.userInfo.set(data?.user ?? null);
        this.activities.set(data?.activities ?? []);
        this.pagination.set(data?.pagination ?? null);
        this.metrics.set({
          logins: data?.metrics?.logins ?? 0,
          security: data?.metrics?.security ?? 0,
          profileChanges: data?.metrics?.profileChanges ?? 0,
          failedAttempts: data?.metrics?.failedAttempts ?? 0
        });
        this.riskSnapshot.set(data?.riskSnapshot ?? []);
        this.activeSessions.set(data?.activeSessions ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.userInfo.set(null);
        this.activities.set([]);
        this.pagination.set(null);
        this.metrics.set({ logins: 0, security: 0, profileChanges: 0, failedAttempts: 0 });
        this.riskSnapshot.set([]);
        this.activeSessions.set([]);
        this.loading.set(false);
      }
    });
  }

  openTrustedDevicesModal(): void {
    this.trustedDevicesModalOpen.set(true);
    this.loadTrustedDevices();
  }

  closeTrustedDevicesModal(): void {
    this.trustedDevicesModalOpen.set(false);
    this.revokingTrustedDeviceId.set(null);
  }

  private loadTrustedDevices(): void {
    const user = this.username();
    if (!user) return;

    this.trustedDevicesLoading.set(true);
    this.activityService.getTrustedDevices(user).subscribe({
      next: (res: any) => {
        this.trustedDevices.set(res?.data ?? []);
        this.trustedDevicesLoading.set(false);
      },
      error: (err: any) => {
        this.trustedDevices.set([]);
        this.trustedDevicesLoading.set(false);
        this.notify.showFromApiResponse(err?.error ?? err, 'Error');
      }
    });
  }

  confirmRemoveTrustedDevice(device: TrustedDeviceItem): void {
    const title = this.translate.instant('activity.activity.trustedDevices.confirmTitle') || 'Warning';
    const message = this.translate.instant('activity.activity.trustedDevices.confirmMessage', {
      device: this.getTrustedDeviceName(device)
    });

    const ref = this.notify.confirm(message, title, 'warning');
    if (!ref) return;

    ref.subscribe((result: number) => {
      if (result !== 1) return;
      this.removeTrustedDevice(device);
    });
  }

  private removeTrustedDevice(device: TrustedDeviceItem): void {
    const user = this.username();
    if (!user || !device?.id) return;

    this.revokingTrustedDeviceId.set(device.id);

    this.activityService.deleteTrustedDevice(user, device.id).subscribe({
      next: (res: any) => {
        this.notify.showFromApiResponse(res, 'success');
        const forceLogoutCurrent = !!res?.data?.forceLogoutCurrent;

        this.trustedDevices.update(items => items.filter(x => x.id !== device.id));
        this.loadUserHistory(1);
        this.revokingTrustedDeviceId.set(null);

        if (forceLogoutCurrent) {
          this.finishClientLogout();
        }
      },
      error: (err: any) => {
        this.revokingTrustedDeviceId.set(null);
        this.notify.showFromApiResponse(err?.error ?? err, 'Error');
      }
    });
  }

  changeDays(days: number): void {
    if (this.selectedDays() === days) return;
    this.selectedDays.set(days);
    this.loadUserHistory(1);
  }

  isDaysActive(days: number): boolean {
    return this.selectedDays() === days;
  }

  setFilter(filter: ActivityFilter): void {
    this.selectedFilter.set(filter);
  }

  isFilterActive(filter: ActivityFilter): boolean {
    return this.selectedFilter() === filter;
  }

  confirmRevokeSession(session: ActiveSessionItem): void {
    const title = this.translate.instant('activity.activity.sessions.confirmTitle') || 'Warning';
    const message = this.translate.instant('activity.activity.sessions.confirmMessage', {
      device: this.getSessionName(session)
    }) || 'Do you really want to close this session?';

    const ref = this.notify.confirm(message, title, 'warning');
    if (!ref) return;

    ref.subscribe((result: number) => {
      if (result !== 1) return;
      if (session.isCurrent) {
        this.logoutCurrentSessionFromList(session);
        return;
      }
      this.revokeOtherSession(session);
    });
  }

  private logoutCurrentSessionFromList(session: ActiveSessionItem): void {
    if (!session?.sessionId) return;
    this.revokingSessionId.set(session.sessionId);

    this.activityService.logoutCurrentSession().subscribe({
      next: (res: any) => {
        this.notify.showFromApiResponse(res, 'success');
        this.finishClientLogout();
      },
      error: (err: any) => {
        this.revokingSessionId.set(null);
        this.notify.showFromApiResponse(err, 'Error');
      }
    });
  }

  private revokeOtherSession(session: ActiveSessionItem): void {
    if (!session?.sessionId) return;
    this.revokingSessionId.set(session.sessionId);

    this.activityService.revokeSession(session.sessionId, this.username()).subscribe({
      next: (res: any) => {
        this.notify.showFromApiResponse(res, 'success');
        this.loadUserHistory(1);
        this.revokingSessionId.set(null);
      },
      error: (err: any) => {
        this.revokingSessionId.set(null);
        this.notify.showFromApiResponse(err, 'Error');
      }
    });
  }

  private finishClientLogout(): void {
    this.revokingSessionId.set(null);
    this.revokingTrustedDeviceId.set(null);
    this.trustedDevicesModalOpen.set(false);

    this.userInfo.set(null);
    this.activities.set([]);
    this.pagination.set(null);
    this.metrics.set({ logins: 0, security: 0, profileChanges: 0, failedAttempts: 0 });
    this.riskSnapshot.set([]);
    this.activeSessions.set([]);
    this.trustedDevices.set([]);

    this.storage.clear();
    localStorage.removeItem('user');
    localStorage.removeItem('pending_2fa_identifier');
    localStorage.removeItem('pending_2fa_expires_at');
    localStorage.removeItem('pending_2fa_server_now');
    localStorage.removeItem('dev_2fa_code');
    sessionStorage.removeItem('user');

    window.location.replace('/login');
  }

  getTimelineDotClass(item: ActivityTimelineItem): string {
    const type = (item.type || '').toLowerCase();
    const severity = (item.severity || '').toLowerCase();

    if (type.includes('newdevice') || type.includes('new_device')) {
      return 'accent';
    }

    if (
      type.includes('bruteforcedetected') ||
      type.includes('brute_force_detected') ||
      type.includes('userlocked') ||
      type.includes('user_locked')
    ) {
      return 'danger';
    }

    switch (severity) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'danger':
      case 'critical': return 'danger';
      case 'info': return 'info';
      default: return 'accent';
    }
  }

  getTimelineMeta(item: ActivityTimelineItem): string | null {
    const parts = [item.deviceName, item.location]
      .filter((x) => !!x && `${x}`.trim().length > 0)
      .map((x) => `${x}`.trim());

    if (!parts.length) {
      return item.description?.trim() || null;
    }

    return parts.join(' · ');
  }

  getRiskBadgeClass(level: string | null | undefined): string {
    switch ((level || '').toLowerCase()) {
      case 'low': return 'bg-success-light text-success';
      case 'medium': return 'bg-warning-light text-warning';
      case 'high': return 'bg-danger-light text-danger';
      case 'critical': return 'bg-danger text-white';
      default: return 'bg-secondary text-white';
    }
  }

  getRiskLevelLabel(level: string | null | undefined): string {
    const normalized = (level || 'low').toLowerCase();
    return `activity.activity.risk.levels.${normalized}`;
  }

  getSessionIcon(session: ActiveSessionItem): string {
    const value = `${session.deviceName || ''} ${session.userAgent || ''} ${session.deviceType || ''}`.toLowerCase();
    if (value.includes('iphone') || value.includes('android') || value.includes('mobile') || value.includes('phone')) return 'bi-phone';
    if (value.includes('ipad') || value.includes('tablet')) return 'bi-tablet';
    return 'bi-laptop';
  }

  getSessionName(session: ActiveSessionItem): string {
    const device = (session.deviceName || '').trim();
    const browser = (session.browser || '').trim();
    const os = (session.operatingSystem || '').trim();

    if (device && browser) return `${browser} · ${device}`;
    if (device && os) return `${device} · ${os}`;
    if (device) return device;
    if (browser) return browser;
    return this.translate.instant('activity.activity.sessions.unknownDevice');
  }

  getSessionMeta(session: ActiveSessionItem): string {
    const parts: string[] = [];
    if (session.location?.trim()) parts.push(session.location.trim());
    if (session.ipAddress?.trim()) parts.push(session.ipAddress.trim());
    const relativeTime = this.getRelativeSessionTime(session.lastSeenAtUtc || session.startedAtUtc || '');
    if (relativeTime) parts.push(relativeTime);
    return parts.join(' · ');
  }

  getTrustedDeviceName(device: TrustedDeviceItem): string {
    const deviceName = (device.deviceName || '').trim();
    const browser = (device.browser || '').trim();
    if (browser && deviceName) return `${browser} · ${deviceName}`;
    return deviceName || browser || this.translate.instant('activity.activity.sessions.unknownDevice');
  }

  getTrustedDeviceMeta(device: TrustedDeviceItem): string {
    const parts: string[] = [];
    if (device.location?.trim()) parts.push(device.location.trim());
    if (device.ipAddress?.trim()) parts.push(device.ipAddress.trim());
    if (device.lastUsedAtUtc) parts.push(this.getRelativeSessionTime(device.lastUsedAtUtc));
    return parts.join(' · ');
  }

  private getRelativeSessionTime(dateValue: string): string {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const diffMs = Date.now() - date.getTime();

    if (diffMs < 60000) {
      return this.translate.instant('activity.activity.sessions.relativeTime.justNow');
    }

    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) {
      return this.translate.instant('activity.activity.sessions.relativeTime.minutesAgo', { value: diffMin });
    }

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return this.translate.instant('activity.activity.sessions.relativeTime.hoursAgo', { value: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    return this.translate.instant('activity.activity.sessions.relativeTime.daysAgo', { value: diffDays });
  }

  private resolveGroup(dateValue: string): { key: string; labelKey?: string; labelText?: string } {
    const date = new Date(dateValue);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = today.getTime() - target.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return { key: 'today', labelKey: 'activity.activity.timeline.today' };
    if (diffDays === 1) return { key: 'yesterday', labelKey: 'activity.activity.timeline.yesterday' };
    if (diffDays <= 7) return { key: 'thisWeek', labelKey: 'activity.activity.timeline.thisWeek' };

    const labelText = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);

    return { key: labelText, labelText };
  }
}
