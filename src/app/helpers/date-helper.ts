import { FlatpickrDefaultsInterface } from 'angularx-flatpickr';
export function formatDateDisplay(
    date: Date | string | null
): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
export const basic: FlatpickrDefaultsInterface = {
    dateFormat: 'd/m/Y',
    // position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
    monthSelectorType: 'dropdown'
};

export const timeBasic: FlatpickrDefaultsInterface = {
    dateFormat: 'd/m/Y H:i',
    // position: this.store.rtlClass === 'rtl' ? 'auto right' : 'auto left',
    monthSelectorType: 'dropdown'
};