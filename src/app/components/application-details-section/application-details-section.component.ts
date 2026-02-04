import { Component, input } from '@angular/core';

@Component({
  selector: 'app-application-details-section',
  templateUrl: './application-details-section.component.html'
})
export class ApplicationDetailsSectionComponent {
  dataToDisplay = input.required<{}>();
  noSort = () => 0;
  isLongText(value: any): boolean {
    return typeof value === 'string' && value.length > 50; // adjust threshold as needed
  }
}
