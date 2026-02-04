import { Component, input, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MenuLinksService } from 'src/app/service/menu-links.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { slideDownUp } from 'src/app/shared/animations';
import { AppState, indexState } from 'src/types/auth.types';
import { ServiceApiPayload } from 'src/types/newApplication.types';

@Component({
  selector: 'app-accordion-side-menu',
  templateUrl: './accordion-side-menu.component.html',
  animations: [slideDownUp]
})
export class AccordionSideMenuComponent {
  @Input() item: any;
  activeService: any;
  activeDropdown: string[] = ['dashboard'];
  parentDropdown: string = '';
  store!: indexState;
  isService = input.required<boolean>();
  constructor(
    public storeData: Store<AppState>,
    public router: Router,
    private newApplicationService: NewApplicationService,
    private menuLinksService: MenuLinksService
  ) {
    this.initStore();
  }
  ngOnInit() {
    console.log(this.item);
    console.log(this.isService());
    this.setActiveDropdown();
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
    this.menuLinksService.menuResponse()
  }
  toggle(item: any) {
    item.expanded = !item.expanded;
  }

  toggleMobileMenu() {
    if (window.innerWidth < 1024) {
      this.storeData.dispatch({ type: 'toggleSidebar' });
    }
  }

  navigateToDetails(listItem: any) {
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: listItem.ServiceID,
      FKProcessID: 40,
      FKCurrentStatusID: null,
      FKRoleID: roleID
    };
    this.newApplicationService.requestData.set(null);
    this.newApplicationService.serviceApiPayload.set(payload)
    this.activeService = listItem.ServiceID
    this.router.navigate([listItem.ItemURL.split('?')[0]], {
      state: { data: payload, pageName: this.store.locale === 'en'? listItem.TitleEn: listItem.TitleAr },
      queryParams: { ServiceID: listItem.ServiceID }
    });
  }

  setActiveDropdown() {
    const selector = document.querySelector('.sidebar ul a[routerLink="' + window.location.pathname + '"]');
    if (selector) {
      selector.classList.add('active');
      const ul: any = selector.closest('ul.sub-menu');
      if (ul) {
        let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
        if (ele.length) {
          ele = ele[0];
          setTimeout(() => {
            ele.click();
          });
        }
      }
    }
  }
  toggleAccordion(name: string, parent?: string) {
    if (this.activeDropdown.includes(name)) {
      this.activeDropdown = this.activeDropdown.filter((d) => d !== name);
    } else {
      this.activeDropdown.push(name);
    }
  }
}
