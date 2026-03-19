import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TableFilterService {
  private readonly activeKey$ = new BehaviorSubject<string | null>(null);
  private readonly filters = new Map<string, BehaviorSubject<string>>();

  setActiveKey(key: string | null): void {
    this.activeKey$.next(key);
  }

  setQueryForActiveRoute(query: string): void {
    const key = this.activeKey$.value;
    if (!key) return;

    this.getOrCreate(key).next(query ?? '');
  }

  query$(key: string): Observable<string> {
    return this.getOrCreate(key).pipe(
      map((value) => value ?? ''),
      distinctUntilChanged()
    );
  }

  activeQuery$(): Observable<string> {
    return this.activeKey$.pipe(
      map((key) => (key ? this.getOrCreate(key).value : '')),
      distinctUntilChanged()
    );
  }

  clear(key: string): void {
    this.getOrCreate(key).next('');
  }

  private getOrCreate(key: string): BehaviorSubject<string> {
    const existing = this.filters.get(key);
    if (existing) return existing;

    const subject = new BehaviorSubject<string>('');
    this.filters.set(key, subject);
    return subject;
  }
}