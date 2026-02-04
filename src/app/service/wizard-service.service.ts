import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Action, FieldJson, GetServiceFieldsByActionsApiResponse } from 'src/types/newApplication.types';
import { NewApplicationService } from './new-application.service';
import { environment } from 'src/environments/environment';
import { Store } from '@ngrx/store';
import { AppState } from 'src/types/auth.types';
@Injectable({
  providedIn: 'root'
})
export class WizardServiceService {
  baseUrl = environment.apiUrl;
  store!: AppState
  constructor(
    private http: HttpClient,
    private newApplicationService: NewApplicationService,
    private storeData: Store<AppState>
  ) {
    this.initStore();
  }

  initStore() {
    this.storeData
      .select(({ index, auth }) => ({ index, auth }))
      .subscribe((d) => {
        this.store = d;
      });
  }
  // Helper for field types
  getFieldTypeMap(): { [key: number]: string } {
    return {
      1: 'TextBox',
      2: 'TextArea',
      3: 'Date',
      4: 'CheckBox',
      5: 'RadioButton',
      6: 'DropDownList',
      7: 'Time',
      8: 'Table',
      9: 'Form',
      10: 'File',
      11: 'UniqueIdentifier',
      12: 'Number',
      13: 'Attachement',
      14: 'Button',
      15: 'Float'
    };
  }

  serviceDataActionApi(payload: any, action: Action, dataToSend?: GetServiceFieldsByActionsApiResponse, uiData?: FieldJson[], RequestID?: any, parentID?: any, secondParent?: any, ActionDetailsID?: any) {
    let restructuredPayload: any
    if (dataToSend && uiData) {
      this.populateServiceFieldIdMap(uiData);
      restructuredPayload = this.transformFormData(payload, action, RequestID)

      restructuredPayload.UpdatedFields = restructuredPayload.UpdatedFields.filter((uf: any) => {
        return dataToSend.items[action.ActionDetailsID].find((item) => {
          return item.ServiceFieldID === uf.ServiceFieldID
        })?.FieldUpdate || false;
      })

      const fieldToSendAttachmentData = uiData.find((field) => field.FieldType === 9);
      if (fieldToSendAttachmentData) {
        const isSendAttachmentDataToUpdate = dataToSend.items[action.ActionDetailsID].find(
          (item) => item.ServiceFieldID === fieldToSendAttachmentData!.ServiceFieldID!
        )?.FieldUpdate;

        if (!isSendAttachmentDataToUpdate) {
          delete restructuredPayload.Attachments;
        }
      } else {
        delete restructuredPayload.Attachments;
      }

      let indexesToDelete: any = []
      if (restructuredPayload.Tables_8) {
        restructuredPayload.Tables_8.forEach((tableField: any, index: any) => {

          const fieldToSend = dataToSend.items[action.ActionDetailsID].find((item) => item.ServiceFieldID === tableField.ServiceFieldID);
          if (!fieldToSend) {
            indexesToDelete.push(index)
          }
        })

        indexesToDelete.forEach((index: any) => {
          for (let i = indexesToDelete.length - 1; i >= 0; i--) {
            restructuredPayload.Tables_8.splice(indexesToDelete[i], 1);
          }
        })
        if (!restructuredPayload.Tables_8.length) {
          delete restructuredPayload.Tables_8
        }
      }


      if (parentID) {
        restructuredPayload.FkParentID = parentID;
      }

      if (ActionDetailsID) {
        restructuredPayload.ActionDetailsID = ActionDetailsID;
      }

      if (secondParent) {
        restructuredPayload.SeconedParentRequestid = secondParent;
      }

      if (this.newApplicationService.requestData()?.OldSecondaryActivity || this.newApplicationService.newRequestData()?.OldSecondaryActivity) {
        restructuredPayload.OldSecondaryActivity = this.newApplicationService.requestData()?.OldSecondaryActivity || this.newApplicationService.newRequestData()?.OldSecondaryActivity || null
      }
      if (this.newApplicationService.requestData()?.NewSecondaryActivity || this.newApplicationService.newRequestData()?.NewSecondaryActivity) {
        restructuredPayload.NewSecondaryActivity = this.newApplicationService.requestData()?.NewSecondaryActivity || this.newApplicationService.newRequestData()?.NewSecondaryActivity || null
      }
      if (this.newApplicationService.requestData()?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount) {
        restructuredPayload.NewSecondaryActivityCount = this.newApplicationService.requestData()?.NewSecondaryActivityCount || this.newApplicationService.newRequestData()?.NewSecondaryActivityCount || null
      }
      restructuredPayload.GDXServiceFieldsID = uiData.filter((field) => field.isGDXVal === true).map((field) => field.ServiceFieldID).join(',');
      if (this.newApplicationService.requestData()?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus) {
        restructuredPayload.FkPrevStatus = this.newApplicationService.requestData()?.FkPrevStatus || this.newApplicationService.newRequestData()?.FkPrevStatus
      }
      restructuredPayload.Lang = this.store.index.locale === 'en' ? 'EN' : 'AR'

    } else {
      restructuredPayload = payload
    }
    console.log(restructuredPayload);
    return this.http.post(`${this.baseUrl}/api/ServiceDataAction`,
      restructuredPayload
    )
  }

