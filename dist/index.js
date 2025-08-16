var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  apiOptions: () => apiOptions,
  categories: () => categories,
  categoryRelations: () => categoryRelations,
  insertApiOptionSchema: () => insertApiOptionSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertMediaItemCategorySchema: () => insertMediaItemCategorySchema,
  insertMediaItemSchema: () => insertMediaItemSchema,
  insertMediaItemTagSchema: () => insertMediaItemTagSchema,
  insertTagSchema: () => insertTagSchema,
  insertUserSchema: () => insertUserSchema,
  mediaItemCategories: () => mediaItemCategories,
  mediaItemCategoryRelations: () => mediaItemCategoryRelations,
  mediaItemRelations: () => mediaItemRelations,
  mediaItemTagRelations: () => mediaItemTagRelations,
  mediaItemTags: () => mediaItemTags,
  mediaItems: () => mediaItems,
  tagRelations: () => tagRelations,
  tags: () => tags,
  users: () => users
});
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var mediaItems = sqliteTable("media_items", {
  id: text("id").primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  type: text("type", { enum: ["video", "folder"] }).notNull().default("video"),
  duration: integer("duration"),
  // in seconds
  size: integer("size"),
  // in bytes
  downloadUrl: text("download_url"),
  downloadExpiresAt: integer("download_expires_at", { mode: "timestamp" }),
  downloadFetchedAt: integer("download_fetched_at", { mode: "timestamp" }),
  scrapedAt: integer("scraped_at", { mode: "timestamp" }),
  error: text("error"),
  folderVideoCount: integer("folder_video_count").default(0),
  folderImageCount: integer("folder_image_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
});
var tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").default("primary"),
  createdAt: integer("created_at", { mode: "timestamp" })
});
var mediaItemTags = sqliteTable("media_item_tags", {
  id: text("id").primaryKey(),
  mediaItemId: text("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
});
var categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
});
var mediaItemCategories = sqliteTable("media_item_categories", {
  id: text("id").primaryKey(),
  mediaItemId: text("media_item_id").notNull().references(() => mediaItems.id, { onDelete: "cascade" }),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" })
});
var apiOptions = sqliteTable("api_options", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  method: text("method", { enum: ["GET", "POST"] }).notNull().default("POST"),
  type: text("type", { enum: ["json", "query"] }).notNull().default("json"),
  field: text("field").notNull(),
  status: text("status", { enum: ["available", "limited", "offline"] }).notNull().default("available"),
  isActive: integer("is_active", { mode: "boolean" }).default(true)
});
var mediaItemRelations = relations(mediaItems, ({ many }) => ({
  tags: many(mediaItemTags),
  categories: many(mediaItemCategories)
}));
var tagRelations = relations(tags, ({ many }) => ({
  mediaItems: many(mediaItemTags)
}));
var categoryRelations = relations(categories, ({ many }) => ({
  mediaItems: many(mediaItemCategories)
}));
var mediaItemTagRelations = relations(mediaItemTags, ({ one }) => ({
  mediaItem: one(mediaItems, {
    fields: [mediaItemTags.mediaItemId],
    references: [mediaItems.id]
  }),
  tag: one(tags, {
    fields: [mediaItemTags.tagId],
    references: [tags.id]
  })
}));
var mediaItemCategoryRelations = relations(mediaItemCategories, ({ one }) => ({
  mediaItem: one(mediaItems, {
    fields: [mediaItemCategories.mediaItemId],
    references: [mediaItems.id]
  }),
  category: one(categories, {
    fields: [mediaItemCategories.categoryId],
    references: [categories.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertMediaItemSchema = createInsertSchema(mediaItems).omit({
  id: true,
  createdAt: true
});
var insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true
});
var insertMediaItemTagSchema = createInsertSchema(mediaItemTags).omit({
  id: true
});
var insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});
var insertMediaItemCategorySchema = createInsertSchema(mediaItemCategories).omit({
  id: true
});
var insertApiOptionSchema = createInsertSchema(apiOptions).omit({
  id: true
});

// server/routes.ts
import { z } from "zod";

// server/new-scraper.ts
import fetch from "node-fetch";
import { URL, URLSearchParams as URLSearchParams2 } from "url";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
};
var VIDEO_EXT = [".mp4", ".mkv", ".avi", ".mov", ".flv", ".wmv", ".webm", ".m4v"];
var IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"];
var AUDIO_EXT = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a"];
var DOC_EXT = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"];
var ARCH_EXT = [".zip", ".rar", ".7z", ".tar", ".gz"];
function humanSize(n) {
  if (n === null) {
    return null;
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = n;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(2)} ${units[i]}`;
}
function guessType(name) {
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
function extractSurl(url) {
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
  }
  return null;
}
async function resolveFinalUrl(url) {
  const response = await fetch(url, { headers: HEADERS, redirect: "follow" });
  return response.url;
}
function pickApiBase(hostname) {
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
async function shareList(apiUrl, surl, referrer, folderFsid) {
  const baseData = new URLSearchParams2({
    app_id: "250528",
    web: "1",
    channel: "0",
    clienttype: "0",
    shorturl: surl,
    root: "1"
  });
  const headers = { ...HEADERS };
  if (referrer) {
    headers["Referer"] = referrer;
    headers["Origin"] = referrer.split("/sharing/")[0] || referrer;
  }
  if (folderFsid) {
    baseData.set("fs_id", folderFsid);
  }
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: baseData
    });
    const j = await response.json();
    if (typeof j === "object" && j !== null && j.errno === 0 && Array.isArray(j.list)) {
      return j.list;
    }
  } catch (e) {
    return null;
  }
  return null;
}
async function getSingleFileInfo(url) {
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
    return {
      title: items[0]?.server_filename || "Folder",
      description: "This is a folder, not a single file.",
      size_bytes: null,
      size_human: null,
      thumbnail: null,
      type: "folder",
      url: finalUrl
    };
  }
  const f = items[0];
  const name = f.server_filename || f.filename;
  const size = f.size ? parseInt(f.size, 10) : null;
  let thumb = null;
  const thumbs = f.thumbs;
  if (typeof thumbs === "object" && thumbs !== null) {
    thumb = thumbs.url3 || thumbs.url2 || thumbs.url1;
  }
  return {
    title: name,
    description: "Shared via TeraBox",
    size_bytes: size,
    size_human: humanSize(size),
    thumbnail: thumb,
    type: guessType(name),
    url: finalUrl
  };
}

// server/api-proxies/terabox-fast.ts
import fetch2 from "node-fetch";
async function teraboxFastProxy(req, res) {
  const { url, key } = req.query;
  if (!url || !key) {
    return res.status(400).json({ error: "Missing url or key" });
  }
  try {
    const response = await fetch2("https://hex.teraboxfast2.workers.dev/", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "content-type": "application/json",
        "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "referer": "https://www.teraboxfast.com/"
      },
      body: JSON.stringify({
        url,
        key
      })
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

// server/api-proxies/iteraplay.ts
import fetch3 from "node-fetch";
var ITERAPLAY_API_KEY = "terabox_pro_api_august_2025_premium";
async function iteraplayProxy(req, res) {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: "Missing 'link' in request body" });
  }
  try {
    const response = await fetch3("https://api.iteraplay.com/", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "x-api-key": ITERAPLAY_API_KEY,
        "Referer": "https://www.teraboxdownloader.pro/"
      },
      body: JSON.stringify({ link })
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

// server/api-proxies/playertera.ts
import fetch4 from "node-fetch";
async function playerteraProxy(req, res) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }
  try {
    const response = await fetch4("https://playertera.com/api/process-terabox", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "priority": "u=1, i",
        "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-csrf-token": "w0p0LHPpNZFrLR6Rh78o8zBzzyXdeZdEMjiDSSD4",
        // may expire
        "Referer": "https://playertera.com/"
      },
      body: JSON.stringify({ url })
    });
    const text2 = await response.text();
    try {
      const data = JSON.parse(text2);
      res.json(data);
    } catch (e) {
      res.send(text2);
    }
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}

// server/api-proxies/mdisk.ts
import fetch5 from "node-fetch";
import * as cheerio from "cheerio";
async function mdiskProxy(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }
  try {
    const response = await fetch5(targetUrl, {
      method: "GET",
      headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "msc": "awvqjqohzeaeymhgfrpsgq",
        "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    let initialState = null;
    $("script").each((i, el) => {
      const scriptContent = $(el).html();
      if (scriptContent && scriptContent.includes("window.__INITIAL_STATE__")) {
        const match = scriptContent.match(/window\.__INITIAL_STATE__\s*=\s*({.*});/);
        if (match && match[1]) {
          try {
            initialState = JSON.parse(match[1]);
          } catch (e) {
            console.error("Failed to parse INITIAL_STATE JSON:", e);
          }
        }
      }
    });
    if (initialState) {
      res.json(initialState);
    } else {
      res.status(404).json({ error: "Could not find or parse window.__INITIAL_STATE__" });
    }
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}

// server/api-proxies/rapidapi.ts
import fetch6 from "node-fetch";
async function rapidapiProxy(req, res) {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: "No link provided" });
  }
  try {
    const response = await fetch6("https://terabox-downloader-direct-download-link-generator.p.rapidapi.com/fetch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-rapidapi-host": "terabox-downloader-direct-download-link-generator.p.rapidapi.com",
        "x-rapidapi-key": "357969b221msh32ff3122376c473p103b55jsn8b5dd54f26b7",
        "accept": "*/*"
      },
      body: JSON.stringify({ url: link })
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

// server/api-proxies/tera-downloader-cc.ts
import fetch7 from "node-fetch";
async function teraDownloaderCcProxy(req, res) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  try {
    const response = await fetch7("https://www.tera-downloader.cc/api/terabox-download", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "referer": "https://www.tera-downloader.cc/"
      },
      body: JSON.stringify({ url })
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

// server/api-proxies/teradwn.ts
import fetch8 from "node-fetch";
async function teradwnProxy(req, res) {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: "Link is required" });
  }
  try {
    const params = new URLSearchParams();
    params.append("action", "terabox_fetch");
    params.append("url", link);
    params.append("nonce", "ada26da710");
    const response = await fetch8("https://teradownloadr.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "referer": "https://teradownloadr.com/"
      },
      body: params.toString()
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
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}

// server/routes.ts
var PORT = process.env.PORT || 5e3;
var BASE_URL = `http://localhost:${PORT}`;
async function scrapeMetadata(mediaItemId, storage2) {
  const mediaItem = await storage2.getMediaItem(mediaItemId);
  if (!mediaItem) return;
  console.log(`Scraping metadata for: ${mediaItem.url}`);
  const result = await getSingleFileInfo(mediaItem.url);
  if (result) {
    console.log("Scrape result:", result);
    if (result.title) {
      const updates = {
        title: result.title,
        description: result.description || mediaItem.description,
        thumbnail: result.thumbnail || mediaItem.thumbnail,
        size: result.size_bytes,
        type: result.type,
        error: null,
        scrapedAt: /* @__PURE__ */ new Date()
      };
      console.log("Updating media item with new metadata:", updates);
      await storage2.updateMediaItem(mediaItemId, updates);
    } else {
      const updates = {
        error: result.error || "Scraping failed to find a title.",
        scrapedAt: /* @__PURE__ */ new Date()
      };
      console.log("Updating media item with scrape error:", updates);
      await storage2.updateMediaItem(mediaItemId, updates);
    }
  } else {
    const updates = {
      error: "Failed to scrape metadata (no result returned).",
      scrapedAt: /* @__PURE__ */ new Date()
    };
    console.log("Updating media item with general scrape failure:", updates);
    await storage2.updateMediaItem(mediaItemId, updates);
  }
}
function registerRoutes(app, storage2) {
  app.get("/health", (req, res) => {
    console.log("Health check requested");
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/categories", async (req, res) => {
    try {
      const categories2 = await storage2.getCategories();
      res.json(categories2 || []);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });
  app.get("/api/media/pages", async (req, res) => {
    try {
      const { search, tags: tags2, categories: categories2, type, sizeRange, page = "1", limit = "20" } = req.query;
      const params = {
        search,
        tags: tags2 ? Array.isArray(tags2) ? tags2 : [tags2] : void 0,
        categories: categories2 ? Array.isArray(categories2) ? categories2 : [categories2] : void 0,
        type,
        sizeRange,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      const result = await storage2.getMediaItems(params);
      const itemsNeedingMetadata = result.items.filter(
        (item) => !item.title || item.title === "Processing..." || !item.thumbnail || !item.scrapedAt
      );
      if (itemsNeedingMetadata.length > 0) {
        Promise.all(
          itemsNeedingMetadata.map((item) => scrapeMetadata(item.id, storage2))
        ).catch((error) => {
          console.error("Background metadata fetching failed:", error);
        });
      }
      res.json(result);
    } catch (error) {
      console.error("Error in GET /api/media/pages:", error);
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });
  app.get("/api/api-options", async (req, res) => {
    try {
      const options = await storage2.getApiOptions();
      res.json(options);
    } catch (error) {
      console.error("Get API options error:", error);
      res.status(500).json({ error: "Failed to fetch API options" });
    }
  });
  app.get("/api/teraboxfast", teraboxFastProxy);
  app.post("/api/iteraplay-proxy", iteraplayProxy);
  app.post("/api/playertera-proxy", playerteraProxy);
  app.get("/api/mdisk-proxy", mdiskProxy);
  app.post("/api/rapidapi", rapidapiProxy);
  app.post("/api/tera-downloader-cc", teraDownloaderCcProxy);
  app.post("/api/teradownloadr", teradwnProxy);
  app.get("/api/media", async (req, res) => {
    try {
      const { search, tags: tags2, type, sizeRange, page = "1", limit = "20" } = req.query;
      const params = {
        search,
        tags: tags2 ? Array.isArray(tags2) ? tags2 : [tags2] : void 0,
        type,
        sizeRange,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      const result = await storage2.getMediaItems(params);
      const itemsNeedingMetadata = result.items.filter(
        (item) => !item.title || item.title === "Processing..." || !item.thumbnail || !item.scrapedAt
      );
      if (itemsNeedingMetadata.length > 0) {
        Promise.all(
          itemsNeedingMetadata.map((item) => scrapeMetadata(item.id, storage2))
        ).catch((error) => {
          console.error("Background metadata fetching failed:", error);
        });
      }
      res.json(result);
    } catch (error) {
      console.error("Error in GET /api/media:", error);
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });
  app.get("/api/media/:id", async (req, res) => {
    try {
      const mediaItem = await storage2.getMediaItem(req.params.id);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media item" });
    }
  });
  app.post("/api/media", async (req, res) => {
    try {
      const { urls } = z.object({ urls: z.array(z.string().url()) }).parse(req.body);
      const createdItems = [];
      for (const url of urls) {
        let mediaItem = await storage2.getMediaItemByUrl(url);
        if (!mediaItem) {
          mediaItem = await storage2.createMediaItem({
            url,
            title: "Processing...",
            description: null,
            thumbnail: null
          });
        }
        createdItems.push(mediaItem);
      }
      res.status(201).json(createdItems);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Error creating media items:", error);
      res.status(500).json({ error: "Failed to create media items" });
    }
  });
  app.put("/api/media/:id", async (req, res) => {
    try {
      const updates = req.body;
      const mediaItem = await storage2.updateMediaItem(req.params.id, updates);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(mediaItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to update media item" });
    }
  });
  app.delete("/api/media/:id", async (req, res) => {
    try {
      const success = await storage2.deleteMediaItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media item" });
    }
  });
  app.post("/api/media/:id/metadata", async (req, res) => {
    try {
      const { id } = req.params;
      await scrapeMetadata(id, storage2);
      const mediaItem = await storage2.getMediaItem(id);
      res.json({ success: true, mediaItem, action: "metadata_fetched" });
    } catch (error) {
      console.error("Error fetching metadata:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });
  app.post("/api/media/:id/refresh", async (req, res) => {
    try {
      const { id } = req.params;
      await scrapeMetadata(id, storage2);
      const mediaItem = await storage2.getMediaItem(id);
      res.json({ success: true, mediaItem, action: "metadata_refreshed" });
    } catch (error) {
      console.error("Error refreshing metadata:", error);
      res.status(500).json({ error: "Failed to refresh metadata" });
    }
  });
  app.get("/api/tags", async (req, res) => {
    try {
      const tags2 = await storage2.getTags();
      res.json(tags2 || []);
    } catch (error) {
      console.error("Get tags error:", error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });
  app.post("/api/tags", async (req, res) => {
    try {
      const validatedData = insertTagSchema.parse(req.body);
      const tag = await storage2.createTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tag" });
    }
  });
  app.delete("/api/tags/:id", async (req, res) => {
    try {
      const success = await storage2.deleteTag(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });
  app.post("/api/media/:mediaId/tags/:tagId", async (req, res) => {
    try {
      const { mediaId, tagId } = req.params;
      const result = await storage2.addTagToMediaItem(mediaId, tagId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to add tag to media item" });
    }
  });
  app.delete("/api/media/:mediaId/tags/:tagId", async (req, res) => {
    try {
      const { mediaId, tagId } = req.params;
      const success = await storage2.removeTagFromMediaItem(mediaId, tagId);
      if (!success) {
        return res.status(404).json({ error: "Tag association not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove tag from media item" });
    }
  });
  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage2.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const success = await storage2.deleteCategory(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  app.post("/api/media/:mediaId/categories/:categoryId", async (req, res) => {
    try {
      const { mediaId, categoryId } = req.params;
      const result = await storage2.addCategoryToMediaItem(mediaId, categoryId);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to add category to media item" });
    }
  });
  app.delete("/api/media/:mediaId/categories/:categoryId", async (req, res) => {
    try {
      const { mediaId, categoryId } = req.params;
      const success = await storage2.removeCategoryFromMediaItem(mediaId, categoryId);
      if (!success) {
        return res.status(404).json({ error: "Category association not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove category from media item" });
    }
  });
  app.post("/api/api-options", async (req, res) => {
    try {
      const apiOption = await storage2.createApiOption(req.body);
      res.status(201).json(apiOption);
    } catch (error) {
      console.error("Error creating API option:", error);
      res.status(500).json({ error: "Failed to create API option" });
    }
  });
  app.put("/api/api-options/:id", async (req, res) => {
    try {
      const apiOption = await storage2.updateApiOption(req.params.id, req.body);
      if (!apiOption) {
        return res.status(404).json({ error: "API option not found" });
      }
      res.json(apiOption);
    } catch (error) {
      console.error("Error updating API option:", error);
      res.status(500).json({ error: "Failed to update API option" });
    }
  });
  app.delete("/api/api-options/:id", async (req, res) => {
    try {
      const deleted = await storage2.deleteApiOption(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "API option not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API option:", error);
      res.status(500).json({ error: "Failed to delete API option" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app, server2) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server: server2 },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/storage.ts
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
var DrizzleStorage = class {
  db;
  sqlite;
  dbPath;
  // Add dbPath property
  constructor(dbName = "/tmp/cipherbox.db") {
    this.dbPath = dbName;
    this.sqlite = new Database(this.dbPath, { verbose: console.log });
    this.db = drizzle(this.sqlite, { schema: schema_exports, logger: true });
  }
  async close() {
    console.log("Database connection closed");
  }
  // Implement all methods from IStorage using Drizzle ORM
  // Users
  async getUser(id) {
    return await this.db.query.users.findFirst({ where: eq(users.id, id) });
  }
  async getUserByUsername(username) {
    return await this.db.query.users.findFirst({ where: eq(users.username, username) });
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const newUser = { ...insertUser, id };
    await this.db.insert(users).values(newUser);
    return newUser;
  }
  // Media Items
  async getMediaItems(params) {
    const { search, tags: tagFilter, categories: categoryFilter, type, sizeRange, page = 1, limit = 20 } = params;
    const qb = this.db.select({
      id: mediaItems.id,
      title: mediaItems.title,
      url: mediaItems.url,
      thumbnail: mediaItems.thumbnail,
      type: mediaItems.type,
      createdAt: mediaItems.createdAt
    }).from(mediaItems);
    if (tagFilter && tagFilter.length > 0) {
      qb.leftJoin(mediaItemTags, eq(mediaItems.id, mediaItemTags.mediaItemId)).leftJoin(tags, eq(mediaItemTags.tagId, tags.id)).where(inArray(tags.name, tagFilter));
    }
    const items = await qb.limit(limit).offset((page - 1) * limit).orderBy(desc(mediaItems.createdAt));
    const total = 0;
    const detailedItems = await Promise.all(
      items.map((item) => this.getMediaItem(item.id))
    );
    const itemsWithTagsAndCategories = detailedItems.filter(
      (item) => item !== void 0
    );
    return { items: itemsWithTagsAndCategories, total };
  }
  async getMediaItem(id) {
    const result = await this.db.query.mediaItems.findFirst({
      where: eq(mediaItems.id, id),
      with: {
        tags: { with: { tag: true } },
        categories: { with: { category: true } }
      }
    });
    if (!result) return void 0;
    return {
      ...result,
      tags: result.tags.map((t) => t.tag),
      categories: result.categories.map((c) => c.category)
    };
  }
  async getMediaItemByUrl(url) {
    return await this.db.query.mediaItems.findFirst({ where: eq(mediaItems.url, url) });
  }
  async createMediaItem(insertItem) {
    const id = randomUUID();
    const newItem = {
      id,
      url: insertItem.url,
      title: insertItem.title,
      description: insertItem.description ?? null,
      thumbnail: insertItem.thumbnail ?? null,
      type: insertItem.type ?? "video",
      duration: insertItem.duration ?? null,
      size: insertItem.size ?? null,
      downloadUrl: insertItem.downloadUrl ?? null,
      downloadExpiresAt: insertItem.downloadExpiresAt ?? null,
      downloadFetchedAt: insertItem.downloadFetchedAt ?? null,
      scrapedAt: insertItem.scrapedAt ?? null,
      error: insertItem.error ?? null,
      folderVideoCount: insertItem.folderVideoCount ?? 0,
      folderImageCount: insertItem.folderImageCount ?? 0,
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.db.insert(mediaItems).values(newItem);
    return newItem;
  }
  async updateMediaItem(id, updates) {
    await this.db.update(mediaItems).set(updates).where(eq(mediaItems.id, id));
    return await this.getMediaItem(id);
  }
  async deleteMediaItem(id) {
    await this.db.delete(mediaItems).where(eq(mediaItems.id, id));
    return true;
  }
  // Tags
  async getTags() {
    return await this.db.query.tags.findMany({ orderBy: [asc(tags.name)] });
  }
  async getTag(id) {
    return await this.db.query.tags.findFirst({ where: eq(tags.id, id) });
  }
  async getTagByName(name) {
    return await this.db.query.tags.findFirst({ where: eq(tags.name, name) });
  }
  async createTag(insertTag) {
    const id = randomUUID();
    const newTag = {
      id,
      name: insertTag.name,
      color: insertTag.color ?? "primary",
      createdAt: /* @__PURE__ */ new Date()
    };
    await this.db.insert(tags).values(newTag);
    return newTag;
  }
  async updateTag(id, updates) {
    await this.db.update(tags).set(updates).where(eq(tags.id, id));
    return await this.getTag(id);
  }
  async deleteTag(id) {
    await this.db.delete(tags).where(eq(tags.id, id));
    return true;
  }
  // Categories
  async getCategories() {
    return await this.db.query.categories.findMany({ orderBy: [asc(categories.name)] });
  }
  async getCategory(id) {
    return await this.db.query.categories.findFirst({ where: eq(categories.id, id) });
  }
  async getCategoryByName(name) {
    return await this.db.query.categories.findFirst({ where: eq(categories.name, name) });
  }
  async createCategory(insertCategory) {
    const id = randomUUID();
    const newCategory = { ...insertCategory, id, createdAt: /* @__PURE__ */ new Date() };
    await this.db.insert(categories).values(newCategory);
    return newCategory;
  }
  async updateCategory(id, updates) {
    await this.db.update(categories).set(updates).where(eq(categories.id, id));
    return await this.getCategory(id);
  }
  async deleteCategory(id) {
    await this.db.delete(categories).where(eq(categories.id, id));
    return true;
  }
  // Media Item Tags
  async addTagToMediaItem(mediaItemId, tagId) {
    const id = randomUUID();
    const newMediaItemTag = { id, mediaItemId, tagId };
    await this.db.insert(mediaItemTags).values(newMediaItemTag);
    return newMediaItemTag;
  }
  async removeTagFromMediaItem(mediaItemId, tagId) {
    await this.db.delete(mediaItemTags).where(and(eq(mediaItemTags.mediaItemId, mediaItemId), eq(mediaItemTags.tagId, tagId)));
    return true;
  }
  async getTagsForMediaItem(mediaItemId) {
    const mediaItemTags2 = await this.db.query.mediaItemTags.findMany({ where: eq(mediaItemTags.mediaItemId, mediaItemId) });
    if (mediaItemTags2.length === 0) return [];
    const tagIds = mediaItemTags2.map((t) => t.tagId);
    return await this.db.query.tags.findMany({ where: inArray(tags.id, tagIds) });
  }
  // Media Item Categories
  async addCategoryToMediaItem(mediaItemId, categoryId) {
    const id = randomUUID();
    const newMediaItemCategory = { id, mediaItemId, categoryId };
    await this.db.insert(mediaItemCategories).values(newMediaItemCategory);
    return newMediaItemCategory;
  }
  async removeCategoryFromMediaItem(mediaItemId, categoryId) {
    await this.db.delete(mediaItemCategories).where(and(eq(mediaItemCategories.mediaItemId, mediaItemId), eq(mediaItemCategories.categoryId, categoryId)));
    return true;
  }
  async getCategoriesForMediaItem(mediaItemId) {
    const mediaItemCategories2 = await this.db.query.mediaItemCategories.findMany({ where: eq(mediaItemCategories.mediaItemId, mediaItemId) });
    if (mediaItemCategories2.length === 0) return [];
    const categoryIds = mediaItemCategories2.map((c) => c.categoryId);
    return await this.db.query.categories.findMany({ where: inArray(categories.id, categoryIds) });
  }
  // API Options
  async getApiOptions() {
    return await this.db.query.apiOptions.findMany({ orderBy: [asc(apiOptions.name)] });
  }
  async getApiOption(id) {
    return await this.db.query.apiOptions.findFirst({ where: eq(apiOptions.id, id) });
  }
  async createApiOption(insertOption) {
    const id = randomUUID();
    const newOption = {
      id,
      url: insertOption.url,
      name: insertOption.name,
      field: insertOption.field,
      type: insertOption.type ?? "json",
      status: insertOption.status ?? "available",
      method: insertOption.method ?? "POST",
      isActive: insertOption.isActive ?? true
    };
    await this.db.insert(apiOptions).values(newOption);
    return newOption;
  }
  async updateApiOption(id, updates) {
    await this.db.update(apiOptions).set(updates).where(eq(apiOptions.id, id));
    return await this.getApiOption(id);
  }
  async deleteApiOption(id) {
    await this.db.delete(apiOptions).where(eq(apiOptions.id, id));
    return true;
  }
  async initializeDatabase() {
    console.log("DrizzleStorage.initializeDatabase: start");
    try {
      const statements = [
        `CREATE TABLE IF NOT EXISTS media_items (
          id TEXT PRIMARY KEY,
          url TEXT UNIQUE NOT NULL,
          title TEXT,
          description TEXT,
          thumbnail TEXT,
          duration INTEGER,
          size INTEGER,
          type TEXT DEFAULT 'video',
          download_url TEXT,
          download_expires_at DATETIME,
          download_fetched_at DATETIME,
          error TEXT,
          scraped_at DATETIME,
          folder_video_count INTEGER DEFAULT 0,
          folder_image_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT 'primary',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS media_item_tags (
          id TEXT PRIMARY KEY,
          media_item_id TEXT,
          tag_id TEXT,
          FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS media_item_categories (
          id TEXT PRIMARY KEY,
          media_item_id TEXT,
          category_id TEXT,
          FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS api_options (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          url TEXT NOT NULL,
          method TEXT DEFAULT 'POST',
          type TEXT DEFAULT 'json',
          field TEXT DEFAULT 'url',
          status TEXT DEFAULT 'available',
          is_active BOOLEAN DEFAULT true,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];
      for (const statement of statements) {
        this.sqlite.exec(statement);
      }
      const insertStatement = this.sqlite.prepare(`
        INSERT OR IGNORE INTO api_options (id, name, url, method, type, field) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const defaultApiOptions = [
        ["playertera", "PlayerTera", "/api/playertera-proxy", "POST", "json", "url"],
        ["tera-fast", "TeraFast", "/api/tera-fast-proxy", "GET", "query", "url"],
        ["teradwn", "TeraDownloadr", "/api/teradwn-proxy", "POST", "json", "link"],
        ["iteraplay", "IteraPlay", "/api/iteraplay-proxy", "POST", "json", "link"],
        ["raspywave", "RaspyWave", "/api/raspywave-proxy", "POST", "json", "link"],
        ["rapidapi", "RapidAPI", "/api/rapidapi-proxy", "POST", "json", "link"],
        ["tera-downloader-cc", "Tera Downloader CC", "/api/tera-downloader-cc-proxy", "POST", "json", "url"]
      ];
      for (const option of defaultApiOptions) {
        insertStatement.run(...option);
      }
      console.log("DrizzleStorage.initializeDatabase: tables created");
    } catch (error) {
      console.error("DrizzleStorage.initializeDatabase: error during table creation or data insertion", error);
      throw error;
    }
    console.log("DrizzleStorage.initializeDatabase: end");
  }
  async getMedia(limit, offset) {
    console.log(`Getting ${limit} media items with offset ${offset}`);
    return [];
  }
  async addMedia(data) {
    console.log("Adding media:", data);
    return { id: Date.now(), ...data };
  }
};

// server/index.ts
console.log("server/index.ts: file loaded");
function enableCORS(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
}
var server = null;
var storage = null;
async function startServer(dbName) {
  console.log("Starting backend server...");
  try {
    storage = new DrizzleStorage(dbName);
    console.log("DrizzleStorage instance created");
    await storage.initializeDatabase();
    console.log("Database initialized");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
  const app = express2();
  app.use(enableCORS);
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path3.startsWith("/api")) {
        let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
        if (req.body && Object.keys(req.body).length > 0) {
          logLine += `
  body: ${JSON.stringify(req.body)}`;
        }
        if (capturedJsonResponse) {
          logLine += `
  response: ${JSON.stringify(capturedJsonResponse)}`;
        }
        log(logLine);
      }
    });
    next();
  });
  const httpServer = await registerRoutes(app, storage);
  server = httpServer;
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  return new Promise((resolve, reject) => {
    server.listen(port, "0.0.0.0", () => {
      log(`serving on http://0.0.0.0:${port}`);
      console.log(`Backend is listening on http://0.0.0.0:${port}`);
      console.log(`Health endpoint available at: http://0.0.0.0:${port}/health`);
      resolve({ app, server, port, storage });
    }).on("error", (error) => {
      console.error("Server failed to start:", error);
      reject(error);
    });
  });
}
async function stopServer() {
  if (storage) {
    await storage.close();
  }
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          return reject(err);
        }
        log("Server stopped");
        resolve();
      });
    } else {
      resolve();
    }
  });
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  startServer().then(({ port }) => {
    console.log(`\u2705 Server started successfully on port ${port}`);
  }).catch((error) => {
    console.error("\u274C Failed to start server:", error);
    process.exit(1);
  });
}
export {
  startServer,
  stopServer
};
