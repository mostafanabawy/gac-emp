import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'availableItems',
  pure: true // This is the crucial setting for memoization and performance!
})
export class AvailableItemsPipe implements PipeTransform {

  transform(
    baseLookupValues: any[] | undefined, // The output of your base filter
    tableField: any, // The field object from the HTML scope
    requestData: any, // The data from newApplicationService.requestData()
  ): any[] {

    const currentlyAvailable = baseLookupValues || [];
    const selectedId = requestData ? requestData[tableField.InternalFieldName] : null;
    
    

    if (!selectedId) {
      return currentlyAvailable;
    }

    let isStale = false;
    let staleItemObject: any = null;
    const internalFieldName = tableField.InternalFieldName || '';

    if (tableField.FieldType === 19 || tableField.FieldType === 4) { // Multi-select logic
      const selectedIds = Array.isArray(selectedId) ? selectedId : [selectedId];
      const availableIds = currentlyAvailable.map((item: any) => item.LookupID);
      
      const staleId = selectedIds.find((id: number) => !availableIds.includes(id));
      
      if (staleId !== undefined) {
        isStale = true;
        const originalSelectedList = requestData[internalFieldName];
        const selectedIndex = originalSelectedList ? originalSelectedList.indexOf(staleId) : -1;
        
        if (selectedIndex !== -1) {
            staleItemObject = {
                LookupID: staleId,
                TitleEn: requestData[`${internalFieldName}_TitleEn`]?.[selectedIndex],
                TitleAr: requestData[`${internalFieldName}_TitleAr`]?.[selectedIndex],
                TechnicalApprovalFile: requestData[`${internalFieldName}_TechnicalApprovalFile`]?.[selectedIndex],
                notSelectable: true
            };
        }
      }
    } else { // Single select logic
      isStale = !currentlyAvailable.some((item: any) => item.LookupID === selectedId);

      if (isStale) {
          staleItemObject = {
              LookupID: selectedId,
              TitleEn: requestData[`${internalFieldName}_TitleEn`],
              TitleAr: requestData[`${internalFieldName}_TitleAr`],
              disabled: true
          };
      }
    }

    // If the item is stale, return a NEW array that merges the stale item with available items.
    // The Pure Pipe ensures this new array is only created when the inputs change.
    if (isStale && staleItemObject) {
      // Return a new array with the stale item at the front for display
      return [staleItemObject, ...currentlyAvailable];
    }

    // Otherwise, return the base available list.
    return currentlyAvailable;
  }
}