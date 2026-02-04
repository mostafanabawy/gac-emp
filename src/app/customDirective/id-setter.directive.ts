import { AfterViewInit, Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appIdSetter]'
})
export class IdSetterDirective implements AfterViewInit  {
    @Input('appIdSetter') idValue!: string;

    constructor(private el: ElementRef, private renderer: Renderer2) { }

    ngAfterViewInit() {
        if (this.idValue) {
            const realEl = this.el.nativeElement.querySelector('input') 
            // Use Renderer2 to safely set the ID attribute on the host element
            this.renderer.setAttribute(realEl, 'id', this.idValue);
        }
    }
}