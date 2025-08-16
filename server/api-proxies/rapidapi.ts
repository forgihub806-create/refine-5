import type { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function rapidapiProxy(req: Request, res: Response) {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: 'No link provided' });
  }

  try {
    const response = await fetch('https://terabox-downloader-direct-download-link-generator.p.rapidapi.com/fetch', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-rapidapi-host': 'terabox-downloader-direct-download-link-generator.p.rapidapi.com',
        'x-rapidapi-key': '357969b221msh32ff3122376c473p103b55jsn8b5dd54f26b7',
        'accept': '*/*',
      },
      body: JSON.stringify({ url: link }),
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
