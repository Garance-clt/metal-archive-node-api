// utils/constants.ts
export const BASE_URL = 'https://www.metal-archives.com';
export const THROTTLE_MS = 1500; // 1.5 s entre les requêtes (identifié via User-Agent)
export const TTL_MS = 24 * 60 * 60 * 1000;
export const TTL_FOREVER = Number.MAX_SAFE_INTEGER; // cache until evicted by size
export const TTL_LIVE = 30 * 60_000; // 30 min — for home feeds that change daily
export const APP_USER_AGENT = "MetallumMobileApp/1.0 (personal non-commercial app; data from metal-archives.com)";
