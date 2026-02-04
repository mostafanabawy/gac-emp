import { Component, input } from '@angular/core';

@Component({
  selector: 'app-service-card',
  templateUrl: './service-card.component.html'
})
export class ServiceCardComponent {
  title = input.required<string>();
  icon = input.required<string>();
  category = input.required<string>();

}
