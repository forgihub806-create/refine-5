import type { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function teraboxFastProxy(req: Request, res: Response) {
  const { url, key } = req.query;
  if (!url || !key) {
    return res.status(400).json({ error: 'Missing url or key' });
  }

  try {
    const response = await fetch('https://hex.teraboxfast2.workers.dev/', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'referer': 'https://www.teraboxfast.com/',
      },
      body: JSON.stringify({
        url: url,
        key: key,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err instanceof Error) {
        res.status(500).json({ error: err.message });
    } else {
        res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}
