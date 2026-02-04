// application.spec.ts
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jasmine-axe'; // <--- Change this import!
import { ApplicationComponent } from './application.component';
import { ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';

// You no longer need expect.extend(toHaveNoViolations) directly in each spec file
// because it's added globally in src/test.ts via jasmine.addMatchers().
// You can keep it if you prefer for clarity, but it's not strictly necessary.

describe('ApplicationComponent Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = await render(ApplicationComponent, {
      imports: [ReactiveFormsModule, QuillModule.forRoot()],
    });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});