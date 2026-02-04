import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numFormat',
  standalone: true
})
export class NumFormatPipe implements PipeTransform {

  transform(value: any): string {
    if (!value) return '0';

    // صيغة مثل 252,700
    return new Intl.NumberFormat('en-US').format(value);
  }
}
