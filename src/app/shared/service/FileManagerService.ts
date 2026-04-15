import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IFileManagerService } from '../components/file-manager/file-manager.component';
import { ApiConfigService } from '../../core/services/ApiConfigService ';

@Injectable({ providedIn: 'root' })
export class FileManagerService implements IFileManagerService {
  private http = inject(HttpClient);
  private api = inject(ApiConfigService);

  list(
    entityId: string,
    module: string,
    path?: string,
    baseFolder?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('module', module)
      .set('path', path ?? '');

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

    return this.http.get(
      `${this.api.baseUrl}/file-manager/${entityId}`,
      {
        params,
        withCredentials: true
      }
    );
  }

  createFolder(
    entityId: string,
    module: string,
    body: { folderName: string; path?: string | null },
    baseFolder?: string
  ): Observable<any> {
    let params = new HttpParams().set('module', module);

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

    return this.http.post(
      `${this.api.baseUrl}/file-manager/${entityId}/folder`,
      body,
      {
        params,
        withCredentials: true
      }
    );
  }

  upload(
    entityId: string,
    module: string,
    formData: FormData,
    baseFolder?: string
  ): Observable<any> {
    let params = new HttpParams().set('module', module);

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

    return this.http.post(
      `${this.api.baseUrl}/file-manager/${entityId}/upload`,
      formData,
      {
        params,
        withCredentials: true
      }
    );
  }

  delete(
    entityId: string,
    module: string,
    path: string,
    baseFolder?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('module', module)
      .set('path', path);

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

    return this.http.delete(
      `${this.api.baseUrl}/file-manager/${entityId}`,
      {
        params,
        withCredentials: true
      }
    );
  }

  download(
    entityId: string,
    module: string,
    path: string,
    baseFolder?: string
  ): Observable<Blob> {
    let params = new HttpParams()
      .set('module', module)
      .set('path', path);

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

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
    module: string,
    body: {
      sourcePath: string;
      destinationPath?: string;
      mode: 'copy' | 'cut';
    },
    baseFolder?: string
  ): Observable<any> {
    let params = new HttpParams().set('module', module);

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

    return this.http.post(
      `${this.api.baseUrl}/file-manager/${entityId}/paste`,
      body,
      {
        params,
        withCredentials: true
      }
    );
  }

  rename(
    entityId: string,
    module: string,
    body: {
      path: string;
      newName: string;
    },
    baseFolder?: string
  ): Observable<any> {
    let params = new HttpParams().set('module', module);

    if (baseFolder?.trim()) {
      params = params.set('baseFolder', baseFolder.trim());
    }

    return this.http.post(
      `${this.api.baseUrl}/file-manager/${entityId}/rename`,
      body,
      {
        params,
        withCredentials: true
      }
    );
  }

  getFilePreviewUrl(
    entityId: string,
    module: string,
    path: string,
    baseFolder?: string
  ): string {
    const params = new URLSearchParams({
      module,
      path
    });

    if (baseFolder?.trim()) {
      params.set('baseFolder', baseFolder.trim());
    }

    return `${this.api.baseUrl}/file-manager/${entityId}/download?${params.toString()}`;
  }
}