// src/app/services/menu.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuCloseService {
  // Subject acts as both an Observable and an Observer.
  private closeAllSource = new Subject<void>();
  
  // Expose the Observable part for components to subscribe to.
  closeAll$: Observable<void> = this.closeAllSource.asObservable();

  /**
   * Method to trigger the global closing signal.
   * All subscribed MenuItemComponents will receive this signal.
   */
  triggerCloseAll(): void {
    this.closeAllSource.next();
  }
}