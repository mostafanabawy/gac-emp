import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfirmModalService {
  private confirmSubject = new Subject<boolean>();
  private openSubject = new Subject<number>();

  // Expose observables for other components to subscribe to
  confirmResult$: Observable<boolean> = this.confirmSubject.asObservable();
  openStatus$: Observable<number> = this.openSubject.asObservable();

  constructor() { }

  /**
   * Opens the confirmation modal with a given message.
   * Returns an Observable that emits true if confirmed, false if cancelled.
   */
  open(actionID: number): Observable<boolean> {
    this.openSubject.next(actionID); // Signal to open the modal
    return this.confirmResult$;
  }

  /**
   * Called by the modal component when confirmed.
   */
  confirm() {
    this.openSubject.next(0); // Signal to close the modal
    this.confirmSubject.next(true);
  }

  /**
   * Called by the modal component when cancelled.
   */
  cancel() {
    this.openSubject.next(0); // Signal to close the modal
    this.confirmSubject.next(false);
  }
}
