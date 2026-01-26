import { configureStore } from '@reduxjs/toolkit';
import fundamentalReducer from '../features/fundamental/fundamentalSlice';
import macroReducer from '../features/macro/macroSlice';

export const store = configureStore({
    reducer: {
        macro: macroReducer, // ← Agregar esta línea
        fundamental: fundamentalReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
