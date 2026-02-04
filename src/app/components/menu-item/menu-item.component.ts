import { Component, ElementRef, HostListener, input, Input, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { MenuCloseService } from 'src/app/service/menu-close.service';
import { NewApplicationService } from 'src/app/service/new-application.service';
import { reverseChevron, toggleAnimation } from 'src/app/shared/animations';
import { AppState, indexState } from 'src/types/auth.types';
import { ServiceApiPayload } from 'src/types/newApplication.types';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.component.html',
  animations: [toggleAnimation, reverseChevron]
})
export class MenuItemComponent {
  @Input() item: any; // type it properly if you have an interface
  isNestedMenu = input<boolean | null | undefined>();
  closeMenu = input<number | null | undefined>();
  store!: indexState;
  private closeSubscription!: Subscription;
  isActive = input<boolean>(false);
  constructor(
    public storeData: Store<AppState>,
    private router: Router,
    private newApplicationService: NewApplicationService,
    private menuCloseService: MenuCloseService,
    private el: ElementRef
  ) {
    this.initStore();
  }

  ngOnInit() {
    this.closeSubscription = this.menuCloseService.closeAll$.subscribe(() => {
      // Check if THIS menu instance is currently open
      const isThisMenuOpen = this.openMenus[this.item.TitleEn];


      // CRITICAL FIX: Only simulate a click if the menu is currently open.
      // Clicking an open button closes the menu; clicking a closed button opens it.
      if (isThisMenuOpen) {
        setTimeout(() =>
          this.simulateEscapeKey()
          , 100);
      }

      // Safety measure: Reset the local state after the click simulation
      this.openMenus = {};
    });

  }
  private simulateEscapeKey(): void {
    const event = new MouseEvent('click', {
      bubbles: true,        // Essential: Must bubble up to the document listener
      cancelable: true,
      view: window,
      button: 0,            // Left mouse button
      clientX: 0,           // Position where the click occurs (outside any element)
      clientY: 0
    });

    // Dispatch the event on the document.
    // We use document.body, but document usually works fine too.
    document.body.dispatchEvent(event);
  }
  closeAllMenus() {
    this.openMenus = {};
  }

  // Helper function to extract the base path and convert to lower case for reliable comparison
  private getRoutePath(url: string): string {
    // Only use the part before the question mark (query params) and convert to lowercase
    return url.split('?')[0].toLowerCase();
  }

  /**
   * Recursively checks if the current menu item or any of its descendants
   * matches the current route URL.
   */
  isRouteActive(): boolean {
    // We should use the router.url for all checks, converting it to lowercase once.
    const currentUrl = this.router.url.toLowerCase();

    // 1. Check if the current menu item itself is the active route
    // The || this.isActive() is included since you had it, but usually, 
    // the recursive check handles all activity.
    if (this.item.ItemURL && currentUrl.includes(this.getRoutePath(this.item.ItemURL)) || this.isActive()) {
      return true;
    }

    // 2. If it has children, check ALL descendants recursively using the helper
    if (this.item.children && this.item.children.length > 0) {
      // We use the 'some' method to find if *any* child/descendant is active.
      return this.item.children.some((childItem: any) =>
        this.checkDescendants(childItem, currentUrl) // <--- Pass the child item and current URL
      );
    }

    return false;
  }

  /**
   * Helper function to recursively check all descendants of a given item.
   * This handles the core recursive search through the menu structure.
   * @param menuItem The menu item to check.
   * @param currentUrl The current router URL (passed for performance).
   */
  private checkDescendants(menuItem: any, currentUrl: string): boolean {

    // 1. Check the item itself (a potential link)
    if (menuItem.ItemURL && currentUrl.includes(this.getRoutePath(menuItem.ItemURL))) {
      return true;
    }

    // 2. Check its children recursively
    if (menuItem.children && menuItem.children.length > 0) {
      // Recursively call checkDescendants on its children
      return menuItem.children.some((child: any) => this.checkDescendants(child, currentUrl));
    }

    return false;
  }

  // ... rest of the existing component code ...

  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  openMenus: { [key: string]: boolean } = {};
  toggleMenu(key: string) {
    this.openMenus = { [key]: !this.openMenus[key] };
    console.log(this.openMenus);
  }
  @ViewChildren('menuWrapper') menuWrappers!: QueryList<ElementRef>;
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const clickedInside = this.menuWrappers.some(wrapper =>
      wrapper.nativeElement.contains(target)
    );
    if (!clickedInside) {
      // programmatically "close" all menus by clicking their hlMenuButton if open
      this.menuWrappers.forEach(wrapper => {
        const button = wrapper.nativeElement.querySelector('[hlMenuButton]');
        if (button && !button.getAttribute('aria-expanded') === false) {
          (button as HTMLElement).click();
        }
      });
      this.openMenus = {}
    }
  }




  navigateToDetails(listItem: any, event: any) {
    event.preventDefault();
    let roleID = JSON.parse(sessionStorage.getItem('user')!).FkRoleID
    const payload: ServiceApiPayload = {
      FKServiceID: listItem.ServiceID,
      //FKServiceID: +(listItem.ItemURL.split('=')[1]),
      FKProcessID: !!listItem.FKProcessID || listItem.FKProcessID === '0'? +listItem.FKProcessID: null,
      FKCurrentStatusID: null,
      FKRoleID: roleID
    };
    this.newApplicationService.requestData.set(null);
    this.newApplicationService.serviceApiPayload.set(payload)
    this.router.navigate([listItem.ItemURL.split('?')[0]], {
      state: {
        data: payload, pageName: this.store.locale === 'en' ? listItem.TitleEn : listItem.TitleAr,
        itemURL: listItem.ItemURL
      },
      queryParams: { ServiceID: listItem.ServiceID }
    });
  }
  selectedLink(item: any, event: any) {
    event.preventDefault();
    this.menuCloseService.triggerCloseAll();
    this.router.navigate([item.ItemURL], {
      state: {
        menuData: item
      }
    });
  }

  navigateToNewLink(listItem: any, event: any) {
    event.preventDefault();
    this.router.navigate([listItem.ItemURL], {
      state: {
        pageName: this.store.locale === 'en' ? listItem.TitleEn : listItem.TitleAr,
        itemURL: listItem.ItemURL
      },
    });
  }

  ngOnDestroy() {
    // Clean up the subscription to prevent memory leaks
    this.closeSubscription.unsubscribe();
  }


}