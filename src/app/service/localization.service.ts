import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  baseUrl = environment.apiUrl;
  constructor(
    private http: HttpClient
  ) { }
  EServicesLocalizationSelectAll() {

    return this.http.get(`${this.baseUrl}/api/EServicesLocalization/selectall`);
  }
  getTranslations(): any {
    const stored = localStorage.getItem('localization');
    if (!stored) return null;
    const items = JSON.parse(stored);
    const lang = localStorage.getItem('i18n_locale') || 'en';
    return items.reduce((acc: any, item: any) => {
      acc[item.KeyName] = {
        label: lang === 'ae' ? item.Translatear : item.Translateen,
        validation: lang === 'ae' ? item.ValidationMessagear : item.ValidationMessageen,
        required: item.FieldRequired
      };
      return acc;
    }, {});
  }

  /**
   * الحصول على الترجمات الخاصة بشاشة معينة
   * @param screenName اسم الشاشة (مثل: 'inbox', 'SystemUsers', 'DynamicAttachments')
   * @returns object يحتوي على الترجمات الخاصة بالشاشة
   */
  getTranslationsByScreen(...screenNames: string[]): any {
    const stored = localStorage.getItem('localization');
    if (!stored) return {};

    try {
      const items = JSON.parse(stored);
      const lang = localStorage.getItem('i18n_locale') || 'en';

      // توحيد أسماء الشاشات
      const requestedScreens = screenNames.map(s => s.toLowerCase());

      return items
        .filter((item: any) => {
          const screen = item.TranslationScreen;

          // عام
          if (!screen) return true;

          const screens = screen
            .split(',')
            .map((s: string) => s.trim().toLowerCase());

          // global (حتى لو مكتوبة غلط)
          if (screens.includes('global') || screens.includes('gloabl')) {
            return true;
          }

          // لو أي شاشة مطلوبة موجودة
          return requestedScreens.some(rs => screens.includes(rs));
        })
        .reduce((acc: any, item: any) => {
          acc[item.KeyName] = {
            label: lang === 'ae' ? item.Translatear : item.Translateen,
            validation: lang === 'ae'
              ? item.ValidationMessagear
              : item.ValidationMessageen,
            required: item.FieldRequired
          };
          return acc;
        }, {});
    } catch (error) {
      console.error('Error loading translations', error);
      return {};
    }
  }

}
