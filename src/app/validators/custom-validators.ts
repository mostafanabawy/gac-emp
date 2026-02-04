// src/app/validators/custom-validators.ts
import { AbstractControl, ValidatorFn, ValidationErrors, FormArray, FormGroup } from '@angular/forms';

export class CustomValidators {
  /**
   * Validator that checks if the control's value is -1 (often used for "Please Choose" options).
   * @returns A ValidationErrors object if the value is -1, otherwise null.
   */
  static noNegativeOne(control: AbstractControl): ValidationErrors | null {
    const value = control.value;

    // Check for null or undefined values first, as required validator should handle this
    if (value === null || value === undefined || value === '') {
      return null; // Let Validators.required handle empty values
    }

    // Convert to number for strict comparison, especially if value comes as string
    const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;

    if (numericValue < 0) {
      return { noNegativeOne: true }; // Return an error object if value is -1
    }
    return null; // Return null if the value is valid
  }

  /**
 * Validator that checks if FormArray has at least one valid entry
 */
  static atLeastOneEntry(control: AbstractControl): ValidationErrors | null {
    if (!(control instanceof FormArray)) {
      return null;
    }

    const formArray = control as FormArray;

    // Check if array is empty or has no valid entries
    if (formArray.length === 0) {
      return { atLeastOneEntry: true };
    }
    // Chec k if at least one FormGroup has valid data (not all empty)
    const hasValidEntry = formArray.controls.slice(0, -1).some(group => {
      if (group instanceof FormGroup) {
        return Object.values(group.value).some(value =>
          value !== null && value !== undefined && value !== '' && value !== -1
        ) && group.get('IsDeleted')?.value !== true;
      }
      return false;
    });

    return hasValidEntry ? null : { atLeastOneEntry: true };
  }

  /**
   * A factory function for a validator that allows specifying an invalid value.
   * Useful if you have other "invalid" placeholder values besides -1.
   */
  static invalidValue(invalidVal: any): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (value === null || value === undefined || value === '') {
        return null; // Let Validators.required handle empty values
      }

      // Handle potential type mismatch (e.g., number vs string from select/radio)
      let comparisonValue = value;
      if (typeof invalidVal === 'number' && typeof value === 'string') {
        comparisonValue = parseInt(value, 10);
      } else if (typeof invalidVal === 'string' && typeof value === 'number') {
        comparisonValue = String(value);
      }


