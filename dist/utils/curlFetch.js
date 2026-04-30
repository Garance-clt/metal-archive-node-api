import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
const CURL_HEADERS = [
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9",
    "Referer: https://www.metal-archives.com/",
    "Upgrade-Insecure-Requests: 1",
];
const HEADER_ARGS = CURL_HEADERS.map((h) => `-H "${h.replace(/"/g, '\\"')}" `).join("");
/**
 * Effectue une requête GET via curl et retourne le body en string.
 * Lève une erreur si le status HTTP >= 400.
 */
export async function curlFetch(url) {
    const { body, status } = await curlRequest(url);
    if (status >= 400)
        throw new Error(`Upstream status ${status}`);
    return body;
}
/**
 * Adaptateur compatible avec l'interface fetch() standard.
 * Utilisé pour passer curlFetch là où un fetcher(url, init?) est attendu.
 */
export async function curlFetchResponse(url, _init) {
    const { body, status } = await curlRequest(url);
    return {
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve(body),
    };
}
async function curlRequest(url) {
    const cmd = `curl -s -L --max-time 30 --write-out "\n__STATUS__%{http_code}" ${HEADER_ARGS}"${url}"`;
    const { stdout } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const sep = stdout.lastIndexOf("\n__STATUS__");
    const body = sep !== -1 ? stdout.slice(0, sep) : stdout;
    const status = sep !== -1 ? parseInt(stdout.slice(sep + 11), 10) : 200;
    return { body, status };
}
