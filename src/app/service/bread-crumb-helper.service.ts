import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BreadCrumbHelperService {
  constructor() { }
  generateBreadcrumb(
    menu: any[],
    currentUrl: string,
    locale: string,
    serviceId?: number,
    pageName?: string
  ): { label: string; url: string; hasComponent: boolean }[] {

    // normalize target url (strip leading slash, remove query)
    const targetBase = currentUrl.replace(/^\//, '');
    const targetServiceId = serviceId ? String(serviceId) : undefined;

    const path: any[] = [];

    function normalizeUrl(itemUrl: string): { base: string; serviceId?: string } {
      if (!itemUrl) return { base: '' };
      const [base, query] = itemUrl.replace(/^\//, '').split('?');
      const params = new URLSearchParams(query || '');
      return { base, serviceId: params.get('ServiceID') || undefined };
    }

    function matches(itemUrl: string): boolean {
      const { base, serviceId } = normalizeUrl(itemUrl);
      if (base !== targetBase) return false;
      if (serviceId && targetServiceId) return serviceId === targetServiceId;
      return true;
    }

    function dfs(nodes: any[], parents: any[] = []): boolean {
      for (const node of nodes) {
        if (node.ItemURL && matches(node.ItemURL)) {
          path.push(...parents, node);
          return true;
        }
        if (node.children && dfs(node.children, [...parents, node])) {
          return true;
        }
      }
      return false;
    }

    dfs(menu);

    // 🔥 if no match but url contains "RequestData"
    if (path.length === 0 && currentUrl.includes('RequestData')) {
      const parentUrl = currentUrl.split('/RequestData')[0]; // e.g. "/Inbox"
      const parentBase = parentUrl.replace(/^\//, '');

      // try to find parent in menu
      function findParent(nodes: any[], parents: any[] = []): boolean {
        for (const node of nodes) {
          const { base } = normalizeUrl(node.ItemURL || '');
          if (base === parentBase) {
            path.push(...parents, node);
            return true;
          }
          if (node.children && findParent(node.children, [...parents, node])) {
            return true;
          }
        }
        return false;
      }
      findParent(menu);
    }

    // Build breadcrumb array
    const breadcrumbs: { label: string; url: string; hasComponent: boolean }[] = [];

    // Always prepend Home
    breadcrumbs.push({
      label: locale === 'en' ? 'Home' : 'الرئيسية',
      url: '/',
      hasComponent: true,
    });

    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      const isLast = i === path.length - 1;

      breadcrumbs.push({
        label: locale === 'en' ? node.TitleEn : node.TitleAr,
        url: node.ItemURL ? node.ItemURL.split('?')[0] : '',
        hasComponent: !isLast && (node.ItemURL ? node.ItemURL.split('?')[0] : ''),
      });
    }

    // 🔥 Append pageName if RequestData
    if (currentUrl.includes('RequestData') && pageName) {
      breadcrumbs.push({
        label: pageName,
        url: currentUrl,
        hasComponent: false
      });
    }

    return breadcrumbs;
  }
}
