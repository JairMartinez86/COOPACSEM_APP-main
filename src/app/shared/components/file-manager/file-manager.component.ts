import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export interface FileManagerConfig {
  entityId: string | null | undefined;
  module: string;
  baseFolder?: string;
  readOnly?: boolean;
}

export interface FileManagerItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  extension?: string;
  lastModified?: string;
}

export interface FileManagerListResponse {
  data?: {
    currentPath?: string;
    items?: FileManagerItem[];
  };
}

export interface IFileManagerService {
  list(
    entityId: string,
    module: string,
    path?: string,
    baseFolder?: string
  ): Observable<any>;

  upload(
    entityId: string,
    module: string,
    formData: FormData,
    baseFolder?: string
  ): Observable<any>;

  createFolder(
    entityId: string,
    module: string,
    body: { folderName: string; path?: string },
    baseFolder?: string
  ): Observable<any>;

  delete(
    entityId: string,
    module: string,
    path: string,
    baseFolder?: string
  ): Observable<any>;

  download(
    entityId: string,
    module: string,
    path: string,
    baseFolder?: string
  ): Observable<Blob>;

  paste(
    entityId: string,
    module: string,
    body: {
      sourcePath: string;
      destinationPath?: string;
      mode: 'copy' | 'cut';
    },
    baseFolder?: string
  ): Observable<any>;

