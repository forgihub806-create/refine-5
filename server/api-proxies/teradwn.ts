import type { Request, Response } from 'express';
import fetch from 'node-fetch';

export async function teradwnProxy(req: Request, res: Response) {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: 'Link is required' });
  }

  try {
    const params = new URLSearchParams();
    params.append('action', 'terabox_fetch');
    params.append('url', link);
    params.append('nonce', 'ada26da710');

    const response = await fetch('https://teradownloadr.com/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        'referer': 'https://teradownloadr.com/',
      },
      body: params.toString(),
    });

    const data = await response.text();
    try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
    } catch (e) {
        res.send(data);
    }

  } catch (err) {
    if (err instanceof Error) {
        res.status(500).json({ error: err.message });
    } else {
        res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
