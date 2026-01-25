import { configureStore } from '@reduxjs/toolkit';
import macroReducer from '../features/macro/macroSlice';

export const store = configureStore({
    reducer: {
        macro: macroReducer, // ← Agregar esta línea
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
