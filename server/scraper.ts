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
      let shareid: string | undefined = undefined;
      let uk: string | undefined = undefined;

      // 1. Try window context first, ensuring values are strings
      // @ts-ignore
      if (window.shareid) shareid = String(window.shareid);
      // @ts-ignore
      if (window.uk) uk = String(window.uk);
      if (shareid && uk) return { shareid, uk };

      // 2. Search meta tags for shareid and uk
      const metaTags = Array.from(document.querySelectorAll('meta'));
      for (const meta of metaTags) {
        const content = meta.content || '';
        if (meta.name === 'shareid' || meta.property === 'shareid') {
          if (content && !shareid) shareid = content;
        }
        if (meta.name === 'uk' || meta.property === 'uk') {
          if (content && !uk) uk = content;
        }
      }
      if (shareid && uk) return { shareid, uk };

      // 3. Scan all <script> tags for JSON data and regex matches
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const text = script.textContent || '';
        if (!shareid || !uk) {
            // Try to parse as JSON if it looks like an object
            if (text.trim().startsWith('{')) {
              try {
                const obj = JSON.parse(text);
                if (obj.shareid && !shareid) shareid = String(obj.shareid);
                if (obj.uk && !uk) uk = String(obj.uk);

                // Look in nested structures (e.g., Next.js page props)
                if (obj.props?.pageProps?.fileInfo) {
                  const fileInfo = obj.props.pageProps.fileInfo;
                  if (fileInfo.shareid && !shareid) shareid = String(fileInfo.shareid);
                  if (fileInfo.uk && !uk) uk = String(fileInfo.uk);
                }
              } catch {}
            }

            // Try to extract with a more flexible regex, looking for assignments
            let sMatch = text.match(/["']?shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/);
            let uMatch = text.match(/["']?uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/);
            if (sMatch && sMatch[1] && !shareid) shareid = sMatch[1];
            if (uMatch && uMatch[1] && !uk) uk = uMatch[1];
        }
      }
      if (shareid && uk) return { shareid, uk };

      // 5. Try to apply hint-based logic, as a targeted fallback
      if (!shareid) {
        // User hint: "see in server the metadata slastIndexOf(")")),a=t.substring(0,o),o=t.su"
        for (const script of scripts) {
            const text = script.textContent || '';
            // The double parenthesis seems to be a key part of the hint
            if (text.includes('lastIndexOf("))")')) {
                try {
                    // This is experimental. We assume `t` is a variable in the script's scope.
                    // We can't access the scope directly, but we can try to extract it if it's a simple string literal.
                    const tMatch = text.match(/let\s+t\s*=\s*"(.*?)"/);
                    if (tMatch && tMatch[1]) {
                        let t = tMatch[1];
                        let o = t.lastIndexOf("))");
                        let a = t.substring(0, o); // 'a' is now a substring of 't'

                        // The hint is incomplete. We are guessing what 'a' is.
                        // It could be a JSON string.
                        try {
                            const data = JSON.parse(a);
                            if (data.shareid) {
                                shareid = String(data.shareid);
                            }
                            if (data.uk) {
                                uk = String(data.uk);
                            }
                        } catch {
                            // If not JSON, maybe it's another format.
                            // This part is too speculative without more info.
                        }
                    }
                } catch (e) {
                    // This is experimental, so errors are possible.
                }
            }
            if (shareid) break;
        }
      }

      // 4. Final regex pass on the whole HTML as a fallback
      const html = document.documentElement.innerHTML;
      if (!shareid) {
          let shareidMatch = html.match(/shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
          if (shareidMatch && shareidMatch[1]) shareid = shareidMatch[1];
      }
      if (!uk) {
          let ukMatch = html.match(/uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
          if (ukMatch && ukMatch[1]) uk = ukMatch[1];
      }

      // If still not found, return what we have, plus HTML for debug
      if (!shareid || !uk) {
        return { shareid, uk, htmlDebug: html }; // Return full HTML for debugging
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
