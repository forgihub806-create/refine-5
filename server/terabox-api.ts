import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

interface ShareListParams {
    apiUrl: string;
    surl: string;
    referrer?: string;
    folder_fsid?: string;
}

export async function shareList({ apiUrl, surl, referrer, folder_fsid }: ShareListParams): Promise<any[] | null> {
    const base_data = {
        app_id: "250528",
        web: "1",
        channel: "0",
        clienttype: "0",
        shorturl: surl,
        root: "1",
        fs_id: folder_fsid || undefined,
    };

    const headers = { ...HEADERS };
    if (referrer) {
        headers['Referer'] = referrer;
        const originMatch = referrer.match(/^(https?:\/\/[^\/]+)/);
        if (originMatch) {
            headers['Origin'] = originMatch[1];
        }
    }

    const body = new URLSearchParams(Object.entries(base_data).filter(([_, v]) => v !== undefined));

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            timeout: 12000,
        });

        if (!response.ok) {
            return null;
        }

        const json: any = await response.json();

        if (json && json.errno === 0 && Array.isArray(json.list)) {
            return json.list;
        }
    } catch (error) {
        console.error("[TeraboxAPI] shareList failed:", error);
        return null;
    }

    return null;
}
