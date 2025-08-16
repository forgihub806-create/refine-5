import type { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function playerteraProxy(req: Request, res: Response) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  try {
    const response = await fetch('https://playertera.com/api/process-terabox', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-csrf-token': 'w0p0LHPpNZFrLR6Rh78o8zBzzyXdeZdEMjiDSSD4', // may expire
        'Referer': 'https://playertera.com/',
      },
      body: JSON.stringify({ url }),
    });

    const text = await response.text();
    try {
      // Try to parse as JSON first
      const data = JSON.parse(text);
      res.json(data);
    } catch (e) {
      // If it's not JSON, send as plain text to avoid doctype errors on the client
      res.send(text);
    }
  } catch (err) {
    if (err instanceof Error) {
        res.status(500).json({ error: err.message });
    } else {
        res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
