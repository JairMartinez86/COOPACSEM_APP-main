import { Injectable } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, debounceTime } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { NotificationService } from './notification.service';

export interface DraftManagerOptions<T, M = any> {
  form?: NgForm;
  routeKey?: string;

  currentData: () => T;
  savedData: () => T;

  restoreData: (data: T) => void;
  restoreSavedData?: (data: T) => void;

  currentMeta?: () => M;
  restoreMeta?: (meta: M | undefined) => void;

  patchEngine?: (data: T) => void;
  normalize?: (data: Partial<T> | null | undefined) => Partial<T>;

  warningTitleKey?: string;
  warningMessageKey?: string;
  onDraftRestored?: (data: T) => void;
}

export interface DraftManagerRef {
  saveNow: () => void;
  clear: () => void;
  cancel: () => void;
  destroy: () => void;
}

interface StoredDraft<T, M = any> {
  current: Partial<T>;
  saved: Partial<T>;
  meta?: M;
}

@Injectable({ providedIn: 'root' })
export class DraftFormService {
  constructor(
    private router: Router,
    private notify: NotificationService,
    private translate: TranslateService
  ) {}

  connect<T, M = any>(options: DraftManagerOptions<T, M>): DraftManagerRef {
    const routeKey = options.routeKey || this.buildRouteKey();
    const storageKey = `draft:${routeKey}`;

    let sub: Subscription | undefined;
    let skipSave = false;
    let restoring = false;

    let restoredSavedSnapshot: Partial<T> | null = null;
    let restoredMeta: M | undefined;

    const normalize = (data: Partial<T> | null | undefined): Partial<T> => {
      if (options.normalize) {
        return options.normalize(data);
      }

      return this.deepClone((data ?? {}) as Partial<T>);
    };

    const clearRestoreContext = () => {
      restoredSavedSnapshot = null;
      restoredMeta = undefined;
    };

    const hasStoredDraft = (): boolean => {
      try {
        return !!localStorage.getItem(storageKey);
      } catch {
        return false;
      }
    };

    const clearStorage = () => {
      localStorage.removeItem(storageKey);
    };

    const clear = () => {
      clearStorage();
      clearRestoreContext();
    };

    const getDraft = (): StoredDraft<T, M> | null => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw);

        if (
          parsed &&
          typeof parsed === 'object' &&
          ('current' in parsed || 'saved' in parsed || 'meta' in parsed)
        ) {
          return {
            current: parsed.current ?? {},
            saved: parsed.saved ?? normalize(options.savedData()),
            meta: parsed.meta
          };
        }

        return {
          current: parsed ?? {},
          saved: normalize(options.savedData()),
          meta: undefined
        };
      } catch {
        return null;
      }
    };

    const runWithoutSaving = (fn: () => void) => {
      skipSave = true;

      try {
        fn();
      } finally {
        queueMicrotask(() => {
          skipSave = false;
        });
      }
    };

    const areEqual = (a: any, b: any): boolean => {
      return this.stableStringify(a) === this.stableStringify(b);
    };

    const hasPendingChanges = (draft: StoredDraft<T, M> | null): boolean => {
      if (!draft) {
        return false;
      }

      const normalizedCurrent = normalize(draft.current);
      const normalizedSaved = normalize(draft.saved);

      return !areEqual(normalizedCurrent, normalizedSaved);
    };

    const saveNow = () => {
      try {
        if (skipSave || restoring) {
          return;
        }

        const current = normalize(options.currentData());
        const saved = normalize(options.savedData());

        if (areEqual(current, saved)) {
          clear();
          return;
        }

        const payload: StoredDraft<T, M> = {
          current,
          saved,
          meta: options.currentMeta?.()
        };

        localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // ignore
      }
    };

    const cancel = () => {
      const useRestoredSnapshot = hasStoredDraft() && !!restoredSavedSnapshot;

      const base = (useRestoredSnapshot
        ? restoredSavedSnapshot
        : normalize(options.savedData())) as T;

      const meta = useRestoredSnapshot
        ? restoredMeta
        : options.currentMeta?.();

      clearStorage();

      runWithoutSaving(() => {
        options.restoreSavedData?.(base);
        options.restoreMeta?.(meta);
        options.restoreData(base);
        options.form?.resetForm(base as any);
        options.patchEngine?.(base);
      });

      clearRestoreContext();
    };

    const restoreIfNeeded = () => {
      const draft = getDraft();

      if (!draft) {
        clearRestoreContext();
        return;
      }

      if (!hasPendingChanges(draft)) {
        clear();
        return;
      }

      restoring = true;

      const current = normalize(draft.current) as T;
      const saved = normalize(draft.saved) as T;

      restoredSavedSnapshot = saved;
      restoredMeta = draft.meta;

      runWithoutSaving(() => {
        options.restoreSavedData?.(saved);
        options.restoreMeta?.(draft.meta);
        options.restoreData(current);
        options.form?.resetForm(current as any);
        options.patchEngine?.(current);
      });

      options.onDraftRestored?.(current);

      queueMicrotask(() => {
        restoring = false;

        const title =
          this.translate.instant(
            options.warningTitleKey || 'draft.unsavedDataTitle'
          ) || 'Warning';

        const message =
          this.translate.instant(
            options.warningMessageKey || 'draft.unsavedDataRestored'
          ) ||
          'Unsaved data was found and restored. If you want to discard it, press Cancel.';

        const ref = this.notify.confirm(message, title, 'warning');
        if (!ref) {
          return;
        }

        ref.subscribe((result: number) => {
          if (result === 1) {
            return;
          }

          if (result === 2) {
            cancel();
          }
        });
      });
    };

    if (options.form?.valueChanges) {
      sub = options.form.valueChanges
        .pipe(debounceTime(300))
        .subscribe(() => {
          if (skipSave || restoring) {
            return;
          }

          saveNow();
        });
    }

    restoreIfNeeded();

    return {
      saveNow,
      clear,
      cancel,
      destroy: () => {
        sub?.unsubscribe();
      }
    };
  }

  private buildRouteKey(): string {
    return (
      this.router.url
        .split('?')[0]
        .replace(/\//g, '_')
        .replace(/^_+|_+$/g, '') || 'root'
    );
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private stableStringify(value: any): string {
    return JSON.stringify(this.sortKeysDeep(value));
  }

  private sortKeysDeep(value: any): any {
    if (Array.isArray(value)) {
      return value.map(v => this.sortKeysDeep(v));
    }

    if (value && typeof value === 'object' && value.constructor === Object) {
      return Object.keys(value)
        .sort()
        .reduce((acc: any, key) => {
          acc[key] = this.sortKeysDeep(value[key]);
          return acc;
        }, {});
    }

    return value;
  }
}