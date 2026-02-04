import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortByOrder'
})
export class SortByOrderPipe implements PipeTransform {
  transform(array: any[] | null, property: string): any[] {
    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }
    return [...array].sort((a, b) => {
      const valueA = a[property];
      const valueB = b[property];
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return valueA - valueB;
      }
      return 0; // Don't sort if not numbers
    });
  }
}