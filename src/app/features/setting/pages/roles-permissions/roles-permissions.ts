// =============================
// IMPORTACIONES
// =============================
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, Subscription } from 'rxjs';

// Tipos y servicios de roles
import {
  CreateRoleRequest,
  PermissionKey,
  RolePermissionDto,
  RoleSummaryDto,
  RoleUserDto,
  RolesService,
  UpdateRoleRequest,
  UserWithRolesDto
} from '../../services/roles.service';

// Configuración del sidebar, usada como base para construir permisos
import { SIDEBAR_DATA, SidebarItem, SidebarPermissions } from '../../../../layout/main-layout/sidebar/sidebar.config';

// Directivas/servicio de validación
import {
  JMartEngineSyncDirective,
  JMartErrorNotifyDirective,
  JMartAutoFocusNextDirective,
  JMartMassiveValidationService
} from '@JairMartinez86/jmartinez-validator';

import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { NotificationService } from '../../../../core/services/notification.service';
import { LanguageService } from '../../../../core/services/languageService';
import { AppPermissionDirective } from '../../../../core/services/app-permission.directive';
import { PermissionService } from '../../../../core/services/permission.service';

// Bootstrap modal JS
declare const bootstrap: any;

// =============================
// INTERFACES DE APOYO PARA LA VISTA
// =============================

// Representa una fila de permisos en la UI
interface PermissionRowView {
  titleKey: string;
  router: string;
  permissions: SidebarPermissions;
  templatePermissions: SidebarPermissions;
}

// Representa un grupo de permisos en la UI
interface PermissionGroupView {
  titleKey: string;
  iconclass?: string;
  rows: PermissionRowView[];
}

// Modelo del formulario crear/editar rol
interface CreateRoleFormModel {
  name: string;
  key: string;
  description: string;
  copyFromRoleKey: string;
  colorKey: 'danger' | 'warning' | 'primary' | 'info' | 'success' | 'secondary';
  active: boolean;
}

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    Breadcrumb,
    AppPermissionDirective
  ],
  templateUrl: './roles-permissions.html',
  styleUrl: './roles-permissions.scss'
})
export class RolesPermissionsComponent implements OnInit {
  // Referencia al input del nombre del rol
  @ViewChild('roleNameInput')
  roleNameInput?: ElementRef<HTMLInputElement>;

  // =============================
  // INYECCIÓN DE SERVICIOS
  // =============================
  private rolesService = inject(RolesService);
  public notify = inject(NotificationService);
  private engine = inject(JMartMassiveValidationService);
  private permissionService = inject(PermissionService);
  private translate = inject(TranslateService);
  private langService = inject(LanguageService);

  // Subscripción al cambio de idioma
  private langChangeSub?: Subscription;

  // Ruta obligatoria que siempre debe tener permiso de view
  private readonly DASHBOARD_ROUTE = '/dashboard';

  // =============================
  // ESTADO DEL COMPONENTE
  // =============================
  roles: RoleSummaryDto[] = [];
  usersWithRoles: UserWithRolesDto[] = [];
  selectedRole: RoleSummaryDto | null = null;
  permissionGroups: PermissionGroupView[] = [];

  loading = false;
  saving = false;
  creating = false;

  modalMode: 'create' | 'edit' = 'create';
  editingRoleId: string | null = null;
  languages: any[] = [];

  // Formulario del modal
  createForm: CreateRoleFormModel = {
    name: '',
    key: '',
    description: '',
    copyFromRoleKey: '',
    colorKey: 'primary',
    active: true
  };

  // Breadcrumbs
  breadcrumbs = [
    { label: '', url: '' },
    { label: '', url: '/' },
    { label: '' }
  ];

