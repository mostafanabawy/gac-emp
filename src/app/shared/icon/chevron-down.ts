import { Component, Input, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'icon-chevron-down', // Consider renaming this selector if it no longer represents "airplay"
  template: `
    <ng-template #template>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" [ngClass]="class">
<path d="M19 9L12 15L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
    </ng-template>
  `,
})
export class ChevronDownComponent {
  @Input() fill: boolean = false;
  @Input() class: any = '';
  @ViewChild('template', { static: true }) template: any;

  constructor(private viewContainerRef: ViewContainerRef) { }

  ngOnInit() {
    this.viewContainerRef.createEmbeddedView(this.template);
    this.viewContainerRef.element.nativeElement.remove();
  }
}