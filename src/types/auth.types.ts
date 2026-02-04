import { AuthState } from "src/app/store/auth/auth.reducer";

type Language = {
    code: string;
    name: string;
};
export interface indexState {
    isDarkMode: boolean;
    mainLayout: 'app' | string;
    theme: 'light' | 'dark' | string;
    menu: 'vertical' | 'horizontal' | string;
    layout: 'full' | 'boxed' | string;
    rtlClass: 'ltr' | 'rtl' | string;
    animation: string;
    navbar: 'navbar-sticky' | 'navbar-floating' | string;
    locale: string;
    sidebar: boolean;
    languageList: Language[];
    isShowMainLoader: boolean;
    semidark: boolean;
}
export interface AppState {
    auth: AuthState;
    index: indexState;
}
