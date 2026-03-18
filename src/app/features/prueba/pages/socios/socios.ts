import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';

@Component({
  selector: 'app-socios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './socios.html',
  styleUrl: './socios.scss',
})
export class Socios implements AfterViewInit, OnDestroy {
  @ViewChild('wizardSlot') wizardSlotRef?: ElementRef<HTMLElement>;
  @ViewChild('wizardCard') wizardCardRef?: ElementRef<HTMLElement>;
  @ViewChild('wizardSteps') wizardStepsRef?: ElementRef<HTMLElement>;
  @ViewChildren('wizardStep') wizardStepRefs?: QueryList<ElementRef<HTMLElement>>;

  activeSection = 'datos-personales';

  readonly sections = [
    'datos-personales',
    'actividad-economica',
    'datos-conyuge',
    'beneficiarios',
  ];

  wizardAffixed = false;
  wizardPlaceholderHeight = 0;
  wizardPosition = '';
  wizardTop = '';
  wizardLeft = '';
  wizardWidth = '';
  wizardZIndex = '';

  private readonly isBrowser: boolean;
  private readonly desktopBreakpoint = 1200;
  private readonly affixTopDesktop = 96;
  private readonly affixTopMobile = 8;
  private readonly scrollOffsetDesktop = 112;
  private readonly scrollOffsetMobile = 120;

  private readonly onScrollBound = () => {
    this.zone.run(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  private readonly onResizeBound = () => {
    this.zone.run(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  private readonly onFocusInBound = (event: Event) => {
    this.zone.run(() => {
      this.updateActiveSectionFromEvent(event);
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  private readonly onClickBound = (event: Event) => {
    this.zone.run(() => {
      this.updateActiveSectionFromEvent(event);
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    });
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    window.addEventListener('scroll', this.onScrollBound, { passive: true });
    window.addEventListener('resize', this.onResizeBound, { passive: true });
    window.document.addEventListener('focusin', this.onFocusInBound);
    window.document.addEventListener('click', this.onClickBound);

    setTimeout(() => {
      this.updateActiveSectionByScroll();
      this.updateWizardAffix();
      this.syncWizardHorizontalScroll();
      this.cdr.detectChanges();
    }, 0);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    window.removeEventListener('scroll', this.onScrollBound);
    window.removeEventListener('resize', this.onResizeBound);
    window.document.removeEventListener('focusin', this.onFocusInBound);
    window.document.removeEventListener('click', this.onClickBound);
  }

  scrollToSection(sectionId: string): void {
    if (!this.isBrowser) return;

    this.activeSection = sectionId;
    this.syncWizardHorizontalScroll();
    this.cdr.detectChanges();

    const section = window.document.getElementById(sectionId);
    if (!section) return;

    const isDesktop = window.innerWidth >= this.desktopBreakpoint;
    const offset = isDesktop ? this.scrollOffsetDesktop : this.scrollOffsetMobile;

    const top = section.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: 'smooth',
    });
  }

  isCompleted(sectionId: string): boolean {
    return this.sections.indexOf(sectionId) < this.sections.indexOf(this.activeSection);
  }

  private updateActiveSectionByScroll(): void {
    if (!this.isBrowser) return;

    const isDesktop = window.innerWidth >= this.desktopBreakpoint;
    const offset = isDesktop ? this.scrollOffsetDesktop : this.scrollOffsetMobile;
    const probeY = window.scrollY + offset;

    let current = this.sections[0];

    for (let i = 0; i < this.sections.length; i++) {
      const currentId = this.sections[i];
      const nextId = this.sections[i + 1];

      const currentEl = window.document.getElementById(currentId);
      if (!currentEl) continue;

      const currentTop = currentEl.getBoundingClientRect().top + window.scrollY;
      const nextEl = nextId ? window.document.getElementById(nextId) : null;
      const nextTop = nextEl
        ? nextEl.getBoundingClientRect().top + window.scrollY
        : Number.POSITIVE_INFINITY;

      if (probeY >= currentTop && probeY < nextTop) {
        current = currentId;
        break;
      }
    }

    this.activeSection = current;
  }

  private updateActiveSectionFromEvent(event: Event): void {
    if (!this.isBrowser) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const field = target.closest('input, select, textarea');
    if (!field) return;

    const section = target.closest('.socio-scroll-section') as HTMLElement | null;
    if (!section?.id) return;

    if (this.sections.includes(section.id)) {
      this.activeSection = section.id;
    }
  }

  private updateWizardAffix(): void {
    if (!this.isBrowser || !this.wizardSlotRef || !this.wizardCardRef) return;

    const slot = this.wizardSlotRef.nativeElement;
    const card = this.wizardCardRef.nativeElement;

    const isDesktop = window.innerWidth >= this.desktopBreakpoint;
    const affixTop = isDesktop ? this.affixTopDesktop : this.affixTopMobile;

    this.wizardPlaceholderHeight = card.offsetHeight;

    const slotRect = slot.getBoundingClientRect();
    const slotTopAbsolute = slotRect.top + window.scrollY;
    const shouldAffix = window.scrollY + affixTop >= slotTopAbsolute;

    if (!shouldAffix) {
      this.resetWizardAffix();
      return;
    }

    this.wizardAffixed = true;
    this.wizardPosition = 'fixed';
    this.wizardTop = `${affixTop}px`;
    this.wizardLeft = `${slotRect.left}px`;
    this.wizardWidth = `${slotRect.width}px`;
    this.wizardZIndex = '30';
  }

  private resetWizardAffix(): void {
    this.wizardAffixed = false;
    this.wizardPlaceholderHeight = 0;
    this.wizardPosition = '';
    this.wizardTop = '';
    this.wizardLeft = '';
    this.wizardWidth = '';
    this.wizardZIndex = '';
  }

  private syncWizardHorizontalScroll(): void {
    if (!this.isBrowser) return;
    if (window.innerWidth >= this.desktopBreakpoint) return;
    if (!this.wizardStepsRef || !this.wizardStepRefs?.length) return;

    const container = this.wizardStepsRef.nativeElement;
    const activeStep = this.wizardStepRefs
      .map(ref => ref.nativeElement)
      .find(el => el.dataset['section'] === this.activeSection);

    if (!activeStep) return;

    const targetLeft = Math.max(0, activeStep.offsetLeft - 12);
    container.scrollTo({ left: targetLeft, behavior: 'smooth' });
  }
}
