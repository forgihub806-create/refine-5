import { chromium, type Browser, type Page } from 'playwright';

export interface ScrapedMetadata {
  url: string;
  title: string;
  description?: string;
  thumbnail?: string;
  type?: string;
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
  console.log(`[Scraper] Starting to scrape single URL for meta tags: ${normalized}`);

  try {
    const page: Page = await context.newPage();
    await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 60000 });

    const getMetaContent = async (name: string) => {
      try {
        return await page.evaluate((name) => {
          const meta = document.querySelector(`meta[property='${name}']`) || document.querySelector(`meta[name='${name}']`);
          return meta ? meta.getAttribute('content') : null;
        }, name);
      } catch (e) {
        console.warn(`[Scraper] Could not evaluate meta tag '${name}':`, e);
        return null;
      }
    };

    const title = await getMetaContent('og:title') || await page.title();
    const description = await getMetaContent('og:description');
    const thumbnail = await getMetaContent('og:image');
    const type = await getMetaContent('og:type');

    await page.close();

    if (!title) {
        throw new Error('Could not find title or og:title meta tag.');
    }

    return {
      url: normalized,
      title,
      description: description || undefined,
      thumbnail: thumbnail || undefined,
      type: type || undefined,
    };

  } catch (error: any) {
    console.error(`[Scraper] Error scraping ${normalized} for meta tags:`, error);
    return { url: normalized, title: '', error: error.message };
  }
}

export async function scrapeWithPlaywright(urls: string[]): Promise<ScrapedMetadata[]> {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
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