  rename?(
    entityId: string,
    module: string,
    body: {
      path: string;
      newName: string;
    },
    baseFolder?: string
  ): Observable<any>;
}

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './file-manager.component.html',
  styleUrls: ['./file-manager.component.scss']
})
export class FileManagerComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);

  @Input({ required: true }) config!: FileManagerConfig;
  @Input({ required: true }) fileService!: IFileManagerService;

  @Input() notify?: {
    show?: (message: string, title?: string, type?: string) => void;
    showFromApiResponse?: (response: any, type?: string) => void;
  };

  @Input() acceptedExtensions =
    '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xlsx,.xls,.txt,.csv,.json,.xml';

  fileItems: FileManagerItem[] = [];
  currentFilePath = '';
  uploadingFiles = false;
  creatingFolder = false;
  creatingInlineFolder = false;
  newFolderName = '';
  previewUrls: Record<string, string> = {};
  draggedItem: FileManagerItem | null = null;
  dragOverFolderPath: string | null = null;
  isDragOverContent = false;
  isExternalDragOver = false;
  contextMenuMode: 'item' | 'background' | null = null;

  selectedItem: FileManagerItem | null = null;
  clipboardItem: FileManagerItem | null = null;
  clipboardMode: 'copy' | 'cut' | null = null;

  ngOnInit(): void {
    this.loadFiles();
  }

  ngOnDestroy(): void {
    this.clearPreviewUrls();
    this.hideContextMenu();
  }

  get readOnly(): boolean {
    return !!this.config?.readOnly;
  }


  get folderItems(): FileManagerItem[] {
    return (this.fileItems ?? []).filter(x => x.isDirectory);
  }

  get fileOnlyItems(): FileManagerItem[] {
    return (this.fileItems ?? []).filter(x => !x.isDirectory);
  }

  loadFiles(path: string = ''): void {

    this.fileService.list(
      this.config.entityId!,
      this.config.module,
      path,
      this.config.baseFolder
    ).subscribe({
      next: (res: FileManagerListResponse) => {
        this.fileItems = res?.data?.items ?? [];
        this.currentFilePath = res?.data?.currentPath ?? '';
        this.selectedItem = null;
        this.loadImagePreviews();
        this.hideContextMenu();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.fileItems = [];
        this.currentFilePath = '';
        this.selectedItem = null;
        this.clearPreviewUrls();
        this.hideContextMenu();
        this.notify?.showFromApiResponse?.(err, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  selectItem(item: FileManagerItem): void {
    this.selectedItem = item;
  }

  openFolder(item: FileManagerItem): void {
    if ( !item?.isDirectory) return;
    this.selectedItem = item;
    this.loadFiles(item.relativePath);
  }

  goToParentFolder(): void {
    if ( !this.currentFilePath) return;

    const parts = this.currentFilePath.split('/').filter(Boolean);
    parts.pop();
    this.loadFiles(parts.join('/'));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if ( this.readOnly || !files?.length) {
      input.value = '';
      return;
    }

    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    formData.append('path', this.currentFilePath || '');

    this.uploadingFiles = true;

    this.fileService.upload(
      this.config.entityId!,
      this.config.module,
      formData,
      this.config.baseFolder
    ).subscribe({
      next: () => {
        this.uploadingFiles = false;
        this.loadFiles(this.currentFilePath);
        input.value = '';
      },
      error: (err) => {
        this.uploadingFiles = false;
        this.notify?.showFromApiResponse?.(err, 'error');
        input.value = '';
      }
    });
  }

  startInlineFolderCreation(): void {
    if (this.readOnly) {
      this.notify?.show?.(
        this.translate.instant('fileManager.messages.saveBeforeUse'),
        '',
        'warning'
      );
      return;
    }

    this.hideContextMenu();
    this.creatingInlineFolder = true;
    this.newFolderName = '';

    setTimeout(() => {
      const input = document.querySelector('.fm-inline-input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  onInlineFolderFocusOut(): void {
    setTimeout(() => {
      if (!this.creatingInlineFolder) return;

      const folderName = this.newFolderName?.trim();

      if (!folderName) {
        this.cancelCreateFolder();
        return;
      }

      this.confirmCreateFolder();
    });
  }

  confirmCreateFolder(): void {
    if (this.creatingFolder || this.readOnly) return;

    const folderName = this.newFolderName?.trim();

    if (!folderName) {
      this.cancelCreateFolder();
      return;
    }

    this.creatingFolder = true;

    this.fileService.createFolder(
      this.config.entityId!,
      this.config.module,
      {
        folderName,
        path: this.currentFilePath || ''
      },
      this.config.baseFolder
    ).subscribe({
      next: () => {
        this.creatingFolder = false;
        this.creatingInlineFolder = false;
        this.newFolderName = '';
        this.loadFiles(this.currentFilePath);
      },
      error: (err) => {
        this.creatingFolder = false;
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  cancelCreateFolder(): void {
    this.creatingInlineFolder = false;
    this.newFolderName = '';
  }

  downloadFile(item: FileManagerItem): void {
    if ( item?.isDirectory) return;

    this.fileService.download(
      this.config.entityId!,
      this.config.module,
      item.relativePath,
      this.config.baseFolder
    ).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  deleteFileItem(item: FileManagerItem): void {
    if ( this.readOnly || !item?.relativePath) return;

    this.fileService.delete(
      this.config.entityId!,
      this.config.module,
      item.relativePath,
      this.config.baseFolder
    ).subscribe({
      next: () => {
        this.selectedItem = null;
        this.loadFiles(this.currentFilePath);
      },
      error: (err) => {
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
  }

  isImage(item: FileManagerItem): boolean {
    const ext = (item?.extension || '').toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  }

  resolveFileType(item: FileManagerItem): string {
    const ext = (item?.extension || '').toLowerCase();

    if (this.isImage(item)) return 'image';
    if (ext === '.pdf') return 'pdf';
    if (ext === '.doc' || ext === '.docx') return 'document';
    if (ext === '.xls' || ext === '.xlsx') return 'excel';
    if (ext === '.txt' || ext === '.csv' || ext === '.json' || ext === '.xml') return 'text';

    return 'document';
  }

  getFileTypeClass(item: FileManagerItem): string {
    const type = this.resolveFileType(item);

    switch (type) {
      case 'pdf':
        return 'pdf';
      case 'excel':
        return 'excel';
      case 'text':
        return 'text';
      case 'document':
        return 'document';
      case 'image':
        return 'images';
      default:
        return 'document';
    }
  }

  getFileIconClass(item: FileManagerItem): string {
    const ext = (item?.extension || '').toLowerCase();

    switch (ext) {
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.webp':
      case '.gif':
        return 'fa-duotone fa-solid fa-image';

      case '.pdf':
        return 'fa-duotone fa-solid fa-file-pdf';

      case '.doc':
      case '.docx':
        return 'fa-duotone fa-solid fa-file-word';

      case '.xls':
      case '.xlsx':
        return 'fa-duotone fa-solid fa-file-excel';

      case '.txt':
      case '.csv':
      case '.json':
      case '.xml':
        return 'bi-file-earmark-text';

      default:
        return 'bi-file-earmark';
    }
  }

  private loadImagePreviews(): void {
    this.clearPreviewUrls();

    const images = (this.fileItems ?? []).filter(
      x => !x.isDirectory && this.isImage(x)
    );

    if ( !images.length) return;

    for (const item of images) {
      this.fileService.download(
        this.config.entityId!,
        this.config.module,
        item.relativePath,
        this.config.baseFolder
      ).subscribe({
        next: (blob: Blob) => {
          this.previewUrls[item.relativePath] = URL.createObjectURL(blob);
          this.cdr.detectChanges();
        },
        error: () => {
          this.previewUrls[item.relativePath] = '';
        }
      });
    }
  }

  private clearPreviewUrls(): void {
    Object.values(this.previewUrls).forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });

    this.previewUrls = {};
  }

  onRightClick(event: MouseEvent, item: FileManagerItem): void {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.getElementById('fmContextMenu');
    if (!menu) return;

    this.hideContextMenu();

    this.selectedItem = item;
    this.contextMenuMode = 'item';

    const menuWidth = 220;
    const menuHeight = 230;

    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    void menu.offsetWidth;
    menu.classList.add('show');
  }

  onLeftClickBackground(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (target?.closest('.fm-item')) return;

    this.selectedItem = null;
    this.hideContextMenu();
  }

  onRightClickBackground(event: MouseEvent): void {
    if (this.readOnly) return;

    const target = event.target as HTMLElement | null;

    if (target?.closest('.fm-item')) return;

    event.preventDefault();
    event.stopPropagation();

    const menu = document.getElementById('fmContextMenu');
    if (!menu) return;

    this.hideContextMenu();

    this.selectedItem = null;
    this.contextMenuMode = 'background';

    const menuWidth = 220;
    const menuHeight = this.clipboardItem ? 140 : 95;

    let x = event.clientX;
    let y = event.clientY;

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }

    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    void menu.offsetWidth;
    menu.classList.add('show');
  }

  private hideContextMenu(): void {
    const menu = document.getElementById('fmContextMenu');
    if (!menu) return;

    menu.classList.remove('show');
    menu.style.left = '-9999px';
    menu.style.top = '-9999px';
    this.contextMenuMode = null;
  }

  contextActionNewFolder(): void {
    this.startInlineFolderCreation();
  }

  contextActionCopy(): void {
    this.hideContextMenu();

    if (!this.selectedItem) return;

    this.clipboardItem = { ...this.selectedItem };
    this.clipboardMode = 'copy';
  }

  contextActionCut(): void {
    if (this.readOnly) return;

    this.hideContextMenu();

    if (!this.selectedItem) return;

    this.clipboardItem = { ...this.selectedItem };
    this.clipboardMode = 'cut';
  }

  contextActionPaste(): void {
    if (this.readOnly) return;

    this.hideContextMenu();

    if (!this.clipboardItem || !this.clipboardMode) return;

    const body = {
      sourcePath: this.clipboardItem.relativePath,
      destinationPath: this.currentFilePath || '',
      mode: this.clipboardMode
    };

    this.fileService.paste(
      this.config.entityId!,
      this.config.module,
      body,
      this.config.baseFolder
    ).subscribe({
      next: () => {
        if (this.clipboardMode === 'cut') {
          this.clipboardItem = null;
          this.clipboardMode = null;
        }

        this.loadFiles(this.currentFilePath);
      },
      error: (err) => {
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  contextActionDelete(): void {
    if (this.readOnly) return;

    this.hideContextMenu();

    if (!this.selectedItem) return;

    this.deleteFileItem(this.selectedItem);
  }

  onDragStart(event: DragEvent, item: FileManagerItem): void {
    if (this.readOnly) return;

    this.draggedItem = item;

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.draggedItem = null;
    this.dragOverFolderPath = null;
    this.isDragOverContent = false;
  }

  onDragOverFolder(event: DragEvent, folder: FileManagerItem): void {
    if (this.readOnly || !folder?.isDirectory || !this.draggedItem) return;

    event.preventDefault();
    this.dragOverFolderPath = folder.relativePath;
  }

  onDragLeaveFolder(folder: FileManagerItem): void {
    if (this.dragOverFolderPath === folder.relativePath) {
      this.dragOverFolderPath = null;
    }
  }

  onDropOnFolder(event: DragEvent, folder: FileManagerItem): void {
    event.preventDefault();

    if (this.readOnly || !this.draggedItem) return;

    this.fileService.paste(
      this.config.entityId!,
      this.config.module,
      {
        sourcePath: this.draggedItem.relativePath,
        destinationPath: folder.relativePath,
        mode: 'cut'
      },
      this.config.baseFolder
    ).subscribe({
      next: () => {
        this.onDragEnd();
        this.loadFiles(this.currentFilePath);
      },
      error: (err) => {
        this.onDragEnd();
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  onDragOverContent(event: DragEvent): void {
    if (this.readOnly || !this.draggedItem) return;

    event.preventDefault();
    this.isDragOverContent = true;
  }

  onDragLeaveContent(): void {
    this.isDragOverContent = false;
  }

  onDropOnCurrentFolder(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (this.readOnly || !this.draggedItem ) {
      this.onDragEnd();
      return;
    }

    const sourcePath = this.draggedItem.relativePath || '';
    const destinationPath = this.currentFilePath || '';

    if (!sourcePath) {
      this.onDragEnd();
      return;
    }

    const sourceParts = sourcePath.split('/').filter(Boolean);
    sourceParts.pop();
    const sourceParent = sourceParts.join('/');

    if (sourceParent === destinationPath) {
      this.onDragEnd();
      return;
    }

    this.fileService.paste(
      this.config.entityId!,
      this.config.module,
      {
        sourcePath,
        destinationPath,
        mode: 'cut'
      },
      this.config.baseFolder
    ).subscribe({
      next: () => {
        this.onDragEnd();
        this.loadFiles(this.currentFilePath);
      },
      error: (err) => {
        this.onDragEnd();
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  onExternalDragOver(event: DragEvent): void {
    if ( this.readOnly) return;

    event.preventDefault();
    event.stopPropagation();

    const hasFiles = Array.from(event.dataTransfer?.types ?? []).includes('Files');
    if (!hasFiles) return;

    this.isExternalDragOver = true;

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onExternalDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;

    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }

    this.isExternalDragOver = false;
  }

  onExternalDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isExternalDragOver = false;

    if ( this.readOnly) {
      return;
    }

    const files = event.dataTransfer?.files;
    if (!files?.length) {
      return;
    }

    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    formData.append('path', this.currentFilePath || '');

    this.uploadingFiles = true;

    this.fileService.upload(
      this.config.entityId!,
      this.config.module,
      formData,
      this.config.baseFolder
    ).subscribe({
      next: () => {
        this.uploadingFiles = false;
        this.loadFiles(this.currentFilePath);
      },
      error: (err) => {
        this.uploadingFiles = false;
        this.notify?.showFromApiResponse?.(err, 'error');
      }
    });
  }

  onUnifiedDragOver(event: DragEvent): void {
    const hasExternalFiles = Array.from(event.dataTransfer?.types ?? []).includes('Files');

    if (hasExternalFiles && !this.draggedItem) {
      this.onExternalDragOver(event);
      return;
    }

    this.onDragOverContent(event);
  }

  onUnifiedDragLeave(event: DragEvent): void {
    if (this.isExternalDragOver && !this.draggedItem) {
      this.onExternalDragLeave(event);
      return;
    }

    this.onDragLeaveContent();
  }

  onUnifiedDrop(event: DragEvent): void {
    const hasExternalFiles = !!event.dataTransfer?.files?.length;

    if (hasExternalFiles && !this.draggedItem) {
      this.onExternalDrop(event);
      return;
    }

    this.onDropOnCurrentFolder(event);
  }
}