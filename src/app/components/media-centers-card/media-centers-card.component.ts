import { Component, effect, input } from '@angular/core';

@Component({
  selector: 'app-media-centers-card',
  templateUrl: './media-centers-card.component.html'
})
export class MediaCentersCardComponent {
  title = input.required<string>();
  link = input.required<string>();
  imageLink = input.required<string>();
  createdAt = input.required<string>();
  

}
