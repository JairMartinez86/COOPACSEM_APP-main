import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TableFilterService } from './table-filter.service';

@Injectable({ providedIn: 'root' })
export class RouteFilterContext {
  private started = false;

  constructor(
    private router: Router,
    private filterSvc: TableFilterService
  ) {}

  init(): void {
    if (this.started) return;
    this.started = true;

    this.sync();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.sync());
  }

  private sync(): void {
    const root = this.router.routerState.snapshot.root;
    const deepest = this.getDeepestSnapshot(root);
    const key = deepest.data?.['tableFilterKey'] ?? null;

    this.filterSvc.setActiveKey(key);

    console.log('ACTIVE KEY:', key, 'URL:', this.router.url);
  }

  private getDeepestSnapshot(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = route;

    while (current.firstChild) {
      current = current.firstChild;
    }

    return current;
  }
}