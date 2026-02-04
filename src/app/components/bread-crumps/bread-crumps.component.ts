import { Component, effect, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BreadCrumbHelperService } from 'src/app/service/bread-crumb-helper.service';
import { LocalizationService } from 'src/app/service/localization.service';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { indexState } from 'src/types/auth.types';

@Component({
  selector: 'app-bread-crumps',
  templateUrl: './bread-crumps.component.html'
})
export class BreadCrumpsComponent {
  pageName = input.required<string>();
  /* breadcrumbs: { label: string, url: string, hasComponent: boolean }[] = []; */
  isHelpTutorialModalOpen = signal<boolean>(false);
  isUserGuideModalOpen = signal<boolean>(false);
  url = input.required<string>();
  menuSignal = signal<any>([]);
  breadcrumbs = signal<{ label: string, url: string, hasComponent: boolean }[]>([]);
  store!: indexState;
  translations: any;
  pageNameChange = signal<string>('');
  constructor(
    private router: Router,
    private menuLinksService: MenuLinksService,
    public storeData: Store<any>,
    private bcService: BreadCrumbHelperService,
    private localizationService: LocalizationService
  ) {
    this.storeInit();
    // Watch router changes
    this.translations = this.localizationService.getTranslations();
    effect(() => {
      this.updateBreadcrumbs();
    }, { allowSignalWrites: true })
  }

  storeInit() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
  ngOnInit() {
    this.updateBreadcrumbs();

  }
  private updateBreadcrumbs() {
    const url = this.url()?.split('?')[0].replace(/^\//, '');
    const serviceId = this.getServiceIdFromUrl(this.router.url);
    const menu = this.menuLinksService.menuResponse(); // 👈 directly read it
    if (!menu && menu.length === 0) return;

    if (this.router.url.split('?')[0].replace(/^\//, '').includes('spAction')) {
      this.breadcrumbs.set(
        this.bcService.generateBreadcrumb(
          menu,
          this.router.url.split('/spAction?')[0].replace(/^\//, ''), // currentUrl
          this.store.locale,
          this.getServiceIdFromUrl(this.router.url),         // serviceId if present
          this.pageName()
        )
      );
    } else {
      this.breadcrumbs.set(
        this.bcService.generateBreadcrumb(
          menu,
          this.router.url.split('?')[0].replace(/^\//, ''), // currentUrl
          this.store.locale,
          this.getServiceIdFromUrl(this.router.url),         // serviceId if present
          this.pageName()
        )
      );
    }
    if(this.breadcrumbs()[this.breadcrumbs().length -1].label !== this.pageName()){
      this.pageNameChange.set(this.breadcrumbs()[this.breadcrumbs().length -1].label)
    }
  }
  private getServiceIdFromUrl(url: string): number | undefined {
    const params = new URLSearchParams(url.split('?')[1]);
    return params.has('ServiceID') ? Number(params.get('ServiceID')) : undefined;
  }




  toggleHelpTutorialModal(event?: any) {
    if (event === 'yes') {
      this.isHelpTutorialModalOpen.set(false);
    } else if (event === 'no') {
      this.isHelpTutorialModalOpen.set(true);
    } else {
      this.isHelpTutorialModalOpen.set(!this.isHelpTutorialModalOpen());
    }
  }

  toggleUserGuideModal(event?: any) {
    if (event === 'yes') {
      this.isUserGuideModalOpen.set(false);
    } else if (event === 'no') {
      this.isUserGuideModalOpen.set(true);
    } else {
      this.isUserGuideModalOpen.set(!this.isUserGuideModalOpen());
    }
  }
}