  copy: HTMLElement | undefined;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  // =============================
  // CICLO DE VIDA
  // =============================
  async ngOnInit(): Promise<void> {
    // Solo ejecuta en navegador
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Recarga configuración cuando cambia el idioma
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.languages = this.langService.getAvailableLanguages();
      this.loadRolEngineConfig();
    });

    // Carga reglas/metadata y luego los datos de la pantalla
    this.loadRolEngineConfig();
    this.loadPageData();
  }

  // =============================
  // CONFIGURACIÓN DEL MOTOR DE VALIDACIÓN
  // =============================
  loadRolEngineConfig(): void {
    this.engine.resetRules();
    this.engine.clearFieldsMeta();

    const fieldMeta = this.translate.instant('rolesPermissions.form.fieldMeta') || {};
    const validations = this.translate.instant('rolesPermissions.form.validations') || {};
    this.breadcrumbs = this.translate.instant('rolesPermissions.breadcrumbs') || this.breadcrumbs;

    // Carga metadata por campo
    for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
      this.engine.addFieldMeta({
        id: fieldId,
        label: meta?.label ?? '',
        tooltip: meta?.tooltip ?? '',
        tooltipIconClass: meta?.tooltipIconClass ?? ''
      });
    }

    // Carga reglas dinámicas por campo
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

    // Sincroniza el estado actual del formulario con el engine
    this.engine.patchValues(this.createForm);
  }

  // =============================
  // CARGA INICIAL DE LA PÁGINA
  // =============================
  loadPageData(): void {
    this.loading = true;

    this.rolesService.getPageData()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res) => {
          if (!res) {
            return;
          }

          // Clona roles y fuerza permisos obligatorios
          this.roles = (res.data?.roles ?? []).map((role: RoleSummaryDto) => {
            const cloned = this.cloneRole(role);
            cloned.permissionsByRoute = this.enforceMandatoryPermissionsMap(cloned.permissionsByRoute);
            return cloned;
          });

          this.usersWithRoles = res.data?.usersWithRoles ?? [];

          // Selecciona el primer rol por defecto
          this.selectedRole = this.roles.length > 0 ? this.cloneRole(this.roles[0]) : null;
          this.enforceMandatoryPermissionsOnSelectedRole();
          this.rebuildPermissionGroups();
        },
        error: (error) => {
          this.notify.showFromApiResponse(error, 'Error');
          this.roles = [];
          this.usersWithRoles = [];
          this.selectedRole = null;
          this.permissionGroups = [];
        }
      });
  }

  // Selecciona un rol en la UI
  selectRole(role: RoleSummaryDto): void {
    this.selectedRole = this.cloneRole(role);
    this.enforceMandatoryPermissionsOnSelectedRole();
    this.rebuildPermissionGroups();
  }

  // Abre modal de edición
  editRole(role: RoleSummaryDto, event: Event): void {
    this.openEditRoleModal(role, event);
  }

  // =============================
  // MODAL CREAR ROL
  // =============================
  openCreateRoleModal(): void {
    // Valida permiso para crear
    if (!this.permissionService.canCreate('/roles-setting')) {
      return;
    }

    this.modalMode = 'create';
    this.editingRoleId = null;
    this.resetCreateForm();

    const modalEl = document.getElementById('addRoleModal');

    // Hace focus al input del nombre
    setTimeout(() => {
      const input = modalEl?.querySelector<HTMLInputElement>(
        'input[name="roleName"]:not([disabled])'
      );

      input?.focus({ preventScroll: true });
    }, 1);
  }

  // =============================
  // MODAL EDITAR ROL
  // =============================
  openEditRoleModal(role: RoleSummaryDto, event: Event): void {
    // Evita que el click del botón seleccione también la tarjeta/fila
    event.stopPropagation();

    this.modalMode = 'edit';
    this.editingRoleId = role.id;

    // Carga datos del rol en el formulario
    this.createForm = {
      name: role.name,
      key: role.key,
      description: role.description ?? '',
      copyFromRoleKey: '',
      colorKey: this.detectColorKey(role.color),
      active: role.active
    };

    this.engine.patchValues(this.createForm);
    this.engine.clearErrors();

    const modalEl = document.getElementById('addRoleModal');

    // Hace focus al input del nombre
    setTimeout(() => {
      const input = modalEl?.querySelector<HTMLInputElement>(
        'input[name="roleName"]:not([disabled])'
      );

      input?.focus({ preventScroll: true });
    }, 1);
  }

  // Limpia el formulario del modal
  resetCreateForm(): void {
    this.createForm = {
      name: '',
      key: '',
      description: '',
      copyFromRoleKey: '',
      colorKey: 'primary',
      active: true
    };

    this.engine.patchValues(this.createForm);
    this.engine.clearErrors();
  }

  // Guarda desde el modal según el modo actual
  async onSaveRoleModal(): Promise<void> {
    this.engine.clearErrors();
    this.notify.close();

    const ok = this.engine.validateAll();
    if (!ok) {
      this.notify.show(this.engine.getGroupedErrorsHtmlSnapshot(), '', 'warning');
      return;
    }

    if (this.modalMode === 'create') {
      this.onCreateRole();
      return;
    }

    this.onUpdateRoleDetails();
  }

  // =============================
  // CREAR ROL
  // =============================
  onCreateRole(): void {
    const name = this.createForm.name.trim();
    const key = (this.createForm.key || this.slugify(name)).trim().toLowerCase();

    // Si faltan datos mínimos, no sigue
    if (!name || !key) {
      return;
    }

    this.creating = true;

    // Resuelve colores/icono según colorKey
    const style = this.resolveRoleStyle(this.createForm.colorKey);

    // Construye permisos iniciales
    const permissionsByRoute = this.enforceMandatoryPermissionsMap(
      this.buildCreatePermissionsMap(this.createForm.copyFromRoleKey)
    );

    const body: CreateRoleRequest = {
      key,
      name,
      icon: style.icon,
      color: style.color,
      bgColor: style.bgColor,
      description: this.createForm.description.trim() || null,
      active: this.createForm.active,
      permissionsByRoute,
      users: []
    };

    this.rolesService.createRole(body)
      .pipe(finalize(() => this.creating = false))
      .subscribe({
        next: (res) => {
          if (!res) {
            return;
          }

          const createdRole = res.data?.role;

          if (createdRole) {
            const cloned = this.cloneRole(createdRole);
            cloned.permissionsByRoute = this.enforceMandatoryPermissionsMap(cloned.permissionsByRoute);

            this.roles.push(cloned);
            this.selectedRole = this.cloneRole(cloned);
            this.enforceMandatoryPermissionsOnSelectedRole();
            this.rebuildPermissionGroups();
            this.closeRoleModal();
            this.resetCreateForm();
          } else {
            this.loadPageData();
            this.closeRoleModal();
            this.resetCreateForm();
          }

          this.notify.showFromApiResponse(res, 'success');
        },
        error: (error) => {
          this.notify.showFromApiResponse(error, 'Error');
        }
      });
  }

  // =============================
  // ACTUALIZAR DETALLES DEL ROL
  // =============================
  onUpdateRoleDetails(): void {
    if (!this.editingRoleId) {
      return;
    }

    const currentRole = this.roles.find(x => x.id === this.editingRoleId);
    if (!currentRole) {
      return;
    }

    const name = this.createForm.name.trim();
    const key = this.createForm.key.trim().toLowerCase();

    if (!name || !key) {
      return;
    }

    this.saving = true;

    // Resuelve colores/icono
    const style = this.resolveRoleStyle(this.createForm.colorKey);

    const body: UpdateRoleRequest = {
      key,
      name,
      icon: style.icon,
      color: style.color,
      bgColor: style.bgColor,
      description: this.createForm.description.trim() || null,
      active: this.createForm.active,
      permissionsByRoute: this.enforceMandatoryPermissionsMap(
        this.clonePermissionsMap(currentRole.permissionsByRoute)
      ),
      users: currentRole.users.map(x => x.user)
    };

    this.rolesService.updateRole(this.editingRoleId, body)
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (res) => {
          if (!res) {
            return;
          }

          const updatedRole = res.data?.role;

          if (updatedRole) {
            const normalizedRole = this.cloneRole(updatedRole);
            normalizedRole.permissionsByRoute = this.enforceMandatoryPermissionsMap(normalizedRole.permissionsByRoute);

            const index = this.roles.findIndex(x => x.id === updatedRole.id);

            if (index >= 0) {
              this.roles[index] = normalizedRole;
            } else {
              this.roles.push(normalizedRole);
            }

            if (this.selectedRole?.id === updatedRole.id) {
              this.selectedRole = this.cloneRole(normalizedRole);
              this.enforceMandatoryPermissionsOnSelectedRole();
              this.rebuildPermissionGroups();
            }

            this.closeRoleModal();
            this.notify.showFromApiResponse(res, 'success');
          }
        },
        error: (error) => {
          this.notify.showFromApiResponse(error, 'Error');
        }
      });
  }

  // =============================
  // GUARDAR PERMISOS DEL ROL SELECCIONADO
  // =============================
  savePermissions(): void {
    if (!this.selectedRole || this.saving) {
      return;
    }

    this.saving = true;

    const body: UpdateRoleRequest = {
      key: this.selectedRole.key,
      name: this.selectedRole.name,
      icon: this.selectedRole.icon ?? null,
      color: this.selectedRole.color ?? null,
      bgColor: this.selectedRole.bgColor ?? null,
      description: this.selectedRole.description ?? null,
      active: this.selectedRole.active,
      permissionsByRoute: this.enforceMandatoryPermissionsMap(
        this.clonePermissionsMap(this.selectedRole.permissionsByRoute)
      ),
      users: this.selectedRole.users.map(x => x.user)
    };

    this.rolesService.updateRole(this.selectedRole.id, body).subscribe({
      next: (res) => {
        if (!res) {
          return;
        }

        const updatedRole = res.data?.role;

        if (updatedRole) {
          const normalizedRole = this.cloneRole(updatedRole);
          normalizedRole.permissionsByRoute = this.enforceMandatoryPermissionsMap(normalizedRole.permissionsByRoute);

          const index = this.roles.findIndex(x => x.id === updatedRole.id);

          if (index >= 0) {
            this.roles[index] = normalizedRole;
          } else {
            this.roles.push(normalizedRole);
          }

          this.selectedRole = this.cloneRole(normalizedRole);
          this.enforceMandatoryPermissionsOnSelectedRole();
          this.rebuildPermissionGroups();
        } else {
          this.loadPageData();
        }

        this.notify.showFromApiResponse(res, 'success');
      },
      error: (err) => {
        this.notify.showFromApiResponse(err, 'Error');
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  // =============================
  // QUITAR USUARIO DEL ROL
  // =============================
  confirmRemoveUserFromRole(user: RoleUserDto): void {
    if (!this.selectedRole) {
      return;
    }

    const selectedRole = this.selectedRole;

    const title = this.translate.instant('rolesPermissions.users.confirmRemoveTitle');

    const message = this.translate.instant(
      'rolesPermissions.users.confirmRemoveMessage',
      {
        user: user.fullName,
        role: selectedRole.name
      }
    );

    const confirm$ = this.notify.confirm(message, title, 'delete');

    if (!confirm$) {
      return;
    }

    confirm$.subscribe({
      next: (result) => {
        if (result !== 1) {
          return;
        }

        this.rolesService.removeUserFromRole(selectedRole.id, user.user).subscribe({
          next: (res) => {
            if (!res) {
              return;
            }

            const updatedRole = res.data?.role;

            if (updatedRole) {
              const normalizedRole = this.cloneRole(updatedRole);
              normalizedRole.permissionsByRoute = this.enforceMandatoryPermissionsMap(normalizedRole.permissionsByRoute);

              const index = this.roles.findIndex(x => x.id === updatedRole.id);

              if (index >= 0) {
                this.roles[index] = normalizedRole;
              }

              this.selectedRole = this.cloneRole(normalizedRole);
              this.enforceMandatoryPermissionsOnSelectedRole();
              this.rebuildPermissionGroups();
            } else {
              selectedRole.users = selectedRole.users.filter(x => x.user !== user.user);
              selectedRole.usersCount = selectedRole.users.length;
              this.selectedRole = this.cloneRole(selectedRole);
            }

            this.notify.showFromApiResponse(res, 'success');
          },
          error: (error: any) => {
            this.notify.showFromApiResponse(error?.error ?? error, 'Error');
          }
        });
      }
    });
  }

  // =============================
  // CAMBIO DE PERMISOS INDIVIDUALES
  // =============================
  setPermission(row: PermissionRowView, key: PermissionKey, checked: boolean): void {
    if (!this.selectedRole) {
      return;
    }

    // Si el permiso no aplica para esta fila, no se toca
    if (row.templatePermissions[key] === null) {
      return;
    }

    // Dashboard view siempre queda en true
    if (this.isMandatoryDashboardView(row, key)) {
      row.permissions.view = true;
      this.selectedRole.permissionsByRoute[row.router] = this.toRolePermissionDto(row.permissions);
      return;
    }

    row.permissions[key] = checked;
    this.selectedRole.permissionsByRoute[row.router] = this.toRolePermissionDto(row.permissions);
  }

  // Marca o desmarca todos los permisos editables de una fila
  toggleAll(row: PermissionRowView, checked: boolean): void {
    if (!this.selectedRole) {
      return;
    }

    const keys: PermissionKey[] = ['view', 'create', 'edit', 'delete'];

    for (const key of keys) {
      if (!this.isEditablePermission(row, key)) {
        continue;
      }

      row.permissions[key] = checked;
    }

    this.selectedRole.permissionsByRoute[row.router] = this.toRolePermissionDto(row.permissions);
  }

  // Indica si todos los permisos visibles están marcados
  isAllChecked(row: PermissionRowView): boolean {
    const keys: PermissionKey[] = ['view', 'create', 'edit', 'delete'];

    const visibleValues = keys
      .filter(key => row.templatePermissions[key] !== null)
      .map(key => row.permissions[key])
      .filter((value): value is boolean => value !== null);

    return visibleValues.length > 0 && visibleValues.every(value => value === true);
  }

  // Indica si debe mostrarse el toggle "todos"
  shouldShowToggleAll(row: PermissionRowView): boolean {
    return this.countVisiblePermissions(row) > 0;
  }

  // Cuenta permisos editables
  countEditablePermissions(row: PermissionRowView): number {
    const keys: PermissionKey[] = ['view', 'create', 'edit', 'delete'];
    return keys.filter(key => this.isEditablePermission(row, key)).length;
  }

  // Verifica si es el permiso obligatorio de dashboard:view
  isMandatoryDashboardView(row: PermissionRowView, key: PermissionKey): boolean {
    return this.normalizeRoute(row.router) === this.DASHBOARD_ROUTE && key === 'view';
  }

  // Determina si un permiso puede editarse
  private isEditablePermission(row: PermissionRowView, key: PermissionKey): boolean {
    if (row.templatePermissions[key] === null) {
      return false;
    }

    if (this.isMandatoryDashboardView(row, key)) {
      return false;
    }

    return true;
  }

  // Cuenta permisos visibles
  private countVisiblePermissions(row: PermissionRowView): number {
    const keys: PermissionKey[] = ['view', 'create', 'edit', 'delete'];
    return keys.filter(key => row.templatePermissions[key] !== null).length;
  }

  // Fuerza permisos obligatorios en el rol seleccionado
  private enforceMandatoryPermissionsOnSelectedRole(): void {
    if (!this.selectedRole) {
      return;
    }

    this.selectedRole.permissionsByRoute = this.enforceMandatoryPermissionsMap(
      this.selectedRole.permissionsByRoute
    );
  }

  // Garantiza que dashboard tenga view=true
  private enforceMandatoryPermissionsMap(
    map: Record<string, RolePermissionDto>
  ): Record<string, RolePermissionDto> {
    const result = this.clonePermissionsMap(map ?? {});
    const dashboardRoute = this.normalizeRoute(this.DASHBOARD_ROUTE);

    if (!result[dashboardRoute]) {
      result[dashboardRoute] = {
        view: true,
        create: null,
        edit: null,
        delete: null
      };
    } else {
      result[dashboardRoute] = {
        ...result[dashboardRoute],
        view: true
      };
    }

    return result;
  }

  // =============================
  // CONSTRUCCIÓN DE GRUPOS/FILAS DE PERMISOS
  // =============================
  private rebuildPermissionGroups(): void {
    if (!this.selectedRole) {
      this.permissionGroups = [];
      return;
    }

    this.permissionGroups = this.buildPermissionGroupsFromSidebar(SIDEBAR_DATA);
  }

  // Construye grupos usando la estructura del sidebar
  private buildPermissionGroupsFromSidebar(items: SidebarItem[]): PermissionGroupView[] {
    const groups: PermissionGroupView[] = [];

    for (const item of items) {
      if (item.type === 'heading') {
        continue;
      }

      if (item.type === 'link' && item.router) {
        groups.push({
          titleKey: item.titleKey,
          iconclass: item.iconclass,
          rows: [this.toRow(item)]
        });
        continue;
      }

      if (item.type === 'submenu') {
        const rows = this.collectRows(item.children ?? []);

        if (rows.length > 0) {
          groups.push({
            titleKey: item.titleKey,
            iconclass: item.iconclass,
            rows
          });
        }
      }
    }

    return groups;
  }

  // Recolecta filas recursivamente
  private collectRows(items: SidebarItem[]): PermissionRowView[] {
    const rows: PermissionRowView[] = [];

    for (const item of items) {
      if (item.type === 'heading') {
        continue;
      }

      if (item.type === 'link' && item.router) {
        rows.push(this.toRow(item));
        continue;
      }

      if (item.type === 'submenu') {
        rows.push(...this.collectRows(item.children ?? []));
      }
    }

    return rows;
  }

  // Convierte un SidebarItem a fila visual de permisos
  private toRow(item: SidebarItem): PermissionRowView {
    const route = this.normalizeRoute(item.router!);
    const permissionsMap = this.normalizePermissionsMapKeys(
      this.selectedRole?.permissionsByRoute ?? {}
    );

    const templatePermissions = this.normalizeTemplatePermissions(item.permissions);
    const fromRole = permissionsMap[route];

    const mergedPermissions = this.mergePermissionsWithTemplate(
      fromRole,
      templatePermissions
    );

    if (route === this.DASHBOARD_ROUTE) {
      mergedPermissions.view = true;
    }

    if (this.selectedRole) {
      this.selectedRole.permissionsByRoute[route] = this.toRolePermissionDto(mergedPermissions);
    }

    return {
      titleKey: item.titleKey,
      router: route,
      permissions: mergedPermissions,
      templatePermissions
    };
  }

  // Mezcla permisos del rol con la plantilla base
  private mergePermissionsWithTemplate(
    rolePermission: RolePermissionDto | undefined,
    templatePermissions: SidebarPermissions
  ): SidebarPermissions {
    return {
      view: templatePermissions.view === null
        ? null
        : (rolePermission?.view ?? false),

      create: templatePermissions.create === null
        ? null
        : (rolePermission?.create ?? false),

      edit: templatePermissions.edit === null
        ? null
        : (rolePermission?.edit ?? false),

      delete: templatePermissions.delete === null
        ? null
        : (rolePermission?.delete ?? false)
    };
  }

  // Normaliza permisos plantilla
  private normalizeTemplatePermissions(
    permissions?: SidebarPermissions
  ): SidebarPermissions {
    return {
      view: permissions ? permissions.view : false,
      create: permissions ? permissions.create : false,
      edit: permissions ? permissions.edit : false,
      delete: permissions ? permissions.delete : false
    };
  }

  // Construye permisos iniciales al crear un rol
  private buildCreatePermissionsMap(copyFromRoleKey: string): Record<string, RolePermissionDto> {
    if (copyFromRoleKey) {
      const sourceRole = this.roles.find(x => x.key === copyFromRoleKey);
      if (sourceRole) {
        return this.enforceMandatoryPermissionsMap(
          this.clonePermissionsMap(sourceRole.permissionsByRoute)
        );
      }
    }

    return this.enforceMandatoryPermissionsMap(
      this.buildEmptyPermissionsMapFromSidebar(SIDEBAR_DATA)
    );
  }

  // Crea un mapa de permisos vacío basado en el sidebar
  private buildEmptyPermissionsMapFromSidebar(items: SidebarItem[]): Record<string, RolePermissionDto> {
    const result: Record<string, RolePermissionDto> = {};

    const walk = (nodes: SidebarItem[]) => {
      for (const item of nodes) {
        if (item.type === 'link' && item.router) {
          const template = this.normalizeTemplatePermissions(item.permissions);

          result[this.normalizeRoute(item.router)] = {
            view: template.view === null ? null : false,
            create: template.create === null ? null : false,
            edit: template.edit === null ? null : false,
            delete: template.delete === null ? null : false
          };

          continue;
        }

        if (item.type === 'submenu' && item.children?.length) {
          walk(item.children);
        }
      }
    };

    walk(items);
    return result;
  }

  // =============================
  // ESTILOS VISUALES DE ROL
  // =============================
  private resolveRoleStyle(colorKey: CreateRoleFormModel['colorKey']): {
    color: string;
    bgColor: string;
    icon: string;
  } {
    switch (colorKey) {
      case 'danger':
        return {
          color: 'var(--danger-color)',
          bgColor: 'var(--danger-color-light)',
          icon: 'bi bi-shield-fill'
        };

      case 'warning':
        return {
          color: 'var(--warning-color)',
          bgColor: 'var(--warning-color-light)',
          icon: 'bi bi-person-badge'
        };

      case 'info':
        return {
          color: 'var(--info-color)',
          bgColor: 'var(--info-color-light)',
          icon: 'bi bi-pencil-square'
        };

      case 'success':
        return {
          color: 'var(--success-color)',
          bgColor: 'color-mix(in srgb, var(--success-color), transparent 85%)',
          icon: 'bi bi-check-circle'
        };

      case 'secondary':
        return {
          color: 'var(--muted-color)',
          bgColor: 'var(--background-color)',
          icon: 'bi bi-eye'
        };

      default:
        return {
          color: 'var(--accent-color)',
          bgColor: 'color-mix(in srgb, var(--accent-color), transparent 85%)',
          icon: 'bi bi-person'
        };
    }
  }

  // Detecta el colorKey a partir del color real guardado
  private detectColorKey(
    color?: string | null
  ): 'danger' | 'warning' | 'primary' | 'info' | 'success' | 'secondary' {
    switch (color) {
      case 'var(--danger-color)':
        return 'danger';
      case 'var(--warning-color)':
        return 'warning';
      case 'var(--info-color)':
        return 'info';
      case 'var(--success-color)':
        return 'success';
      case 'var(--muted-color)':
        return 'secondary';
      default:
        return 'primary';
    }
  }

  // =============================
  // UTILIDADES
  // =============================
  // Cierra el modal de bootstrap
  private closeRoleModal(): void {
    const element = document.getElementById('addRoleModal');

    if (!element || typeof bootstrap === 'undefined') {
      return;
    }

    const modalInstance = bootstrap.Modal.getInstance(element) || new bootstrap.Modal(element);
    modalInstance.hide();
  }

  // Convierte texto a slug
  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Normaliza ruta
  private normalizeRoute(route: string): string {
    return ('/' + route.trim().replace(/^\/+/, ''))
      .replace(/\/+$/, '')
      .toLowerCase();
  }

  // Normaliza keys del mapa de permisos
  private normalizePermissionsMapKeys(
    map: Record<string, RolePermissionDto>
  ): Record<string, RolePermissionDto> {
    const result: Record<string, RolePermissionDto> = {};

    for (const key of Object.keys(map ?? {})) {
      result[this.normalizeRoute(key)] = map[key];
    }

    return result;
  }

  // Clona rol
  private cloneRole(role: RoleSummaryDto): RoleSummaryDto {
    return {
      ...role,
      permissionsByRoute: this.clonePermissionsMap(role.permissionsByRoute),
      users: [...(role.users ?? [])]
    };
  }

  // Clona mapa de permisos
  private clonePermissionsMap(
    map: Record<string, RolePermissionDto>
  ): Record<string, RolePermissionDto> {
    const result: Record<string, RolePermissionDto> = {};

    for (const key of Object.keys(map ?? {})) {
      result[this.normalizeRoute(key)] = {
        view: map[key].view,
        create: map[key].create,
        edit: map[key].edit,
        delete: map[key].delete
      };
    }

    return result;
  }

  // Convierte SidebarPermissions a DTO
  private toRolePermissionDto(permissions: SidebarPermissions): RolePermissionDto {
    return {
      view: permissions.view,
      create: permissions.create,
      edit: permissions.edit,
      delete: permissions.delete
    };
  }

  // Obtiene avatar según género y tipo de rol
  getAvatarByGender(item: RoleUserDto): string {
    const gender = (item.gender || '').trim().toLowerCase();
    const role = (item.roleName || '').trim().toLowerCase();

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