
import fetch from 'node-fetch';

interface TeraboxListResponse {
  list?: any[];
  [key: string]: any;
}

interface FetchTeraboxFileInfoParams {
  shortUrl?: string;
  appId: string;
  page?: number;
  shareid?: string;
  uk?: string;
}

export async function fetchTeraboxFileInfo({ shortUrl, appId, page = 1, shareid, uk, debug = false }: FetchTeraboxFileInfoParams & { debug?: boolean }) {
  let res, data;
  // Prefer shareid and uk if provided
  if (shareid && uk) {
    let listUrl = `https://dm.terabox.app/share/list?app_id=${appId}&web=1&channel=dubox&clienttype=0&shareid=${shareid}&uk=${uk}&page=${page}`;
    if (debug) console.log(`[TeraboxAPI] listUrl (shareid/uk): ${listUrl}`);
    res = await fetch(listUrl, { headers: { 'accept': 'application/json' } });
    if (res.ok) {
      const raw = await res.text();
      if (debug) console.log(`[TeraboxAPI] Raw response (shareid/uk):`, raw);
      data = JSON.parse(raw) as TeraboxListResponse;
      if (data && data.list && data.list.length > 0) {
        return { source: 'list', data, debug: { url: listUrl, raw } };
      }
    }
  }
  // Fallback to shorturl if present
  if (shortUrl) {
    let listUrl = `https://dm.terabox.app/share/list?app_id=${appId}&web=1&channel=dubox&clienttype=0&shorturl=${shortUrl}&page=${page}`;
    if (debug) console.log(`[TeraboxAPI] listUrl (shortUrl): ${listUrl}`);
    res = await fetch(listUrl, { headers: { 'accept': 'application/json' } });
    if (res.ok) {
      const raw = await res.text();
      if (debug) console.log(`[TeraboxAPI] Raw response (shortUrl):`, raw);
      data = JSON.parse(raw) as TeraboxListResponse;
      if (data && data.list && data.list.length > 0) {
        return { source: 'list', data, debug: { url: listUrl, raw } };
      }
    }
    // Fallback to shorturlinfo
    let infoUrl = `https://dm.terabox.app/api/shorturlinfo?app_id=${appId}&web=1&channel=dubox&clienttype=0&shorturl=${shortUrl}`;
    if (debug) console.log(`[TeraboxAPI] infoUrl (shortUrl): ${infoUrl}`);
    res = await fetch(infoUrl, { headers: { 'accept': 'application/json' } });
    if (res.ok) {
      const raw = await res.text();
      if (debug) console.log(`[TeraboxAPI] Raw response (shorturlinfo):`, raw);
      data = JSON.parse(raw) as TeraboxListResponse;
      if (data && data.list && data.list.length > 0) {
        return { source: 'shorturlinfo', data, debug: { url: infoUrl, raw } };
      }
    }
  }
  throw new Error('No valid Terabox file info found');
}
