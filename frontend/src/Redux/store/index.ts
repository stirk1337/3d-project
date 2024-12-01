import { configureStore } from '@reduxjs/toolkit';
import { reducer } from './reducer';
import { createAPI } from '../api';
export const api = createAPI();

export const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            thunk: {
                extraArgument: api,
            },
        }),
});

export type State = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;