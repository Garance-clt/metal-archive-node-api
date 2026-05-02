import { execFile } from "child_process";
import { promisify } from "util";
import pLimit from "p-limit";
import { APP_USER_AGENT } from "./constants.js";
const execFileAsync = promisify(execFile);
// Cap concurrent curl processes to avoid resource exhaustion
const curlLimit = pLimit(12);
const CURL_HEADERS = [
    `User-Agent: ${APP_USER_AGENT}`,
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9",
    "Referer: https://www.metal-archives.com/",
    "Upgrade-Insecure-Requests: 1",
];
// Build header args as an array to avoid shell injection
const HEADER_ARGS_ARRAY = CURL_HEADERS.flatMap((h) => ["-H", h]);
function validateUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new Error("Invalid URL format");
    }
    if (!parsed.hostname.endsWith("metal-archives.com")) {
        throw new Error("URL not allowed: only metal-archives.com is permitted");
    }
}
export async function curlFetch(url) {
    const { body, status } = await curlRequest(url);
    if (status >= 400)
        throw new Error(`Upstream status ${status}`);
    return body;
}
export async function curlFetchResponse(url, _init) {
    const { body, status } = await curlRequest(url);
    return {
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body),
    };
}
async function curlRequest(url) {
    validateUrl(url);
    return curlLimit(async () => {
        const { stdout } = await execFileAsync("curl", ["-s", "-L", "--max-time", "30", "--write-out", "\n__STATUS__%{http_code}", ...HEADER_ARGS_ARRAY, url], { maxBuffer: 10 * 1024 * 1024 });
        const sep = stdout.lastIndexOf("\n__STATUS__");
        const body = sep !== -1 ? stdout.slice(0, sep) : stdout;
        const status = sep !== -1 ? parseInt(stdout.slice(sep + 11), 10) : 200;
        return { body, status };
    });
}
export async function curlGetRedirectUrl(url) {
    validateUrl(url);
    const { stdout } = await execFileAsync("curl", [
        "-s", "-L", "--max-time", "10",
        "-w", "%{url_effective}",
        "-o", "/dev/null",
        ...HEADER_ARGS_ARRAY,
        url,
    ]);
    return stdout.trim();
}
