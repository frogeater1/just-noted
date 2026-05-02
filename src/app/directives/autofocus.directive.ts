import { Directive, ElementRef, AfterViewInit } from '@angular/core';

@Directive({
    selector: '[appAutofocus]',
    standalone: true
})
export class AutofocusDirective implements AfterViewInit {
    constructor(private el: ElementRef) { }

    ngAfterViewInit() {
        // Timeout ensures the element is fully rendered and ready to receive focus
        setTimeout(() => {
            const element = this.el.nativeElement;
            element.focus();

            // For date/datetime-local inputs or selects, try to open the picker immediately
            if ((element instanceof HTMLInputElement &&
                (element.type === 'date' || element.type === 'datetime-local')) ||
                element instanceof HTMLSelectElement) {
                if ('showPicker' in element) {
                    try {
                        // showPicker() typically requires user activation. 
                        // If the render was triggered by a user click, this might work.
                        // If not, it will throw a SecurityError, which we catch.
                        (element as any).showPicker();
                    } catch (err) {
                        console.log('Could not auto-open picker:', err);
                    }
                }
            }
        }, 0);
    }
}
