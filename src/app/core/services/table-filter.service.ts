import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export interface TableFilterConfig {
  requireEnter?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TableFilterService {
  private readonly activeKey$ = new BehaviorSubject<string | null>(null);

  // texto escrito
  private readonly drafts = new Map<string, BehaviorSubject<string>>();

  // filtro aplicado
  private readonly queries = new Map<string, BehaviorSubject<string>>();

  private readonly configs = new Map<string, BehaviorSubject<TableFilterConfig>>();

  setActiveKey(key: string | null): void {
    this.activeKey$.next(key);
  }

  getActiveKey(): string | null {
    return this.activeKey$.value;
  }

  setConfig(key: string, config: TableFilterConfig): void {
    this.getOrCreateConfig(key).next({
      ...this.getOrCreateConfig(key).value,
      ...config
    });
  }

  config$(key: string): Observable<TableFilterConfig> {
    return this.getOrCreateConfig(key).pipe(
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
  }

  requireEnter$(key: string): Observable<boolean> {
    return this.getOrCreateConfig(key).pipe(
      map(config => !!config?.requireEnter),
      distinctUntilChanged()
    );
  }

  getRequireEnter(key: string): boolean {
    return !!this.getOrCreateConfig(key).value?.requireEnter;
  }

  // =========================
  // DRAFT (texto escrito)
  // =========================
  setDraftForActiveRoute(value: string): void {
    const key = this.activeKey$.value;
    if (!key) return;

    this.getOrCreateDraft(key).next(value ?? '');
  }

  setDraft(key: string, value: string): void {
    this.getOrCreateDraft(key).next(value ?? '');
  }

  draft$(key: string): Observable<string> {
    return this.getOrCreateDraft(key).pipe(
      map(value => value ?? ''),
      distinctUntilChanged()
    );
  }

  activeDraft$(): Observable<string> {
    return this.activeKey$.pipe(
      map(key => (key ? this.getOrCreateDraft(key).value : '')),
      distinctUntilChanged()
    );
  }

  // =========================
  // QUERY (filtro aplicado)
  // =========================
  setQueryForActiveRoute(query: string): void {
    const key = this.activeKey$.value;
    if (!key) return;

    const value = query ?? '';
    this.getOrCreateQuery(key).next(value);

    // opcional: al aplicar filtro, sincronizamos draft también
    this.getOrCreateDraft(key).next(value);
  }

  setQuery(key: string, query: string): void {
    const value = query ?? '';
    this.getOrCreateQuery(key).next(value);
    this.getOrCreateDraft(key).next(value);
  }

  query$(key: string): Observable<string> {
    return this.getOrCreateQuery(key).pipe(
      map(value => value ?? ''),
      distinctUntilChanged()
    );
  }

  activeQuery$(): Observable<string> {
    return this.activeKey$.pipe(
      map(key => (key ? this.getOrCreateQuery(key).value : '')),
      distinctUntilChanged()
    );
  }

  clear(key: string): void {
    this.getOrCreateDraft(key).next('');
    this.getOrCreateQuery(key).next('');
  }

  private getOrCreateDraft(key: string): BehaviorSubject<string> {
    const existing = this.drafts.get(key);
    if (existing) return existing;

    const subject = new BehaviorSubject<string>('');
    this.drafts.set(key, subject);
    return subject;
  }

  private getOrCreateQuery(key: string): BehaviorSubject<string> {
    const existing = this.queries.get(key);
    if (existing) return existing;

    const subject = new BehaviorSubject<string>('');
    this.queries.set(key, subject);
    return subject;
  }

  private getOrCreateConfig(key: string): BehaviorSubject<TableFilterConfig> {
    const existing = this.configs.get(key);
    if (existing) return existing;

    const subject = new BehaviorSubject<TableFilterConfig>({
      requireEnter: false
    });

    this.configs.set(key, subject);
    return subject;
  }
}