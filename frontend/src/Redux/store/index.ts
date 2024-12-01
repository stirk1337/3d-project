import { configureStore } from '@reduxjs/toolkit';
import { createAPI } from '../api';
import { reducer } from './reducer';

export const api = createAPI();

export const store = configureStore({
    reducer
});

export type State = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;