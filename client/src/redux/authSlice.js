import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: null,
    token: null,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            // save the user object and the token to our state
            state.user = action.payload.user;
            state.token = action.payload.token;
        },
        logout: (state) => {
            // clear everything out when they log out
            state.user = null;
            state.token = null;
        }
    }
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;