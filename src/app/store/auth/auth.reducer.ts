import { createReducer, on } from "@ngrx/store";
import { loginSuccess, logout } from "./auth.actions";


export interface AuthState {
    user: any,
    token: string | null
};

export const initialState: AuthState = {
    user: sessionStorage.getItem('user') ? JSON.parse(sessionStorage.getItem('user')!) : null,
    token: sessionStorage.getItem('token')
}

export const authReducer = createReducer(
    initialState,
    on(loginSuccess, (state,
        { user, token }) => ({
            ...state,
            user,
            token
        })
    ),
    on(logout,
        () => ({
            user: null,
            token: null
        })
    )
)