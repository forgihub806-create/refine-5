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
      let shareid = undefined;
      let uk = undefined;
      // Try window context
      // @ts-ignore
      if (window.shareid) shareid = window.shareid;
      // @ts-ignore
      if (window.uk) uk = window.uk;
      // Try meta tags or script tags (support string or number)
      const html = document.documentElement.innerHTML;
      // Try both string and number for shareid/uk
      let shareidMatch = html.match(/shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
      let ukMatch = html.match(/uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
      if (shareidMatch && shareidMatch[1]) shareid = shareidMatch[1];
      if (ukMatch && ukMatch[1]) uk = ukMatch[1];
      // Scan all <script> tags for JSON with shareid/uk
      if (!shareid || !uk) {
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const script of scripts) {
          const text = script.textContent || '';
          // Look for JSON with shareid/uk
          try {
            if (text.includes('shareid') || text.includes('uk')) {
              // Try to extract with regex
              let sMatch = text.match(/shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
              let uMatch = text.match(/uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
              if (sMatch && sMatch[1] && !shareid) shareid = sMatch[1];
              if (uMatch && uMatch[1] && !uk) uk = uMatch[1];
              // Try to parse as JSON if it looks like an object
              if ((!shareid || !uk) && text.trim().startsWith('{')) {
                try {
                  const obj = JSON.parse(text);
                  if (obj.shareid && !shareid) shareid = obj.shareid;
                  if (obj.uk && !uk) uk = obj.uk;
                } catch {}
              }
            }
          } catch {}
        }
      }
      // If still not found, return first 5000 chars of HTML for debug
      if (!shareid || !uk) {
        return { shareid, uk, htmlDebug: html.slice(0, 5000) };
      }
      return { shareid, uk };
    });
    shareid = shareInfo.shareid;
    uk = shareInfo.uk;
    if (!shareid || !uk) {
      console.warn('[Scraper] Could not extract shareid or uk. HTML debug:', shareInfo.htmlDebug);
    }
    console.log(`[Scraper] Extracted shareid: ${shareid}, uk: ${uk}`);
    await page.close();
    const { data, debug } = await fetchTeraboxFileInfo({ shortUrl, appId, shareid, uk, debug: true });
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