  getSpActionRequest(payload: {
    RequestID: string,
    ActionDBName: string
  }) {
    return this.http.post<any>(`${this.baseUrl}/api/getSpActionRequest`, payload)
  }
  EServicesSpActionProcessStatus() {
    return this.http.get<any>(`${this.baseUrl}/api/EServicesSpActionProcessStatus/selectall`)
  }
  SERVICE_FIELD_ID_MAP!: { [key: string]: FieldJson };

  populateServiceFieldIdMap(uiData: FieldJson[]) {
    this.SERVICE_FIELD_ID_MAP = uiData.reduce((map: any, field) => {
      map[field.InternalFieldName] = field;
      return map;
    }, {});
  }
  private transformFormData(formData: any, action: Action, RequestID?: any) {
    let updatedFields: { ServiceFieldID: number; Key: string; Value: string | null }[] = [];
    let Attachments: any[] = [];
    let Tables_8: { ServiceFieldID: number; SourceTableID: number; InternalFieldName: string; TableData: { Row: { Key: string; Value: string }[] }[] }[] = [];

    // Iterate over each key in the provided form data
    for (const key in formData) {
      if (formData.hasOwnProperty(key)) {
        const field = this.SERVICE_FIELD_ID_MAP[key];
        // Only process keys that exist in our field map
        /*   console.log(this.SERVICE_FIELD_ID_MAP);
          console.log(this.SERVICE_FIELD_ID_MAP[key]); */
        if (field) {
          let value = formData[key];
          if (field.IsSystemField) {
            continue;
          }

          if (field.FieldType === 9) {
            if (Array.isArray(value)) {
              if (RequestID) {
                value.forEach((attachment: any) => {
                  attachment.files = attachment.files.map((file: any) => {
                    return {
                      ID: file.ID,
                      AttachmentName: file.AttachmentName,
                      AttachmentDocID: file.AttachmentDocID,
                      FkAttachmentTypeID: attachment.FkAttachmentTypeID,
                      FkRequestID: RequestID,
                      IsDeleted: file.IsDeleted,
                      Confidence: file.Confidence || null
                    }
                  })
                })
              } else {
                value.forEach((attachment: any) => {
                  attachment.files = attachment.files.map((file: any) => {
                    return {

                      AttachmentName: file.AttachmentName,
                      AttachmentDocID: file.AttachmentDocID,
                      FkAttachmentTypeID: attachment.FkAttachmentTypeID,
                      Confidence: file.Confidence || null
                    }
                  })
                })
              }
              value = value.map((val: any) => val.files).filter((val: any) => val.length)
              console.log(value);
              Attachments.push(...value);
              let acc: any = []
              for (let i = 0; i < Attachments.length; ++i) {
                acc = [...acc, ...Attachments[i]]
              }
              Attachments = acc
            }

          } else if (field.FieldType === 8 || field.FieldType === 19 || field.FieldType === 4) {
            if (field.FieldType === 8) {
              let deletedRow: any = []
              value.pop()
              let dateField = field.TableServiceFields!.forEach((tf, index: any) => {
                if (tf.FieldType === 3) {
                  value.forEach((row: any) => {
                    row[tf!.InternalFieldName] = this.convertDateToISO(row[tf!.InternalFieldName])
                  })
                }
                deletedRow[index] = false;
                value.forEach((row: any) => {
                  delete row.currentIndex
                  delete row.SourceTableID
                  delete row.GDXTableFieldIDs
                })





                if (tf.IsSystemField) {
                  value.forEach((row: any) => {
                    delete row[tf!.InternalFieldName]
                  })
                }
              })
              let transformedTableData: any;
              let transformedRow: any;
              if (RequestID) {
                value.forEach((row: any, index: any) => {
                  if (row.IsDeleted === true) {
                    deletedRow[index] = true
                  }
                })

                let serviceTablesDataID = value.map((row: any) => row.ServiceTablesDataID)
                value.forEach((row: any) => {
                  delete row.ServiceTablesDataID
                })
                transformedTableData = value.map((item: any, index: any) => {
                  transformedRow = Object.entries(item).map(([key, value]) => {
                    return {
                      Key: key,
                      Value: value
                    };
                  });
                  return {
                    Row: transformedRow,
                    serviceTablesDataID: serviceTablesDataID[index] || null,
                    IsDeleted: deletedRow[index]
                  };
                });
                /* debugger; */
              } else {
                transformedTableData = value.map((item: any, index: any) => {
                  transformedRow = Object.entries(item).map(([key, value]) => {
                    return {
                      Key: key,
                      Value: value
                    };
                  });
                  return {
                    Row: transformedRow
                  };
                });
              }
              if (transformedTableData && transformedTableData.length) {
                Tables_8.push({
                  ServiceFieldID: field.ServiceFieldID,
                  SourceTableID: field.SourceTableID,
                  InternalFieldName: key,
                  TableData: transformedTableData
                });
              }
            } else {
              let dataIDs: any;

              let transformedTableData = value.map((valueSingle: any, index: any) => {
                return {
                  ServiceTablesDataID: null,
                  Row: [{
                    ServiceTableFieldID: field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.ServiceTableFieldID, // Unknown value, set to null
                    Key: field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName,
                    Value: valueSingle // Convert the number to a string
                  }]
                };
              });
              if (this.newApplicationService.requestData() && this.newApplicationService.requestData().ServiceTables) {
                dataIDs = this.newApplicationService.requestData().ServiceTables.filter((id: any) => {
                  return id.SourceTableID === field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.SourceTableID
                })
                dataIDs.forEach((id: any) => {
                  const index = transformedTableData.findIndex((val: any) => val.Row.find((row: any) => row.Value === id[field.TableServiceFields!.find((arrItem) => arrItem.IsSystemField === false)!.InternalFieldName]))
                  if (index > -1) {
                    transformedTableData[index].ServiceTablesDataID = id.ServiceTablesDataID;
                  }


                })

                const combinedData = [...transformedTableData];
                dataIDs.forEach((oldItem: any) => {
                  const isFound = combinedData.some(newItem => {
                    // We need to access the ServiceTablesDataID correctly
                    // It's a direct property of the object in your case
                    return newItem.ServiceTablesDataID === oldItem.ServiceTablesDataID;
                  });
                  // If the item is not found, add it to the new array with the IsDeleted flag
                  if (!isFound) {
                    const deletedItem = {
                      ...oldItem,
                      key: field.InternalFieldName,
                      value: oldItem[field.InternalFieldName],
                    };
                    let row: any = [{ ServiceTablesDataID: deletedItem.ServiceTablesDataID, IsDeleted: true }]
                    delete deletedItem.ServiceTablesDataID
                    delete deletedItem.SourceTableID
                    delete deletedItem[field.InternalFieldName]

                    row[0] = { ...row[0], Row: [deletedItem] }
                    transformedTableData.push(...row);
                  }
                  transformedTableData.forEach((row: any) => {
                    row.Row[0].FkRequestID = RequestID;
                  })

                })
              }


              Tables_8.push({
                ServiceFieldID: field.ServiceFieldID,
                SourceTableID: field.SourceTableID,
                InternalFieldName: key,
                TableData: transformedTableData
              });
            }

          } else {
            // Handle arrays by joining their values into a comma-separated string
            if (Array.isArray(value)) {
              value = value.join(',');
            } else if (value === null || value === undefined) {
              // Handle null or undefined values by converting them to an empty string
              value = '';
            } else if ((typeof value === 'string' && !isNaN(+value) || field.FieldType === 15 || field.FieldType === 12 || field.FieldType === 20)) {
              if (value === '' || value === ' ') {
                value = null;
              } else if ((typeof value === 'string' && !isNaN(+value) || field.FieldType === 15 || field.FieldType === 12 || field.FieldType === 20)) {
                const allZerosRegex = /^(0\.0*|0+\.?0*)$/;
                if (!allZerosRegex.test(value)) {
                  value = +value;
                }
              }
            } else if (field.FieldType === 3) {
              // Leave all other values as is
              value = this.convertDateToISO(value);
            }
            updatedFields.push({
              ServiceFieldID: field.ServiceFieldID,
              Key: key,
              Value: value,
            });

          }


        }
      }
    }
    Tables_8 = Tables_8.filter((tableItem) => tableItem.TableData && tableItem.TableData.length)
    const allZerosRegex = /^(0\.0*|0+\.?0*)$/;
    updatedFields = updatedFields.map((updatedItem) => {
      if (!updatedItem.Value && !allZerosRegex.test(`${updatedItem.Value}`)) {
        updatedItem.Value = null
      }
      return updatedItem
    })
    let restructuredData: any = {
      ActionDetailsID: action.ActionDetailsID,
      RequestID: RequestID || null,
      UpdatedFields: updatedFields,
      Attachments: Attachments,
      Tables_8: Tables_8
    }
    if (!(Tables_8 as any)?.length) {
      delete restructuredData.Tables_8;
    }
    if (!(Attachments as any)?.length) {
      delete restructuredData.Attachments;
    }
    if (!(updatedFields as any)?.length) {
      delete restructuredData.updatedFields;
    }

    return restructuredData
  }


