/**
 * SEC Submissions API wrapper
 * Fetches company metadata including fiscal year end
 */

const path = require('path');
const fs = require('fs/promises');

const SUBMISSIONS_BASE_URL = 'https://data.sec.gov/submissions';
const CACHE_DIR = path.resolve(__dirname, '../cache/submissions');
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Fetch submissions metadata for a CIK
 * @param {string} cik - Normalized CIK (10 digits)
 * @returns {Promise<Object>} - Submissions data
 */
async function fetchSubmissions(cik) {
    const url = `${SUBMISSIONS_BASE_URL}/CIK${cik}.json`;
    const cacheFile = path.join(CACHE_DIR, `${cik}.json`);

    // Check cache
    try {
        const stat = await fs.stat(cacheFile);
        const age = Date.now() - stat.mtimeMs;

        if (age < CACHE_TTL_MS) {
            console.log(`[Submissions] Cache hit for CIK ${cik}`);
            const cached = await fs.readFile(cacheFile, 'utf8');
            return JSON.parse(cached);
        }
    } catch (err) {
        // Cache miss or error, fetch fresh
    }

    // Fetch from SEC
    console.log(`[Submissions] Fetching from SEC: ${url}`);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'YourApp/1.0 (your-email@example.com)',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`SEC Submissions API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf8');

    return data;
}

/**
 * Get fiscal year end month from submissions
 * @param {string} cik - Normalized CIK
 * @returns {Promise<number>} - Month (1-12)
 */
async function getFiscalYearEndMonth(cik) {
    const submissions = await fetchSubmissions(cik);

    // fiscalYearEnd format: "MMDD" (e.g., "0630" for June 30)
    const fye = submissions.fiscalYearEnd;

    if (!fye || fye.length !== 4) {
        console.warn(`[Submissions] Invalid fiscalYearEnd for CIK ${cik}: ${fye}`);
        return null;
    }

    const month = parseInt(fye.substring(0, 2), 10);

    if (month < 1 || month > 12) {
        console.warn(`[Submissions] Invalid month in fiscalYearEnd for CIK ${cik}: ${month}`);
        return null;
    }

    return month;
}

module.exports = {
    fetchSubmissions,
    getFiscalYearEndMonth
};
