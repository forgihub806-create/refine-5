import type { Request, Response } from 'express';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function mdiskProxy(req: Request, res: Response) {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'msc': 'awvqjqohzeaeymhgfrpsgq',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    let initialState = null;
    $('script').each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.includes('window.__INITIAL_STATE__')) {
        const match = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/);
        if (match && match[1]) {
          try {
            initialState = JSON.parse(match[1]);
          } catch (e) {
            console.error('Failed to parse INITIAL_STATE JSON:', e);
          }
        }
      }
    });

    if (initialState) {
      res.json(initialState);
    } else {
      res.status(404).json({ error: 'Could not find or parse window.__INITIAL_STATE__' });
    }
  } catch (err) {
    if (err instanceof Error) {
        res.status(500).json({ error: err.message });
    } else {
        res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
