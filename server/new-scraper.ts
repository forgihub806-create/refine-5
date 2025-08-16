import fetch from 'node-fetch';
import { URL, URLSearchParams } from 'url';

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
};

const VIDEO_EXT = [".mp4", ".mkv", ".avi", ".mov", ".flv", ".wmv", ".webm", ".m4v"];
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"];
const AUDIO_EXT = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"];
const DOC_EXT = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
const ARCH_EXT = [".zip", ".rar", ".7z", ".tar", ".gz"];

function humanSize(n: number | null): string | null {
    if (n === null) {
        return null;
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let val = n;
    while (val >= 1024 && i < units.length - 1) {
        val /= 1024.0;
        i += 1;
    }
    return `${val.toFixed(2)} ${units[i]}`;
}

function guessType(name: string): string {
    if (!name) {
        return "other";
    }
    const lower = name.toLowerCase();
    for (const ext of VIDEO_EXT) {
        if (lower.endsWith(ext)) return "video";
    }
    for (const ext of IMAGE_EXT) {
        if (lower.endsWith(ext)) return "image";
    }
    for (const ext of AUDIO_EXT) {
        if (lower.endsWith(ext)) return "audio";
    }
    for (const ext of DOC_EXT) {
        if (lower.endsWith(ext)) return "document";
    }
    for (const ext of ARCH_EXT) {
        if (lower.endsWith(ext)) return "archive";
    }
    return "other";
}

function extractSurl(url: string): string | null {
    try {
        const parsed = new URL(url);
        const surl = parsed.searchParams.get("surl");
        if (surl) {
            return surl;
        }
        const match = parsed.pathname.match(/\/s\/1([A-Za-z0-9_-]+)/);
        if (match) {
            return match[1];
        }
    } catch (e) {
        // ignore invalid urls
    }
    return null;
}

async function resolveFinalUrl(url: string): Promise<string> {
    const response = await fetch(url, { headers: HEADERS, redirect: 'follow' });
    return response.url;
}

function pickApiBase(hostname: string | null): string {
    hostname = (hostname || "").toLowerCase();
    if (hostname.includes("1024tera.com")) {
        return "https://www.1024tera.com/share/list";
    }
    if (hostname.includes("terabox.app")) {
        return "https://www.terabox.app/share/list";
    }
    if (hostname.includes("terabox.com")) {
        return "https://www.terabox.com/share/list";
    }
    return "https://www.terabox.app/share/list";
}

async function shareList(apiUrl: string, surl: string, referrer?: string, folderFsid?: string): Promise<any[] | null> {
    const baseData = new URLSearchParams({
        app_id: "250528",
        web: "1",
        channel: "0",
        clienttype: "0",
        shorturl: surl,
        root: "1",
    });

    const headers: Record<string, string> = { ...HEADERS };
    if (referrer) {
        headers["Referer"] = referrer;
        headers["Origin"] = referrer.split("/sharing/")[0] || referrer;
    }
    if (folderFsid) {
        baseData.set("fs_id", folderFsid);
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: baseData,
        });
        const j = await response.json();
        if (typeof j === 'object' && j !== null && (j as any).errno === 0 && Array.isArray((j as any).list)) {
            return (j as any).list;
        }
    } catch (e) {
        return null;
    }
    return null;
}

export async function getSingleFileInfo(url: string): Promise<Record<string, any>> {
    const finalUrl = await resolveFinalUrl(url);
    const surl = extractSurl(finalUrl) || extractSurl(url);
    if (!surl) {
        return { error: "Could not parse surl from URL" };
    }

    const apiUrl = pickApiBase(new URL(finalUrl).hostname);
    let items = await shareList(apiUrl, surl, finalUrl);
    if (!items) {
        return { error: "Failed to fetch metadata", url: finalUrl };
    }

    // unwrap single-folder wrappers until we hit a file
    let depth = 0;
    while (depth < 3 && items.length === 1 && items[0]?.isdir === 1) {
        const folderId = items[0]?.fs_id;
        const inner = await shareList(apiUrl, surl, finalUrl, folderId);
        if (!inner) {
            break;
        }
        items = inner;
        depth += 1;
    }

    if (items.length !== 1 || items[0]?.isdir === 1) {
        // It's a folder or multi-file share
        return {
            title: items[0]?.server_filename || 'Folder',
            description: "This is a folder, not a single file.",
            size_bytes: null,
            size_human: null,
            thumbnail: null,
            type: 'folder',
            url: finalUrl,
        };
    }

    const f = items[0];
    const name = f.server_filename || f.filename;
    const size = f.size ? parseInt(f.size, 10) : null;

    let thumb = null;
    const thumbs = f.thumbs;
    if (typeof thumbs === 'object' && thumbs !== null) {
        thumb = thumbs.url3 || thumbs.url2 || thumbs.url1;
    }

    return {
        title: name,
        description: "Shared via TeraBox",
        size_bytes: size,
        size_human: humanSize(size),
        thumbnail: thumb,
        type: guessType(name),
        url: finalUrl,
    };
}
