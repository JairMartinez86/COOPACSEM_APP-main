// table-filter.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TableFilterService {
  private activeKey$ = new BehaviorSubject<string | null>(null);

  // Mapa de filtros por key (users, orders, etc.)
  private filters = new Map<string, BehaviorSubject<string>>();

  setActiveKey(key: string | null) {
    this.activeKey$.next(key);
  }

  setQueryForActiveRoute(query: string) {
    const key = this.activeKey$.value;
    if (!key) return; // ruta sin tabla
    this.getOrCreate(key).next(query);
  }

  // Observable que un componente con tabla consume según su key
  query$(key: string): Observable<string> {
    return this.getOrCreate(key).pipe(
      map(v => v ?? ''),
      distinctUntilChanged()
    );
  }

  // Para que el sidebar muestre el valor actual cuando cambias de ruta
  activeQuery$(): Observable<string> {
    return this.activeKey$.pipe(
      map(key => (key ? this.getOrCreate(key).value : '')),
      distinctUntilChanged()
    );
  }

  clear(key: string) {
    this.getOrCreate(key).next('');
  }

  private getOrCreate(key: string) {
    const existing = this.filters.get(key);
    if (existing) return existing;
    const bs = new BehaviorSubject<string>('');
    this.filters.set(key, bs);
    return bs;
  }
}