import { Component, computed, effect, signal, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { NgxCustomModalComponent } from 'ngx-custom-modal';
import { LocalizationService } from 'src/app/service/localization.service';
import { ProfileService } from 'src/app/service/profile.service';
import { AppState, indexState } from 'src/types/auth.types';

@Component({
  selector: 'app-notification-page',
  templateUrl: './notification-page.component.html',
  styleUrls: ['./notification-page.component.scss']
})
export class NotificationPageComponent {
  @ViewChild('addTaskModal') addTaskModal!: NgxCustomModalComponent;
  @ViewChild('viewTaskModal') viewTaskModal!: NgxCustomModalComponent;
  notifications = computed(() => {
    if (this.profileService.notifications().length) {
    }
    let result = this.profileService.notifications().map((d: any, index: number) => {
      d.currentIndex = index + 1;
      return d
    })
    return result
  });
  isArabic = this.translate.currentLang === 'ae';

  filteredTasks: any = [];
  pagedTasks: any = [];
  searchTask = '';
  isPriorityMenu: any = null;
  isTagMenu: any = null;
  store!: indexState;
  defaultParams = {
    id: null,
    title: '',
    description: '',
    descriptionText: '',
    assignee: '',
    path: '',
    tag: '',
    priority: 'low',
  };
  selectedTask: any = this.defaultParams;

  pager = {
    currentPage: 1,
    totalPages: 0,
    pageSize: 10,
    startIndex: 0,
    endIndex: 0,
  };
  translations = signal<any>({});
  constructor(
    public translate: TranslateService,
    private profileService: ProfileService,
    private localizationService: LocalizationService,
    private storeData: Store<AppState>
  ) {
    this.translations.set(this.localizationService.getTranslationsByScreen('global', 'notifications'));
    this.initStore();
    effect(() => {
      this.notifications();
      this.searchTasks();
    }, { allowSignalWrites: true });

  }
  ngOnInit() {
    // الترجمات يتم تحميلها تلقائياً من خلال computed
  }
  initStore() {
    this.storeData
      .select((d) => d.index)
      .subscribe((d) => {
        this.store = d;
      });
  }

  searchTasks(isResetPage = true) {
    if (isResetPage) {
      this.pager.currentPage = 1;
    }


    this.filteredTasks = this.notifications().filter((d: any) => d.NotificationMessage?.toLowerCase().includes(this.searchTask));
    this.getPager();
  }

  getPager() {
    setTimeout(() => {
      if (this.filteredTasks.length) {
        this.pager.totalPages = this.pager.pageSize < 1 ? 1 : Math.ceil(this.filteredTasks.length / this.pager.pageSize);
        if (this.pager.currentPage > this.pager.totalPages) {
          this.pager.currentPage = 1;
        }
        this.pager.startIndex = (this.pager.currentPage - 1) * this.pager.pageSize;
        this.pager.endIndex = Math.min(this.pager.startIndex + this.pager.pageSize - 1, this.filteredTasks.length - 1);
        this.pagedTasks = this.filteredTasks.slice(this.pager.startIndex, this.pager.endIndex + 1);
      } else {
        this.pagedTasks = [];
        this.pager.startIndex = -1;
        this.pager.endIndex = -1;
      }
    });
  }
  viewTask(item: any = null) {
    this.selectedTask = item;
    setTimeout(() => {
      this.viewTaskModal.open();
    });
  }

  getUnreadCount(): number {
    return this.filteredTasks.filter((n: any) => n.NotificationStatus !== 'complete').length;
  }

}
