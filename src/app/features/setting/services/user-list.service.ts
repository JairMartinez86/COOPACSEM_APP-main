import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from '../../../core/services/ApiConfigService ';


export interface ApiResponse {
  ok: boolean;
  mensaje: string;
  codigo: number;
  controller?: string;
  errorCode?: string;
}

export interface RoleSummaryDto {
  id: string;
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  bgColor?: string | null;
  description?: string | null;
  active: boolean;
  usersCount: number;
}

export interface UserSummaryDto {
  user: string;
  fullName: string;
  email: string;
  roleKey?: string | null;
  roleName?: string | null;
  status?: string | null;
  presence?: string | null;
  joinedAtUtc?: string | null;
  lastActiveAtUtc?: string | null;
  mobile?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
  address?: string | null;
  language?: string | null;
  defaultLandingPage?: string | null;
  theme?: string | null;
  enableTwoFactorLogin?: boolean;
  enableAuditEmailNotifications?: boolean;
  maxSessions?: number;
  active?: boolean;
}

export interface UserPageDataDto {
  roles: RoleSummaryDto[];
  users: UserSummaryDto[];
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password?: string | null;
  confirmPassword?: string | null;
  gender?: string | null;
  mobile?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  language?: string | null;
  defaultLandingPage?: string | null;
  theme?: string | null;
  enableTwoFactorLogin: boolean;
  enableAuditEmailNotifications: boolean;
  maxSessions: number;
  active: boolean;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  password?: string | null;
  confirmPassword?: string | null;
  gender?: string | null;
  mobile?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  language?: string | null;
  defaultLandingPage?: string | null;
  theme?: string | null;
  enableTwoFactorLogin: boolean;
  enableAuditEmailNotifications: boolean;
  maxSessions: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserListService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiConfigService);

  getPageData(): Observable<ApiResponse & { data: UserPageDataDto }> {
    return this.http.get<ApiResponse & { data: UserPageDataDto }>(
      `${this.api.baseUrl}/user-list`,
      { withCredentials: true }
    );
  }

  createUser(body: CreateUserRequest): Observable<ApiResponse & { data: { user: UserSummaryDto } }> {
    return this.http.post<ApiResponse & { data: { user: UserSummaryDto } }>(
      `${this.api.baseUrl}/user-list`,
      body,
      { withCredentials: true }
    );
  }

  updateUser(user: string, body: UpdateUserRequest): Observable<ApiResponse & { data: { user: UserSummaryDto } }> {
    return this.http.put<ApiResponse & { data: { user: UserSummaryDto } }>(
      `${this.api.baseUrl}/user-list/${encodeURIComponent(user)}`,
      body,
      { withCredentials: true }
    );
  }

  deleteUser(user: string): Observable<ApiResponse & { data: { user: string } }> {
    return this.http.delete<ApiResponse & { data: { user: string } }>(
      `${this.api.baseUrl}/user-list/${encodeURIComponent(user)}`,
      { withCredentials: true }
    );
  }

  resetPassword(user: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.api.baseUrl}/user-list/${encodeURIComponent(user)}/reset-password`,
      {},
      { withCredentials: true }
    );
  }
}