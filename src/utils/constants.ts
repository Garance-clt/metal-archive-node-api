// utils/constants.ts
export const BASE_URL    = 'https://www.metal-archives.com'
export const THROTTLE_MS = 3000        // robots.txt anti-spam policy
export const TTL_MS      = 24 * 60 * 60 * 1000 // 24 hours cache TTL 
export const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124',
  'Accept-Language': 'en-US,en;q=0.9'
}

// utils/sleep.ts
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
