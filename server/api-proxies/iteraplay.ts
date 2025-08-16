import type { Request, Response } from 'express';
import fetch from 'node-fetch';

const ITERAPLAY_API_KEY = 'terabox_pro_api_august_2025_premium';

export async function iteraplayProxy(req: Request, res: Response) {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: "Missing 'link' in request body" });
  }

  try {
    const response = await fetch('https://api.iteraplay.com/', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'x-api-key': ITERAPLAY_API_KEY,
        'Referer': 'https://www.teraboxdownloader.pro/',
      },
      body: JSON.stringify({ link }),
    });

    // The comment in the original file says it returns JSON, so we parse it.
    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err instanceof Error) {
        res.status(500).json({ error: err.message });
    } else {
        res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
