import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfigService } from '../../core/services/ApiConfigService ';

@Injectable({ providedIn: 'root' })
export class FileManagerService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  list(entityId: string, rootFolder: string, path: string = ''): Observable<any> {
    const params = new HttpParams()
      .set('rootFolder', rootFolder)
      .set('path', path);

    return this.http.get<any>(
      `${this.api.baseUrl}/file-manager/${entityId}`,
      {
        params,
        withCredentials: true
      }
    );
  }

  createFolder(
    entityId: string,
    body: { rootFolder: string; folderName: string; path?: string | null }
  ): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/file-manager/${entityId}/folder`,
      body,
      { withCredentials: true }
    );
  }

  upload(entityId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/file-manager/${entityId}/upload`,
      formData,
      { withCredentials: true }
    );
  }

  delete(entityId: string, rootFolder: string, path: string): Observable<any> {
    const params = new HttpParams()
      .set('rootFolder', rootFolder)
      .set('path', path);

    return this.http.delete<any>(
      `${this.api.baseUrl}/file-manager/${entityId}`,
      {
        params,
        withCredentials: true
      }
    );
  }

  download(entityId: string, rootFolder: string, path: string): Observable<Blob> {
    const params = new HttpParams()
      .set('rootFolder', rootFolder)
      .set('path', path);

    return this.http.get(
      `${this.api.baseUrl}/file-manager/${entityId}/download`,
      {
        params,
        withCredentials: true,
        responseType: 'blob'
      }
    );
  }

  paste(
    entityId: string,
    body: {
      rootFolder: string;
      sourcePath: string;
      destinationPath?: string;
      mode: 'copy' | 'cut';
    }
  ): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/file-manager/${entityId}/paste`,
      body,
      { withCredentials: true }
    );
  }

  rename(
    entityId: string,
    body: {
      rootFolder: string;
      path: string;
      newName: string;
    }
  ): Observable<any> {
    return this.http.post<any>(
      `${this.api.baseUrl}/file-manager/${entityId}/rename`,
      body,
      { withCredentials: true }
    );
  }

  getFilePreviewUrl(entityId: string, rootFolder: string, path: string): string {
    const params = new URLSearchParams({
      rootFolder,
      path
    });

    return `${this.api.baseUrl}/file-manager/${entityId}/download?${params.toString()}`;
  }
}