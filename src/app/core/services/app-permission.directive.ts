import {
  Directive,
  ElementRef,
  Inject,
  Input,
  OnChanges,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  SimpleChanges,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PermissionAction, PermissionService } from './permission.service';

type PermissionInput = PermissionAction | 'new' | Array<PermissionAction | 'new'>;

@Directive({
  selector: '[appPermission]',
  standalone: true
})
export class AppPermissionDirective implements OnInit, OnChanges {
  @Input('appPermission') actions!: PermissionInput;
  @Input() permissionRoute?: string;
  @Input() permissionMode: 'hide' | 'disable' = 'hide';

  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private permissionService: PermissionService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.applyPermission();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (changes['actions'] || changes['permissionRoute'] || changes['permissionMode']) {
      this.applyPermission();
    }
  }

  private applyPermission(): void {
    const route = this.getPermissionRoute();
    const allowed = this.hasAnyPermission(route);
    const element = this.el.nativeElement;

    if (this.permissionMode === 'hide') {
      this.renderer.setStyle(element, 'display', allowed ? '' : 'none');
      return;
    }

    if (!allowed) {
      this.renderer.setAttribute(element, 'disabled', 'true');
      this.renderer.addClass(element, 'disabled');
      this.renderer.setStyle(element, 'pointer-events', 'none');
      this.renderer.setStyle(element, 'opacity', '0.65');
    } else {
      this.renderer.removeAttribute(element, 'disabled');
      this.renderer.removeClass(element, 'disabled');
      this.renderer.removeStyle(element, 'pointer-events');
      this.renderer.removeStyle(element, 'opacity');
    }
  }

  private getPermissionRoute(): string {
    if (this.permissionRoute?.trim()) {
      return this.normalizeRoute(this.permissionRoute);
    }

    const routeFromData = this.getDeepestPermissionFromRoute(this.activatedRoute);
    if (routeFromData) {
      return this.normalizeRoute(routeFromData);
    }

    return this.normalizeRoute(this.router.url.split('?')[0].split('#')[0]);
  }

  private getDeepestPermissionFromRoute(route: ActivatedRoute): string | null {
    let current: ActivatedRoute | null = route;
    let permission: string | null = null;

    while (current) {
      const currentPermission = current.snapshot.data?.['permission'];
      if (typeof currentPermission === 'string' && currentPermission.trim()) {
        permission = currentPermission;
      }

      current = current.firstChild;
    }

    return permission;
  }

  private hasAnyPermission(route: string): boolean {
    const actions = Array.isArray(this.actions) ? this.actions : [this.actions];

    return actions
      .map(action => this.normalizeAction(action))
      .some(action => this.permissionService.has(action, route));
  }

  private normalizeAction(action: PermissionAction | 'new'): PermissionAction {
    return action === 'new' ? 'create' : action;
  }

  private normalizeRoute(route: string): string {
    return ('/' + (route || '').trim().replace(/^\/+/, ''))
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}