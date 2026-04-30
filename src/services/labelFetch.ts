// services/labelFetch.ts
import { fetchWithCache } from "./fetchWithCache.js";

const BASE = "https://www.metal-archives.com";
const TTL_PAGE = 6 * 60 * 60_000;  // 6h
const TTL_LIST = 6 * 60 * 60_000;  // 6h
const PAGE_SIZE = 500;

export function fetchLabelHtml(id: string): Promise<string> {
  return fetchWithCache(`${BASE}/labels/_/${id}`, TTL_PAGE);
}

async function fetchAllPages(urlBase: string): Promise<any[]> {
  const url0 = `${urlBase}?sEcho=1&iDisplayStart=0&iDisplayLength=${PAGE_SIZE}`;
  const first = JSON.parse(await fetchWithCache(url0, TTL_LIST));
  const rows: any[] = [...(first.aaData ?? [])];

  const total: number = first.iTotalRecords ?? rows.length;
  const pages = Math.ceil(total / PAGE_SIZE);

  const pending: Promise<void>[] = [];
  for (let p = 1; p < pages; p++) {
    const offset = p * PAGE_SIZE;
    const url = `${urlBase}?sEcho=1&iDisplayStart=${offset}&iDisplayLength=${PAGE_SIZE}`;
    pending.push(
      fetchWithCache(url, TTL_LIST).then((raw) => {
        const json = JSON.parse(raw);
        if (json.aaData?.length) rows.push(...json.aaData);
      })
    );
  }
  await Promise.all(pending);
  return rows;
}

export function fetchLabelRoster(id: string): Promise<any[]> {
  return fetchAllPages(
    `${BASE}/label/ajax-bands/nbrPerPage/${PAGE_SIZE}/id/${id}`
  );
}

export function fetchLabelPastRoster(id: string): Promise<any[]> {
  return fetchAllPages(
    `${BASE}/label/ajax-bands-past/nbrPerPage/${PAGE_SIZE}/id/${id}`
  );
}

export function fetchLabelReleases(id: string): Promise<any[]> {
  return fetchAllPages(
    `${BASE}/label/ajax-albums/nbrPerPage/${PAGE_SIZE}/id/${id}`
  );
}
