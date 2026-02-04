// src/test.ts (example)
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Import toHaveNoViolations from jasmine-axe
import { toHaveNoViolations } from 'jasmine-axe';

// Declare the Jasmine extension
declare const require: {
  <T>(path: string): T;
  (paths: string[], callback: (...modules: any[]) => void): void;
  ensure(paths: string[], callback: (require: <T>(path: string) => T) => void): void;
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Then, add the jasmine-axe matchers.
beforeAll(() => {
  jasmine.addMatchers(toHaveNoViolations);
});

// And then load all the spec files.
const context = require.context('./', true, /\.spec\.ts$/);
context.keys().map(context);