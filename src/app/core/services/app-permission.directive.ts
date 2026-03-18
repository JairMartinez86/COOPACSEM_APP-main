import {
  Directive,
  ElementRef,
  Inject,
  Input,
  OnInit,
  PLATFORM_ID,
  Renderer2
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PermissionAction, PermissionService } from './permission.service';

@Directive({
  selector: '[appPermission]',
  standalone: true
})
export class AppPermissionDirective implements OnInit {
  @Input('appPermission') action!: PermissionAction;
  @Input() permissionRoute?: string;
  @Input() permissionMode: 'hide' | 'disable' = 'hide';

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

  private applyPermission(): void {
    const route = this.permissionRoute || window.location.pathname;
    const allowed = this.permissionService.has(this.action, route);
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
}