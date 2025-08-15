import { chromium, type Browser, type Page } from 'playwright';
import { fetchTeraboxFileInfo } from './terabox-api';

export interface ScrapedMetadata {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  size?: string;
  category?: string;
  isdir?: string;
  server_filename?: string;
  dlink?: string;
  thumbs?: Record<string, string>;
  error?: string;
}

function normalizeUrl(url: string): string {
  try {
    const urlObject = new URL(url);
    const path = urlObject.pathname;
    const match = path.match(/\/s\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://1024terabox.com/s/${match[1]}`;
    }
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error);
  }
  return url; // Return original if normalization fails
}

async function scrapeSingle(url: string, context: any): Promise<ScrapedMetadata> {
  const normalized = normalizeUrl(url);
  console.log(`[Scraper] Starting to scrape single URL: ${normalized}`);
  const appId = '250528';
  const match = normalized.match(/\/s\/([a-zA-Z0-9_-]+)/);
  const shortUrl = match ? match[1] : '';
  let shareid: string | undefined = undefined;
  let uk: string | undefined = undefined;
  let jsToken: string | undefined = undefined;
  let dpLogid: string | undefined = undefined;
  try {
    // Use Playwright to extract shareid and uk from the page
    const page: Page = await context.newPage();
    await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for the thumbnail image to appear (up to 20s)
    try {
      await page.waitForSelector('meta[property="og:image"], img[src*="thumbnail"], img[src*="teraboxcdn"], img[src*="dm-data"]', { timeout: 20000 });
    } catch (e) {
      console.warn('[Scraper] Thumbnail selector did not appear within 20s, continuing anyway.');
    }
    // Enhanced extraction for shareid and uk
    const shareInfo = await page.evaluate(() => {
      let shareid: string | undefined = undefined;
      let uk: string | undefined = undefined;
      let jsToken: string | undefined = undefined;
      let dpLogid: string | undefined = undefined;

      // Try window context
      // @ts-ignore
      if (window.shareid) shareid = String(window.shareid);
      // @ts-ignore
      if (window.uk) uk = String(window.uk);
      // @ts-ignore
      if (window.jsToken) jsToken = String(window.jsToken);

      const html = document.documentElement.innerHTML;

      // Regex for dp-logid
      let dpLogidMatch = html.match(/dp-logid["']?\s*:\s*["']?([a-zA-Z0-9_-]+)/);
      if (dpLogidMatch && dpLogidMatch[1]) {
          dpLogid = dpLogidMatch[1];
      }

      // Regex for jsToken if not in window
      if (!jsToken) {
          let jsTokenMatch = html.match(/jsToken["']?\s*[:=]\s*["']?([a-zA-Z0-9]+)/);
          if (jsTokenMatch && jsTokenMatch[1]) {
              jsToken = jsTokenMatch[1];
          }
      }

      // Fallback for shareid/uk
      if (!shareid) {
          let shareidMatch = html.match(/shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
          if (shareidMatch && shareidMatch[1]) shareid = shareidMatch[1];
      }
      if (!uk) {
          let ukMatch = html.match(/uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
          if (ukMatch && ukMatch[1]) uk = ukMatch[1];
      }

      return { shareid, uk, jsToken, dpLogid, htmlDebug: (!shareid || !uk || !jsToken) ? html.slice(0, 5000) : undefined };
    });
    shareid = shareInfo.shareid;
    uk = shareInfo.uk;
    jsToken = shareInfo.jsToken;
    dpLogid = shareInfo.dpLogid;

    if (!shareid || !uk || !jsToken) {
        console.warn(`[Scraper] Missing critical info: shareid=${shareid}, uk=${uk}, jsToken=${jsToken}. HTML debug:`, shareInfo.htmlDebug);
    }
    console.log(`[Scraper] Extracted shareid: ${shareid}, uk: ${uk}, jsToken: ${jsToken}, dpLogid: ${dpLogid}`);

    await page.close();

    const { data, debug } = await fetchTeraboxFileInfo({ shortUrl, appId, shareid, uk, jsToken, dpLogid, debug: true });
    const file = data.list && data.list[0];
    if (!file) throw new Error('No file info found in Terabox API response');
    return {
      url: normalized,
      title: file.server_filename,
      size: file.size,
      category: file.category,
      isdir: file.isdir,
      server_filename: file.server_filename,
      dlink: file.dlink,
      thumbs: file.thumbs,
      description: undefined,
      thumbnail: file.thumbs?.url1 || file.thumbs?.icon,
    };
  } catch (error: any) {
    console.error(`[Scraper] Error scraping ${normalized}:`, error);
    return { url: normalized, title: '', error: error.message };
  }
}

export async function scrapeWithPlaywright(urls: string[]): Promise<ScrapedMetadata[]> {
  // Use installed Chrome for best compatibility, non-headless for debug
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  // Create a context with user-agent and headers
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Google Chrome";v="115", "Chromium";v="115", ";Not A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'upgrade-insecure-requests': '1',
      'referer': 'https://1024terabox.com/',
    },
  });
  const results: ScrapedMetadata[] = [];

  // Limit concurrency to avoid overload — batch size = 5
  const concurrency = 5;
  const batches = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    batches.push(urls.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(url => scrapeSingle(url, context)));
    results.push(...batchResults);
  }

  await browser.close();
  return results;
}
