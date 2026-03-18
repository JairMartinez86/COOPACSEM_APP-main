import { inject, Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BrowserApiService } from '../../../core/services/browser-api.service';
import { ApiResponse } from '../../../core/auth/services/auth.service';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';

export type PermissionKey = 'view' | 'create' | 'edit' | 'delete';

export interface RolePermissionDto {
  view: boolean | null;
  create: boolean | null;
  edit: boolean | null;
  delete: boolean | null;
}

export interface RoleUserDto {
  user: string;
  fullName: string;
  email: string;
  active: boolean;
  assignedAtUtc: string;
  roleName: string;
  gender: string;
}

export interface RoleSummaryDto {
  id: string;
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  bgColor?: string | null;
  description?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
  active: boolean;
  usersCount: number;
  permissionsByRoute: Record<string, RolePermissionDto>;
  users: RoleUserDto[];
}

export interface UserRoleDto {
  roleId: string;
  key: string;
  name: string;
  icon?: string | null;
  assignedAtUtc: string;

}

export interface UserWithRolesDto {
  user: string;
  fullName: string;
  email: string;
  gender: string;
  mobile: string;
  phoneNumber: string;
  address: string;
  language: string;
  theme: string;
  active: boolean;
  idCompany: string;
  roles: UserRoleDto[];
}

export interface RolesPageDataResponse {
  roles: RoleSummaryDto[];
  usersWithRoles: UserWithRolesDto[];
}

export interface UpdateRoleRequest {
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  bgColor?: string | null;
  description?: string | null;
  active: boolean;
  permissionsByRoute: Record<string, RolePermissionDto>;
  users: string[];
}

export interface CreateRoleRequest {
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  bgColor?: string | null;
  description?: string | null;
  active: boolean;
  permissionsByRoute: Record<string, RolePermissionDto>;
  users: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RolesService extends BrowserApiService {
  private api = inject(ApiConfigService);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super(platformId);
  }

  getPageData(): Observable<ApiResponse & { data: RolesPageDataResponse }> {
    return this.browserOnly(() =>
      this.http.get<ApiResponse & { data: RolesPageDataResponse }>(`${this.api.baseUrl}/roles/page-data`)
    );
  }

  getById(id: string): Observable<ApiResponse & { data: { role: RoleSummaryDto } }> {
    
    return this.browserOnly(() =>
      this.http.get<ApiResponse & { data: { role: RoleSummaryDto } }>(`${this.api.baseUrl}/roles/${id}`)
    );
  }

  getUsersWithRoles(): Observable<ApiResponse & { data: { users: UserWithRolesDto[] } }> {
    return this.browserOnly(() =>
      this.http.get<ApiResponse & { data: { users: UserWithRolesDto[] } }>(`${this.api.baseUrl}/roles/users-with-roles`)
    );
  }

  createRole(body: CreateRoleRequest): Observable<ApiResponse & { data: { role: RoleSummaryDto } }> {
    return this.http.post<ApiResponse & { data: { role: RoleSummaryDto } }>(
      `${this.api.baseUrl}/roles`,
      body,
      { withCredentials: true }
    );
  }

  updateRole(id: string, body: UpdateRoleRequest): Observable<ApiResponse & { data: { role: RoleSummaryDto } }> {

    return this.http.put<ApiResponse & { data: { role: RoleSummaryDto } }>(
      `${this.api.baseUrl}/roles/${id}`,
      body,
      { withCredentials: true }
    );
  }

  removeUserFromRole(roleId: string, user: string): Observable<ApiResponse & { data: { role: RoleSummaryDto } }> {
    return this.http.delete<ApiResponse & { data: { role: RoleSummaryDto } }>(
      `${this.api.baseUrl}/roles/${roleId}/users?user=${encodeURIComponent(user)}`,
      { withCredentials: true }
    );
  }


}