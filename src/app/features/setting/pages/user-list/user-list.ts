import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, HostListener, Inject, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, map, Observable, of } from 'rxjs';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  CreateUserRequest,
  RoleSummaryDto,
  UpdateUserRequest,
  UserListService,
  UserSummaryDto
} from '../../services/user-list.service';
import {
  JMartAutoFocusNextDirective,
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartMassiveValidationService,
  JMartNumberFormatDirective
} from '@JairMartinez86/jmartinez-validator';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { RouterLink } from '@angular/router';
import { DraftFormService, DraftManagerRef } from '../../../../core/services/draft-manager-options.service';
import { CanComponentDeactivate } from '../../../../core/guards/pending-changes.guard';

declare const bootstrap: any;

interface UserFormModel {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
  gender: string;
  mobile: string;
  phoneNumber: string;
  address: string;
  language: string;
  defaultLandingPage: string;
  theme: string;
  enableTwoFactorLogin: boolean;
  enableAuditEmailNotifications: boolean;
  maxSessions: number;
  active: boolean;
}

interface UserDraftMeta {
  editingUserId: string | null;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    JMartNumberFormatDirective,
    Breadcrumb,
    RouterLink
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss'
})
export class UserList implements OnInit, AfterViewInit, CanComponentDeactivate {
  @ViewChild('userFormRef') userFormRef!: NgForm;
  draftRef?: DraftManagerRef;

