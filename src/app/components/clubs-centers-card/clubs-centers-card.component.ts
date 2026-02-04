import { Component, input } from '@angular/core';

@Component({
  selector: 'app-clubs-centers-card',
  templateUrl: './clubs-centers-card.component.html'
})
export class ClubsCentersCardComponent {
  icon = input.required<string>();
  title = input.required<string>();
  link = input.required<string>();

}
