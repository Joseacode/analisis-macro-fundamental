// src/features/fundamental/data/sectorUniverse.ts
import type { SectorCode } from '../../../types/macro.types';

export const SECTOR_UNIVERSE: Record<SectorCode, string[]> = {
    XLK: ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'ADBE', 'CRM', 'AMD', 'CSCO', 'INTC'],
    XLY: ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'BKNG', 'TJX', 'GM'],
    XLI: ['GE', 'HON', 'CAT', 'BA', 'LMT', 'UNP', 'UPS', 'DE', 'RTX', 'MMM'],
    XLF: ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'BLK', 'SPGI', 'SCHW'],
    XLE: ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX', 'MPC', 'OXY', 'VLO', 'KMI'],
    XLB: ['LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'NUE', 'DD', 'DOW', 'VMC'],
    XLV: ['UNH', 'JNJ', 'LLY', 'MRK', 'ABBV', 'PFE', 'TMO', 'DHR', 'ABT', 'AMGN'],
    XLP: ['PG', 'KO', 'PEP', 'WMT', 'COST', 'PM', 'MDLZ', 'MO', 'CL', 'KMB'],
    XLU: ['NEE', 'DUK', 'SO', 'AEP', 'EXC', 'SRE', 'XEL', 'PEG', 'ED', 'D'],
    XLRE: ['AMT', 'PLD', 'CCI', 'EQIX', 'SPG', 'PSA', 'O', 'WELL', 'DLR', 'AVB'],
    XLC: ['GOOGL', 'META', 'NFLX', 'DIS', 'TMUS', 'CMCSA', 'CHTR', 'VZ', 'T', 'TTWO'],
};
