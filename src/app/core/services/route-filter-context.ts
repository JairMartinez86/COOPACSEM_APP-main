// route-filter-context.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TableFilterService } from './table-filter.service';

@Injectable({ providedIn: 'root' })
export class RouteFilterContext {
  constructor(
    private router: Router,
    private ar: ActivatedRoute,
    private filterSvc: TableFilterService
  ) {}

  init() {
    // ✅ sincroniza al iniciar
    this.sync();

    // ✅ sincroniza al navegar
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.sync());
  }

  private sync() {
    const deepest = this.deepest(this.ar);
    const key = deepest?.snapshot.data?.['tableFilterKey'] ?? null;
    this.filterSvc.setActiveKey(key);
  }

  private deepest(r: ActivatedRoute): ActivatedRoute {
    while (r.firstChild) r = r.firstChild;
    return r;
  }
}