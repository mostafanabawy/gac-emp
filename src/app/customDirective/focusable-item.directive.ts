import { Directive, ElementRef } from '@angular/core';
import { FocusableOption } from '@angular/cdk/a11y';

@Directive({
  selector: '[appFocusableItem]',
  standalone: true
})
export class FocusableItemDirective implements FocusableOption {
  constructor(public el: ElementRef<HTMLElement>) { }

  focus(): void {
    this.el.nativeElement.focus();
  }
}