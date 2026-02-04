import { Component, effect, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MenuLinksService } from '../service/menu-links.service';
import { Store } from '@ngrx/store';
import { AppState, indexState } from 'src/types/auth.types';
import { Location } from '@angular/common';

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html'
})
export class ApplicationsComponent {
  successModalOpen = signal<boolean>(false);
  ratingModalOpen = signal<boolean>(false);
  ratingSubmittedModalOpen = signal<boolean>(false);
  submitted = false;
  currentLink = signal<any>('')
  store!: indexState;
  constructor(
    private router: Router,
    private menuLinksService: MenuLinksService,
    private storeData: Store<AppState>,
    private location: Location
  ) {
    this.initStore()
    effect(() => {
      if (menuLinksService.menuResponse()) {
        this.currentLink.set(this.menuLinksService.menuResponse().find((item: any) => `/${item.ItemURL}` === this.router.url))
      }
    }, { allowSignalWrites: true })
    
  }

  ngOnInit() {
    if (history.state.submitted === true) {
      this.submitted = true;
      history.replaceState({}, document.title);
    }
    
  }

  ngAfterViewInit() {
    console.log('ngAfterViewInit triggered');
    if (this.submitted) {
      this.successModalOpen.set(true);
    }
  }
  async initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }
  onSuccessModalClosed() {
    console.log('success modal closed');
    this.successModalOpen.set(false);
    this.ratingModalOpen.set(true); // open rating modal next
  }
  onRatingSubmitted() {
    console.log('rating submitted');
    this.ratingModalOpen.set(false);
    this.ratingSubmittedModalOpen.set(true); // show thank-you modal
  }

}
