import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmployeeSelectModalService {
  private confirmSubject = new Subject<number | null>();
  private openSubject = new Subject<boolean>();

  // Expose observables for other components to subscribe to
  confirmResult$: Observable<number | null> = this.confirmSubject.asObservable();
  openStatus$: Observable<boolean> = this.openSubject.asObservable();

  constructor() { }

  /**
   * Opens the confirmation modal with a given message.
   * Returns an Observable that emits true if confirmed, false if cancelled.
   */
  open(): Observable<number | null> {
    this.openSubject.next(true); // Signal to open the modal
    return this.confirmResult$;
  }

  /**
   * Called by the modal component when confirmed.
   */
  confirm(serviceID: number) {
    this.openSubject.next(false); // Signal to close the modal
    this.confirmSubject.next(serviceID);
  }

  /**
   * Called by the modal component when cancelled.
   */
  cancel() {
    this.openSubject.next(false); // Signal to close the modal
    this.confirmSubject.next(null);
  }
}
