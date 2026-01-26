// src/features/fundamental/fundamentalSlice.ts
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { SectorCode } from '../../types/macro.types';
import type { FundamentalSnapshot, SectorFundamentalsResponse } from '../../types/fundamental.types';

import { fetchSectorFundamentals } from '../../services/fundamentalService';

export interface FundamentalState {
    selectedSector: SectorCode;
    items: FundamentalSnapshot[];
    asOf: string | null;
    source: string | null;
    loading: boolean;
    error: string | null;
    lastUpdated: string | null;
}

const initialState: FundamentalState = {
    selectedSector: 'XLK',
    items: [],
    asOf: null,
    source: null,
    loading: false,
    error: null,
    lastUpdated: null,
};

export const loadSectorFundamentals = createAsyncThunk<
    SectorFundamentalsResponse,
    SectorCode,
    { rejectValue: string }
>('fundamental/loadSectorFundamentals', async (sector, { rejectWithValue }) => {
    try {
        return await fetchSectorFundamentals(sector);
    } catch (e) {
        console.error('Error loading sector fundamentals:', e);
        return rejectWithValue('Failed to load fundamentals');
    }
});

const fundamentalSlice = createSlice({
    name: 'fundamental',
    initialState,
    reducers: {
        setSelectedSector: (state, action: PayloadAction<SectorCode>) => {
            state.selectedSector = action.payload;
        },
        clearFundamentals: (state) => {
            state.items = [];
            state.asOf = null;
            state.source = null;
            state.error = null;
            state.lastUpdated = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadSectorFundamentals.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadSectorFundamentals.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload.items;
                state.asOf = action.payload.asOf;
                state.source = action.payload.source;
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(loadSectorFundamentals.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? 'Unknown error';
            });
    },
});

export const { setSelectedSector, clearFundamentals } = fundamentalSlice.actions;
export default fundamentalSlice.reducer;