      if (comparisonValue === invalidVal) {
        return { invalidValue: { requiredValue: invalidVal, actualValue: value } };
      }
      return null;
    };
  }

  static numberMinLength(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined) return null;
      const valueStr = String(control.value);
      return valueStr.length < min ? { numberMinLength: { requiredLength: min, actualLength: valueStr.length } } : null;
    };
  }
  static requiredArrayValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {

      // Rule 1: Check if the array is empty
      const isArrayWithNoElements = !control.value || (Array.isArray(control.value) && control.value.length === 0);
      if (isArrayWithNoElements) {
        return { requiredArray: true };
      }

      // Rule 2: Check if all objects have IsDeleted: true
      const allItemsDeleted = (control.value as { IsDeleted: boolean }[]).every(item => item.IsDeleted);
      if (allItemsDeleted) {
        return { requiredArray: true };
      }

      // If no errors, return null
      return null;
    };
  }

  /**
   * Validator that checks if a date represents at least the given number of years ago.
   * Supports both `dd/MM/yyyy` and ISO formats (e.g., `2026-02-02T00:00:00`).
   * @param minYears Minimum number of years required
   * @returns A ValidatorFn that validates the control's date
   */
  static minYears(minYears: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      let date: Date;

      // Handle both ISO and dd/mm/yyyy formats
      if (typeof value === 'string') {
        if (value.includes('T')) {
          date = new Date(value); // ISO format
        } else {
          const [day, month, year] = value.split(/[\/\-]/).map(Number);
          if (!year || !month || !day) return { invalidDate: true };
          date = new Date(year, month - 1, day);
        }
      } else if (value instanceof Date) {
        date = value;
      } else {
        return { invalidDate: true };
      }

      const today = new Date();
      const diffYears =
        today.getFullYear() - date.getFullYear() -
        (today < new Date(today.getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0);

      return diffYears < minYears ? { minYears: { required: minYears, actual: diffYears } } : null;
    };
  }


  /**
   * Validator that requires the control's value to equal a specific, exact value.
   * @param exactValue The value the control must match.
   * @param errorName The key for the validation error (default: 'exactValue')
   */
  static exactValue(exactValue: any, errorName: string = 'exactValue'): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      // If the field is empty, let the 'required' validator handle it
      if (value === null || value === undefined || value === '') {
        return null;
      }

      // Perform a strict comparison
      if (value !== exactValue) {
        return {
          [errorName]: {
            requiredValue: exactValue,
            actualValue: value
          }
        };
      }

      // Validation passed
      return null;
    };
  }


  /**
  * Validator that compares the control's date against today or today +/- N days.
  * Supports:
  *  - "currentDate"
  *  - "currentDate + 30"
  *  - "currentDate - 7"
  * Supports ISO and dd/MM/yyyy formats.
  */
  static compareWithToday(
    operator: '>' | '>=' | '<' | '<=',
    expression: string = 'currentDate'
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const parseDate = (val: any): Date | null => {
        if (val instanceof Date) return val;

        if (typeof val === 'string') {
          if (val.includes('T')) return new Date(val);

          const [day, month, year] = val.split(/[\/\-]/).map(Number);
          if (!year || !month || !day) return null;
          return new Date(year, month - 1, day);
        }
        return null;
      };

      const controlDate = parseDate(value);
      if (!controlDate) return { invalidDate: true };

      // ---- Build base date from expression ----
      let baseDate = new Date();
      baseDate.setHours(0, 0, 0, 0);

      const match = expression.match(/currentDate\s*([+-])?\s*(\d+)?/);

      if (match) {
        const sign = match[1];
        const offsetDays = match[2] ? Number(match[2]) : 0;

        if (sign === '+') {
          baseDate.setDate(baseDate.getDate() + offsetDays);
        } else if (sign === '-') {
          baseDate.setDate(baseDate.getDate() - offsetDays);
        }
      }

      let isValid = false;

      switch (operator) {
        case '>':
          isValid = controlDate > baseDate;
          break;
        case '>=':
          isValid = controlDate >= baseDate;
          break;
        case '<':
          isValid = controlDate < baseDate;
          break;
        case '<=':
          isValid = controlDate <= baseDate;
          break;
      }

      return isValid
        ? null
        : {
          compareWithToday: {
            operator,
            baseDate: baseDate.toISOString().split('T')[0],
            expression
          }
        };
    };
  }


  /**
  * Validator that compares the control's date with another control's date
  * using the provided operator.
  * Supports ISO and dd/MM/yyyy formats.
  * @param otherControlName Name of the other control to compare against
  * @param formGroup Parent form group
  * @param operator Comparison operator: '>' | '>=' | '<' | '<='
  */
  static compareWithOtherControl(
    otherControlName: string,
    formGroup: FormGroup,
    operator: '>' | '>=' | '<' | '<=' | 'between',
    isTableName?: string
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;




      const parseDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Date) return val;

        if (typeof val === 'string') {
          if (val.includes('T')) return new Date(val);
          const [day, month, year] = val.split(/[\/\-]/).map(Number);
          if (!year || !month || !day) return null;
          return new Date(year, month - 1, day);
        }
        return null;
      };




      if (operator === 'between') {
        const currentDate = parseDate(value);
        if (!currentDate) return { invalidDate: true };
        const [fromName, toName] = otherControlName
          .split(/\s+and\s+/i)
          .map(s => s.trim());

        if (!fromName || !toName) return null;

        const fromControl = formGroup.get(fromName);
        const toControl = formGroup.get(toName);
        if (!fromControl?.value || !toControl?.value) return null;

        const fromDate = parseDate(fromControl.value);
        const toDate = parseDate(toControl.value);

        if (!fromDate || !toDate) return { invalidDate: true };

        const isValid =
          currentDate >= fromDate && currentDate <= toDate;

        return isValid
          ? null
          : {
            between: {
              from: fromName,
              to: toName
            }
          };
      }
      const otherControl = isTableName ? (formGroup.get(isTableName) as FormArray).at(-1).get(otherControlName) : formGroup.get(otherControlName);
      if (!otherControl || !otherControl.value) return null;
      const date = parseDate(value);
      const otherDate = parseDate(otherControl.value);
      if (!date || !otherDate) return { invalidDate: true };
      let isValid = false;

      switch (operator) {
        case '>':
          isValid = date > otherDate;
          break;
        case '>=':
          isValid = date >= otherDate;
          break;
        case '<':
          isValid = date < otherDate;
          break;
        case '<=':
          isValid = date <= otherDate;
          break;
      }

      return isValid
        ? null
        : {
          compareWithOtherControl: {
            operator,
            comparedControl: otherControlName
          }
        };
    };
  }


  /**
 * Conditional numeric comparison validator.
 * Triggered only if: <otherControlName>.value == <expectedValue>
 * Then compares current control numeric value against comparisonValue using operator.
 *
 * Example ExtraValidationValue: "170 if (FkMembershipTypeID==2278)"
 */
  static conditionalValueCompare(
    extraValidationValue: string,
    operator: '>' | '>=' | '<' | '<=' | '=',
    formGroup: FormGroup
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rawValue = control.value;
      if (rawValue === null || rawValue === undefined || rawValue === '') return null;

      // --- STEP 1: detect conditional rule format ---
      const conditionalRegex = /^(\d+)\s+if\s+\((\w+)==(\d+)\)$/i;
      const match = extraValidationValue.match(conditionalRegex);
      if (!match) return null; // not this format

      const [, comparisonValueStr, otherControlName, expectedValueStr] = match;
      const comparisonValue = Number(comparisonValueStr);
      const expectedValue = Number(expectedValueStr);

      // --- STEP 2: read other control ---
      const otherControl = formGroup.get(otherControlName);
      if (!otherControl) return null;

      const otherControlValue = Number(otherControl.value);

      // --- STEP 3: condition check ---
      if (otherControlValue !== expectedValue) {
        return null; // condition not satisfied → validator ignored
      }

      // --- STEP 4: compare current value to comparisonValue ---
      const currentValue = Number(rawValue);
      if (isNaN(currentValue)) return { notNumeric: true };

      let isValid = false;
      switch (operator) {
        case '>': isValid = currentValue > comparisonValue; break;
        case '>=': isValid = currentValue >= comparisonValue; break;
        case '<': isValid = currentValue < comparisonValue; break;
        case '<=': isValid = currentValue <= comparisonValue; break;
        case '=': isValid = currentValue === comparisonValue; break;
      }

      return isValid
        ? null
        : {
          conditionalValueCompare: {
            operator,
            comparisonValue,
            otherControlName,
            expectedValue
          }
        };
    };
  }


}