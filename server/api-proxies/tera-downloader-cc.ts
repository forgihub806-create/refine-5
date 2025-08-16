import type { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function teraDownloaderCcProxy(req: Request, res: Response) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await fetch('https://www.tera-downloader.cc/api/terabox-download', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'referer': 'https://www.tera-downloader.cc/',
      },
      body: JSON.stringify({ url }),
    });

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
