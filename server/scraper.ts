import fetch from 'node-fetch';
import { URL } from 'url';
import { shareList } from './terabox-api';

// ---------- Config ----------
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
};

const VIDEO_EXT = [".mp4", ".mkv", ".avi", ".mov", ".flv", ".wmv", ".webm", ".m4v"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"];
const AUDIO_EXT = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"];
const DOC_EXT   = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
const ARCH_EXT  = [".zip", ".rar", ".7z", ".tar", ".gz"];

export interface ScrapedMetadata {
    url: string;
    title: string;
    description?: string;
    thumbnail?: string;
    type?: string;
    size?: number;
    error?: string;
    is_folder?: boolean;
}

// ---------- Helpers ----------
function guessType(name?: string): string {
    if (!name) return "other";
    const lower = name.toLowerCase();
    if (VIDEO_EXT.some(ext => lower.endsWith(ext))) return "video";
    if (IMAGE_EXT.some(ext => lower.endsWith(ext))) return "image";
    if (AUDIO_EXT.some(ext => lower.endsWith(ext))) return "audio";
    if (DOC_EXT.some(ext => lower.endsWith(ext))) return "document";
    if (ARCH_EXT.some(ext => lower.endsWith(ext))) return "archive";
    return "other";
}

function extractSurl(url: string): string | null {
    try {
        const parsedUrl = new URL(url);
        const surl = parsedUrl.searchParams.get("surl");
        if (surl) return surl;
        const match = parsedUrl.pathname.match(/\/s\/1([A-Za-z0-9_-]+)/);
        if (match) return match[1];
    } catch (e) {}
    return null;
}

async function resolveFinalUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url, { headers: HEADERS, redirect: 'follow', timeout: 12000 });
        return response.url;
    } catch (e) {
        return url; // return original if fails
    }
}

function pickApiBase(hostname?: string): string {
    hostname = (hostname || "").toLowerCase();
    if (hostname.includes("1024tera.com")) return "https://www.1024tera.com/share/list";
    if (hostname.includes("terabox.app")) return "https://www.terabox.app/share/list";
    if (hostname.includes("terabox.com")) return "https://www.terabox.com/share/list";
    return "https://www.terabox.app/share/list";
}


// ---------- Core ----------
async function getSingleFileInfo(url: string): Promise<ScrapedMetadata> {
    const finalUrl = await resolveFinalUrl(url);
    const surl = extractSurl(finalUrl) || extractSurl(url);

    if (!surl) {
        return { url, title: '', error: "Could not parse surl from URL" };
    }

    const apiUrl = pickApiBase(new URL(finalUrl).hostname);
    let items = await shareList({ apiUrl, surl, referrer: finalUrl });

    if (!items) {
        return { url: finalUrl, title: '', error: "Failed to fetch metadata" };
    }

    // unwrap single-folder wrappers until we hit a file
    let depth = 0;
    while (depth < 3 && items.length === 1 && items[0]?.isdir === 1) {
        const folder_id = items[0].fs_id;
        const inner = await shareList({ apiUrl, surl, referrer: finalUrl, folder_fsid: folder_id });
        if (!inner) break;
        items = inner;
        depth += 1;
    }

    if (items.length !== 1 || items[0]?.isdir === 1) {
        const folder = items[0];
        const title = folder?.server_filename || folder?.filename || "Folder";
        return {
            url: finalUrl,
            title: title,
            is_folder: true,
            type: 'folder'
        };
    }

    const f = items[0];
    const name = f.server_filename || f.filename;
    const size = f.size ? parseInt(f.size, 10) : undefined;
    const thumb = f.thumbs?.url3 || f.thumbs?.url2 || f.thumbs?.url1;

    return {
        title: name,
        description: "Shared via TeraBox",
        size: size,
        thumbnail: thumb,
        type: guessType(name),
        url: finalUrl,
        is_folder: false,
    };
}


export async function scrape(urls: string[]): Promise<ScrapedMetadata[]> {
    const results: ScrapedMetadata[] = [];
    for (const url of urls) {
        const info = await getSingleFileInfo(url);
        results.push(info);
    }
    return results;
}