  private convertDateToISO(dateValue: string): string {
    // Check if the dateValue is null, undefined, or not a string.
    if (!dateValue || typeof dateValue !== 'string') {
      return dateValue;
    }

    // Define a regular expression to match dd/mm/yyyy format.
    const ddmmyyyyRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

    // Check if the string is in dd/mm/yyyy format.
    const match = dateValue.match(ddmmyyyyRegex);

    if (match) {
      // Extract the day, month, and year from the matched groups.
      const day = match[1];
      const month = match[2];
      const year = match[3];

      // Create a new string in YYYY-MM-DD format, which the Date constructor can parse.
      const isoString = `${year}-${month}-${day}`;
      const d = new Date(isoString);

      // Validate that the new Date object is not an "Invalid Date".
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // If the string is already an ISO 8601 format, return it directly.
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }

    // If none of the above, log an error and return null.
    console.error('Invalid date format:', dateValue);
    return dateValue;
  }

  businessCondition(formData: any, uiData: FieldJson[], dataToSend: any, RequestID: any, BusinessRuleFun: any, ServiceID: any) {
    this.populateServiceFieldIdMap(uiData);
    dataToSend = dataToSend.split(',');
    dataToSend.forEach((item: any) => {
      if (item !== 'RequestID' && item !== 'ServiceID' && this.SERVICE_FIELD_ID_MAP[item].FieldType === 3) {
        formData[item] = this.convertDateToISO(formData[item]);
      }
    });

    const parameters = dataToSend.reduce((obj: any, item: any) => {
      if (item === 'ServiceID' && ServiceID) {
        obj[item] = ServiceID
      } else if (item === 'RequestID' && RequestID) {
        obj[item] = RequestID
      } else {
        obj[item] = formData[item] || null;
      }
      return obj;
    }, {});

    const payload = {
      ProcedureName: BusinessRuleFun,
      Parameters: parameters
    };

    return this.http.post<any>(`${this.baseUrl}/api/generic/businessAPI`, payload)
  }

}
