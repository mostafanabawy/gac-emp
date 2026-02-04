import { Component, effect, input, output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-rating-modal',
  templateUrl: './rating-modal.component.html'
})
export class RatingModalComponent {
  isOpen = input.required<boolean>()
  ratingForm!: FormGroup;
  submitted = output<boolean>();
  @ViewChild('modal3') modal3: any;
  constructor(
    private fb: FormBuilder
  ) {
    effect(() => {
      if (this.isOpen()) {
        this.modal3.open();
      } else {
        this.modal3.close();
      }
    }, { allowSignalWrites: true })

    this.initForm();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (dialog) {
        dialog.setAttribute('aria-label', 'rating survey popup message');
      }
    }, 100);
  }
  initForm() {
    this.ratingForm = this.fb.group({
      rating: [0],
      remarks: ['']
    })
  }
  get ratingValue(): number {
    return this.ratingForm.get('rating')?.value;
  }
  /*  getFocusableElements(container: HTMLElement): Promise<HTMLElement[]> {
     return new Promise<HTMLElement[]>((resolve) => {
       setTimeout(() => {
         resolve(
           Array.from(
             document.querySelectorAll<HTMLElement>(
               '#aiPopup button'
             )
           )
         );
       });
     });
   } */


  onSubmit() {
    console.log(this.ratingForm.value);
    this.submitted.emit(true);
  }
}
