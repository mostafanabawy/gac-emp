import { Component, forwardRef, input, OnInit, ViewChild } from '@angular/core';
import { FormControl, NG_VALUE_ACCESSOR, ControlValueAccessor, NG_VALIDATORS, AbstractControl, ValidationErrors } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { QuillEditorComponent } from 'ngx-quill';
import Quill from 'quill';
import QuillBetterTable from 'quill-better-table';

Quill.register({
  'modules/better-table': QuillBetterTable
}, true);

@Component({
  selector: 'app-my-editor',
  /*   imports: [ReactiveFormsModule, QuillModule], */
  templateUrl: './default.component.html',
  styles: [`
    .ql-container { min-height: 300px; }
    table { border: 1px solid #ccc; border-collapse: collapse; }
    td, th { border: 1px solid #ccc; padding: 4px; }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DefaultComponent),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => DefaultComponent),
      multi: true
    }
  ]
})
export class DefaultComponent implements OnInit, ControlValueAccessor {
  @ViewChild('editor') editor!: QuillEditorComponent;

  form = new FormControl(''); // Using an internal form control
  // ControlValueAccessor properties
  onChange: any = () => { };
  onTouched: any = () => { };
  isDisabled = input<any>();
  modules: any;
  placeHolder = input<any>();
  quillID = input<any>();

  ngOnInit() {
//    const icons: any = Quill.import('ui/icons');

    this.modules = {
      toolbar: {
        container: [
          ['table'],
          ['link', 'image', 'video'],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          [{ header: [1, 2, 3, false] }],
          [{ font: [] }],
          [{ size: ['small', false, 'large', 'huge'] }],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['clean'],
          ['redo', 'undo'],
        ],
        handlers: {
          'table': () => this.addTable(),
          'undo': () => this.editor.quillEditor.history.undo(),
          'redo': () => this.editor.quillEditor.history.redo()
        }
      },
      history: {
        delay: 1000,
        maxStack: 100,
        userOnly: true
      },
      'better-table': {
        operationMenu: {
          items: {
            insertRowAbove: true,
            insertRowBelow: true,
            insertColumnLeft: true,
            insertColumnRight: true,
            deleteRow: true,
            deleteColumn: true,
            deleteTable: true
          }
        }
      },
      keyboard: {
        bindings: QuillBetterTable.keyboardBindings
      }
    };
  }


  addTable() {
    const quill = this.editor.quillEditor;
    const tableModule: any = quill.getModule('better-table');
    tableModule.insertTable(3, 3);
  }
  // --- ControlValueAccessor Methods ---

  writeValue(value: any): void {
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // This method is part of ControlValueAccessor but we will keep it empty as requested
  setDisabledState(isDisabled: boolean): void { }

  // Handle editor changes and propagate to the form
  onContentChanged(event: any): void {
    if (event.source === 'user' && event.html !== undefined) {
      // Check if the editor content is now empty.
      const isEmpty = event.html === '<p><br></p>' || event.html === '';

      if (isEmpty) {
        // If content is empty, pass null to the form
        this.onChange(null);
        this.onTouched(); // Mark the control as touched
      } else {
        // Otherwise, update the form with the new HTML content
        this.onChange(event.html);
      }
    }
  }

  // Handle editor blur and propagate to the form
  onBlur(): void {
    this.onTouched();
  }
  // --- Validator Interface Method ---
  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    // Example: Require at least 10 characters of content
    if (value && value.length < 10) {
      return { 'minLength': { requiredLength: 10, actualLength: value.length } };
    }
    // Return null if the value is valid
    return null;
  }
}