  private readonly usersService = inject(UserListService);
  public readonly notify = inject(NotificationService);
  private readonly tr = inject(TranslateService);
  private readonly draftService = inject(DraftFormService);
  public readonly engine = inject(JMartMassiveValidationService);

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) { }

  loading = false;
  saving = false;
  processing = false;

  private formReady = false;
  private dataReady = false;

  roles: RoleSummaryDto[] = [];
  users: UserSummaryDto[] = [];
  filteredUsers: UserSummaryDto[] = [];
  pagedUsers: UserSummaryDto[] = [];

  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  statusTabs = [
    { value: 'all', titleKey: 'userlist.filters.all' },
    { value: 'active', titleKey: 'userlist.filters.active' },
    { value: 'inactive', titleKey: 'userlist.filters.inactive' },
  ];

  selectedStatus = 'all';
  selectedRole = '';
  searchTerm = '';

  page = 1;
  pageSize = 8;
  totalPages = 1;

  selectedUsers = new Set<string>();

  editingUser: UserSummaryDto | null = null;

  formModel: UserFormModel = this.createEmptyForm();
  Copy: UserFormModel = this.createEmptyForm();

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadPageData();
  }

  ngAfterViewInit(): void {
    this.formReady = true;
    this.tryInitDraftManager();
  }

  private tryInitDraftManager(): void {
    if (!this.formReady || !this.dataReady || this.draftRef || !this.userFormRef) {
      return;
    }

    this.draftRef = this.draftService.connect<UserFormModel, UserDraftMeta>({
      form: this.userFormRef,
      routeKey: 'users-list',
      currentData: () => ({ ...this.formModel }),
      savedData: () => ({ ...this.Copy }),
      restoreData: (data) => {
        this.formModel = {
          ...this.createEmptyForm(),
          ...this.Copy,
          ...data
        };
      },
      restoreSavedData: (data) => {
        this.Copy = {
          ...this.createEmptyForm(),
          ...data
        };
      },
      currentMeta: () => ({
        editingUserId: this.editingUser?.user ?? null
      }),
      restoreMeta: (meta) => {
        this.editingUser = meta?.editingUserId
          ? this.users.find(x => x.user === meta.editingUserId) ?? null
          : null;
      },
      patchEngine: (data) => {
        this.engine.patchValues(data);
        this.engine.clearErrors();
      },
      onDraftRestored: () => {
        setTimeout(() => {
          this.showModal();
        }, 500);
      },
      normalize: (data) => ({
        firstName: data?.firstName ?? '',
        lastName: data?.lastName ?? '',
        email: data?.email ?? '',
        role: data?.role ?? '',
        password: data?.password ?? '',
        confirmPassword: data?.confirmPassword ?? '',
        gender: data?.gender ?? '',
        mobile: data?.mobile ?? '',
        phoneNumber: data?.phoneNumber ?? '',
        address: data?.address ?? '',
        language: data?.language ?? 'es',
        defaultLandingPage: data?.defaultLandingPage ?? 'dashboard',
        theme: data?.theme ?? 'dark',
        enableTwoFactorLogin: !!data?.enableTwoFactorLogin,
        enableAuditEmailNotifications: !!data?.enableAuditEmailNotifications,
        maxSessions: Number(data?.maxSessions ?? 1),
        active: !!data?.active
      })
    });
  }

  private showModal(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const modalElement = document.getElementById('addUserModal');
    if (!modalElement || typeof bootstrap === 'undefined') {
      return;
    }

    const instance = bootstrap.Modal.getOrCreateInstance(modalElement);
    instance.show();
  }

  private hasUnsavedChanges(): boolean {
    return JSON.stringify(this.formModel) !== JSON.stringify(this.Copy);
  }

  canDeactivate(): boolean | Observable<boolean> {
    const forceLogout = sessionStorage.getItem('force-logout') === '1';

    if (forceLogout) {
      return true;
    }

    if (!this.hasUnsavedChanges()) {
      return true;
    }

    const title = this.tr.instant('draft.leavePageTitle') || 'Warning';
    const message =
      this.tr.instant('draft.leavePageMessage') ||
      'You have unsaved changes. If you leave this page, they will be lost. Do you want to continue?';

    const ref = this.notify.confirm(message, title, 'warning');

    if (!ref) {
      return of(false);
    }

    return ref.pipe(
      map((result: number) => {
        if (result === 1) {
          this.draftRef?.clear();
          return true;
        }

        return false;
      })
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) {
      return;
    }

    this.draftRef?.saveNow();
    event.preventDefault();
    event.returnValue = true;
  }

  @HostListener('window:pagehide')
  handlePageHide(): void {
    if (this.hasUnsavedChanges()) {
      this.draftRef?.saveNow();
    }
  }

  get allVisibleSelected(): boolean {
    return this.pagedUsers.length > 0 && this.pagedUsers.every(x => this.selectedUsers.has(x.user));
  }

  get currentFrom(): number {
    if (this.filteredUsers.length === 0) {
      return 0;
    }

    return (this.page - 1) * this.pageSize + 1;
  }

  get currentTo(): number {
    return Math.min(this.page * this.pageSize, this.filteredUsers.length);
  }

  get pageNumbers(): number[] {
    if (this.totalPages <= 1) {
      return [1];
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(this.totalPages);

    for (let i = this.page - 1; i <= this.page + 1; i++) {
      if (i >= 1 && i <= this.totalPages) {
        pages.add(i);
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter(x => x.status === 'active').length;
  }

  get inactiveUsers(): number {
    return this.users.filter(x => x.status === 'inactive').length;
  }

  get joinedThisMonth(): number {
    const now = new Date();

    return this.users.filter(x => {
      const joined = this.toDate(x.joinedAtUtc);
      if (!joined) {
        return false;
      }

      return joined.getFullYear() === now.getFullYear() && joined.getMonth() === now.getMonth();
    }).length;
  }

  get engagementPercent(): number {
    if (!this.totalUsers) {
      return 0;
    }

    return Math.round((this.activeUsers * 100) / this.totalUsers);
  }

  get recentUsers(): UserSummaryDto[] {
    return [...this.users]
      .sort((a, b) => {
        const dateB = this.toDate(b.joinedAtUtc)?.getTime() ?? 0;
        const dateA = this.toDate(a.joinedAtUtc)?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(0, 3);
  }

  get selectedRoleLabel(): string {
    if (!this.selectedRole) {
      return this.tr.instant('userlist.filters.allRoles');
    }

    const role = this.roles.find(r => r.key === this.selectedRole || r.name === this.selectedRole);
    return role?.name ?? this.selectedRole;
  }

  get roleDistribution(): Array<{ key: string; label: string; count: number; percent: number }> {
    const map = new Map<string, { key: string; label: string; count: number }>();

    for (const user of this.users) {
      const key = user.roleKey || user.roleName || 'user';
      const label = user.roleName || user.roleKey || 'User';

      if (!map.has(key)) {
        map.set(key, { key, label, count: 0 });
      }

      map.get(key)!.count++;
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map(x => ({
        ...x,
        percent: this.totalUsers ? Math.round((x.count * 100) / this.totalUsers) : 0
      }));
  }

  loadPageData(): void {
    this.loading = true;

    this.usersService.getPageData()
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: (res: any) => {
          this.roles = res.data?.roles ?? [];
          this.users = res.data?.users ?? [];
          this.applyFilters();
          this.loadUserListConfig();

          this.dataReady = true;
          this.tryInitDraftManager();
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  loadUserListConfig(): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.tr.instant('userlist.form.fieldMeta') || {};
    const validations = this.tr.instant('userlist.form.validations') || {};
    this.breadcrumbs = this.tr.instant('userlist.breadcrumbs') || [];

    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? ''
      });
    }

    for (const [fieldId, fieldConfig] of Object.entries(validations as Record<string, any>)) {
      const rules = fieldConfig?.data || {};

      for (const rule of Object.values(rules) as any[]) {
        const value = rule?.value ?? '';

        this.engine.addRule({
          id: fieldId,
          condition: String(rule?.rule ?? '').trim(),
          when: String(rule?.when ?? '').trim(),
          value,
          message: String(rule?.msj ?? '').replace('{value}', value ?? ''),
          classIconSuccess: rule?.classIconSuccess ?? '',
          classIconError: rule?.classIconError ?? ''
        });
      }
    }
  }

  setStatusFilter(value: string): void {
    this.selectedStatus = value;
    this.applyFilters();
  }

  setRoleFilter(value: string): void {
    this.selectedRole = value;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      const matchesStatus =
        this.selectedStatus === 'all' ||
        user.status === this.selectedStatus;

      const matchesRole =
        !this.selectedRole ||
        user.roleKey === this.selectedRole ||
        user.roleName === this.selectedRole;

      const haystack = [
        user.fullName,
        user.email,
        user.user,
        user.roleName,
        user.roleKey,
        user.mobile,
        user.phoneNumber
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);

      return matchesStatus && matchesRole && matchesSearch;
    });

    this.page = 1;
    this.rebuildPagination();
    this.syncSelection();
  }

  rebuildPagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }

    const start = (this.page - 1) * this.pageSize;
    this.pagedUsers = this.filteredUsers.slice(start, start + this.pageSize);
  }

  syncSelection(): void {
    const available = new Set(this.filteredUsers.map(x => x.user));

    this.selectedUsers.forEach(user => {
      if (!available.has(user)) {
        this.selectedUsers.delete(user);
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }

    this.page = page;
    this.rebuildPagination();
  }

  prevPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  toggleAll(checked: boolean): void {
    for (const user of this.pagedUsers) {
      if (checked) {
        this.selectedUsers.add(user.user);
      } else {
        this.selectedUsers.delete(user.user);
      }
    }
  }

  toggleSelection(user: string, checked: boolean): void {
    if (checked) {
      this.selectedUsers.add(user);
    } else {
      this.selectedUsers.delete(user);
    }
  }

  isSelected(user: string): boolean {
    return this.selectedUsers.has(user);
  }

  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.users.length;
    }

    return this.users.filter(x => x.status === status).length;
  }

  openCreateModal(): void {
    this.editingUser = null;

    const empty = this.createEmptyForm();
    this.formModel = { ...empty };
    this.Copy = { ...empty };

    this.userFormRef?.resetForm(this.formModel);
    this.engine.patchValues(this.formModel);
    this.engine.clearErrors();

    this.showModal();

    setTimeout(() => {
      const modalEl = document.getElementById('addUserModal');
      const input = modalEl?.querySelector<HTMLInputElement>('input[name="firstName"]:not([disabled])');
      input?.focus({ preventScroll: true });
    }, 100);
  }

  openEditModal(user: UserSummaryDto): void {
    const split = this.splitName(user.fullName);

    this.editingUser = user;

    const model: UserFormModel = {
      firstName: split.firstName,
      lastName: split.lastName,
      email: user.email,
      role: user.roleKey || user.roleName || '',
      password: '',
      confirmPassword: '',
      gender: user.gender || '',
      mobile: user.mobile || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      language: user.language || 'es',
      defaultLandingPage: user.defaultLandingPage || 'dashboard',
      theme: user.theme || 'dark',
      enableTwoFactorLogin: !!user.enableTwoFactorLogin,
      enableAuditEmailNotifications: !!user.enableAuditEmailNotifications,
      maxSessions: user.maxSessions || 0,
      active: !!user.active
    };

    this.formModel = { ...model };
    this.Copy = { ...model };

    this.userFormRef?.resetForm(this.formModel);
    this.engine.patchValues(this.formModel);
    this.engine.clearErrors();

    this.showModal();

    setTimeout(() => {
      const modalEl = document.getElementById('addUserModal');
      const input = modalEl?.querySelector<HTMLInputElement>('input[name="firstName"]:not([disabled])');
      input?.focus({ preventScroll: true });
    }, 100);
  }

  cancelSave(): void {
    this.draftRef?.cancel();
  }

  saveUser(): void {
    const ok = this.engine.validateAll();

    if (!ok) {
      this.notify.show(this.engine.getGroupedErrorsHtmlSnapshot(), '', 'warning');
      return;
    }

    this.engine.clearErrors();
    this.notify.close();

    if (this.editingUser) {
      this.updateUser();
      return;
    }

    this.createUser();
  }

  createUser(): void {
    const body: CreateUserRequest = {
      firstName: this.formModel.firstName.trim(),
      lastName: this.formModel.lastName.trim(),
      email: this.formModel.email.trim(),
      role: this.formModel.role,
      password: this.formModel.password?.trim() || null,
      confirmPassword: this.formModel.confirmPassword?.trim() || null,
      gender: this.formModel.gender?.trim() || null,
      mobile: this.formModel.mobile?.trim() || null,
      phoneNumber: this.formModel.phoneNumber?.trim() || null,
      address: this.formModel.address?.trim() || null,
      language: this.formModel.language,
      defaultLandingPage: this.formModel.defaultLandingPage?.trim() || 'dashboard',
      theme: this.formModel.theme,
      enableTwoFactorLogin: this.formModel.enableTwoFactorLogin,
      enableAuditEmailNotifications: this.formModel.enableAuditEmailNotifications,
      maxSessions: Number(this.formModel.maxSessions || 1),
      active: this.formModel.active
    };

    this.saving = true;

    this.usersService.createUser(body)
      .pipe(finalize(() => { this.saving = false; }))
      .subscribe({
        next: (res: any) => {
          const created = res.data?.user;
          if (created) {
            this.users = [created, ...this.users];
            this.applyFilters();
          }

          this.hideModal();
          this.draftRef?.clear();
          this.resetModalState();
          this.notify.showFromApiResponse(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  updateUser(): void {
    if (!this.editingUser) {
      return;
    }

    const body: UpdateUserRequest = {
      firstName: this.formModel.firstName.trim(),
      lastName: this.formModel.lastName.trim(),
      email: this.formModel.email.trim(),
      role: this.formModel.role,
      password: this.formModel.password?.trim() || null,
      confirmPassword: this.formModel.confirmPassword?.trim() || null,
      gender: this.formModel.gender?.trim() || null,
      mobile: this.formModel.mobile?.trim() || null,
      phoneNumber: this.formModel.phoneNumber?.trim() || null,
      address: this.formModel.address?.trim() || null,
      language: this.formModel.language,
      defaultLandingPage: this.formModel.defaultLandingPage?.trim() || 'dashboard',
      theme: this.formModel.theme,
      enableTwoFactorLogin: this.formModel.enableTwoFactorLogin,
      enableAuditEmailNotifications: this.formModel.enableAuditEmailNotifications,
      maxSessions: Number(this.formModel.maxSessions || 1),
      active: this.formModel.active
    };

    this.saving = true;

    this.usersService.updateUser(this.editingUser.user, body)
      .pipe(finalize(() => { this.saving = false; }))
      .subscribe({
        next: (res: any) => {
          const updated = res.data?.user;

          if (updated) {
            const index = this.users.findIndex(x => x.user === updated.user);
            if (index >= 0) {
              this.users[index] = updated;
              this.users = [...this.users];
              this.applyFilters();
            }
          }

          this.hideModal();
          this.draftRef?.clear();
          this.resetModalState();
          this.notify.showFromApiResponse(res, 'success');
        },
        error: (err: any) => {
          this.notify.showFromApiResponse(err?.error ?? err, 'Error');
        }
      });
  }

  deleteUser(user: UserSummaryDto): void {
    const title = this.tr.instant('userlist.table.confirmRemoveTitle');
    const message = this.tr.instant('userlist.table.confirmRemoveMessage', {
      user: user.fullName
    });

    const confirm$ = this.notify.confirm(message, title, 'delete');

    if (!confirm$) {
      return;
    }

    confirm$.subscribe({
      next: (result) => {
        if (result !== 1) {
          return;
        }

        this.processing = true;

        this.usersService.deleteUser(user.user)
          .pipe(finalize(() => { this.processing = false; }))
          .subscribe({
            next: (res: any) => {
              this.users = this.users.filter(x => x.user !== user.user);
              this.applyFilters();
              this.notify.showFromApiResponse(res, 'success');
            },
            error: (err: any) => {
              this.notify.showFromApiResponse(err?.error ?? err, 'Error');
            }
          });
      }
    });
  }

  resetPassword(user: UserSummaryDto): void {
    const title = this.tr.instant('userlist.table.confirmResetPassTitle');
    const message = this.tr.instant('userlist.table.confirmResetMessage', {
      user: user.fullName
    });

    const confirm$ = this.notify.confirm(message, title, 'delete');

    if (!confirm$) {
      return;
    }

    confirm$.subscribe({
      next: (result) => {
        if (result !== 1) {
          return;
        }

        this.processing = true;

        this.usersService.resetPassword(user.user)
          .pipe(finalize(() => { this.processing = false; }))
          .subscribe({
            next: (res: any) => {
              this.notify.showFromApiResponse(res, 'success');
            },
            error: (err: any) => {
              this.notify.showFromApiResponse(err?.error ?? err, 'Error');
            }
          });
      }
    });
  }

  exportUsers(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const headers = [
      this.tr.instant('userlist.table.user'),
      this.tr.instant('userlist.modal.email'),
      this.tr.instant('userlist.table.role'),
      this.tr.instant('userlist.table.status'),
      this.tr.instant('userlist.table.lastActive'),
      this.tr.instant('userlist.table.joined')
    ];

    const rows = this.filteredUsers.map(user => [
      user.fullName,
      user.email,
      user.roleName,
      this.tr.instant(`userlist.status.${user.status}`),
      this.formatLastActive(user.lastActiveAtUtc),
      this.formatDate(user.joinedAtUtc)
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  formatLastActive(value?: string | null): string {
    const date = this.toDate(value);

    if (!date) {
      return this.tr.instant('userlist.presence.never');
    }

    const diffMs = Date.now() - date.getTime();

    if (diffMs < 60000) {
      return this.tr.instant('userlist.presence.justNow');
    }

    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) {
      return this.tr.instant('userlist.presence.minutesAgo', { value: diffMin });
    }

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return this.tr.instant('userlist.presence.hoursAgo', { value: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    return this.tr.instant('userlist.presence.daysAgo', { value: diffDays });
  }

  formatDate(value?: string | null): string {
    const date = this.toDate(value);

    if (!date) {
      return '-';
    }

    return new Intl.DateTimeFormat(this.tr.currentLang || 'es', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(date);
  }

  getRecentText(user: UserSummaryDto): string {
    const joined = this.toDate(user.joinedAtUtc);

    if (!joined) {
      return this.tr.instant('userlist.presence.never');
    }

    const diffDays = Math.floor((Date.now() - joined.getTime()) / 86400000);

    if (diffDays <= 0) {
      return this.tr.instant('userlist.presence.today');
    }

    if (diffDays === 1) {
      return this.tr.instant('userlist.presence.yesterday');
    }

    return this.tr.instant('userlist.presence.daysAgo', { value: diffDays });
  }

  getRoleClass(roleKey?: string | null): string {
    const role = (roleKey || '').toLowerCase();

    if (role.includes('admin')) {
      return 'admin';
    }

    if (role.includes('manager')) {
      return 'manager';
    }

    return 'user';
  }

  getRoleIcon(roleKey?: string | null): string {
    const value = (roleKey || '').toLowerCase();

    if (value.includes('admin')) {
      return 'bi-shield-check';
    }

    if (value.includes('manager')) {
      return 'bi-person-gear';
    }

    return 'bi-person';
  }

  getPresenceClass(presence?: string | null): string {
    const value = (presence || '').toLowerCase();

    if (value === 'online') {
      return 'online';
    }

    if (value === 'away') {
      return 'away';
    }

    return 'offline';
  }

  getStatusClass(status?: string | null): string {
    const value = (status || '').toLowerCase();

    if (value === 'active') {
      return 'active';
    }

    if (value === 'inactive') {
      return 'inactive';
    }

    return 'pending';
  }

  private toDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private createEmptyForm(): UserFormModel {
    return {
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      password: '',
      confirmPassword: '',
      gender: '',
      mobile: '',
      phoneNumber: '',
      address: '',
      language: 'es',
      defaultLandingPage: 'dashboard',
      theme: 'dark',
      enableTwoFactorLogin: false,
      enableAuditEmailNotifications: false,
      maxSessions: 1,
      active: true,
    };
  }

  private splitName(fullName: string): { firstName: string; lastName: string } {
    const parts = (fullName || '').trim().split(/\s+/);

    if (parts.length <= 1) {
      return {
        firstName: parts[0] ?? '',
        lastName: ''
      };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }

  private hideModal(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const modalElement = document.getElementById('addUserModal');
    if (!modalElement || typeof bootstrap === 'undefined') {
      return;
    }

    const instance = bootstrap.Modal.getOrCreateInstance(modalElement);
    instance.hide();
  }

  private resetModalState(): void {
    const empty = this.createEmptyForm();

    this.editingUser = null;
    this.formModel = { ...empty };
    this.Copy = { ...empty };

    this.userFormRef?.resetForm(this.formModel);
    this.engine.patchValues(this.formModel);
    this.engine.clearErrors();
  }

  getAvatarByGender(item: any): string {
    const gender = (item.gender || '').toString().trim().toLowerCase();
    const role = (item.roleName || '').toString().trim().toLowerCase();

    const isFemale =
      gender === 'female' ||
      gender === 'femenino' ||
      gender === 'mujer' ||
      gender === 'f';

    const isAdmin =
      role === 'admin' ||
      role === 'administrator' ||
      role === 'administrador';

    if (isAdmin && isFemale) {
      return 'assets/img/avatars/avatar-admin-female.webp';
    }

    if (isAdmin && !isFemale) {
      return 'assets/img/avatars/avatar-admin-male.webp';
    }

    if (!isAdmin && isFemale) {
      return 'assets/img/avatars/avatar-default-female.webp';
    }

    return 'assets/img/avatars/avatar-default-male.webp';
  }
}