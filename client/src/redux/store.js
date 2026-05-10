import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import groupReducer from './groupSlice'; // import the new slice

export const store = configureStore({
    reducer: {
        auth: authReducer,
        group: groupReducer // add it here
    }
});