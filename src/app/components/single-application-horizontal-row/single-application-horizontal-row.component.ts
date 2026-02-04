import { Component, input } from '@angular/core';

@Component({
  selector: 'app-single-application-horizontal-row',
  templateUrl: './single-application-horizontal-row.component.html'
})
export class SingleApplicationHorizontalRowComponent {
  dataToDisplay = input.required<{}>()
}
