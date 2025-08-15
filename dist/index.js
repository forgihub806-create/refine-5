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

// server/scraper.ts
import { chromium } from "playwright";

// server/terabox-api.ts
import fetch from "node-fetch";
async function fetchTeraboxFileInfo({ shortUrl, appId, page = 1, shareid, uk, debug = false }) {
  let res, data;
  if (shareid && uk) {
    let listUrl = `https://dm.terabox.app/share/list?app_id=${appId}&web=1&channel=dubox&clienttype=0&shareid=${shareid}&uk=${uk}&page=${page}`;
    if (debug) console.log(`[TeraboxAPI] listUrl (shareid/uk): ${listUrl}`);
    res = await fetch(listUrl, { headers: { "accept": "application/json" } });
    if (res.ok) {
      const raw = await res.text();
      if (debug) console.log(`[TeraboxAPI] Raw response (shareid/uk):`, raw);
      data = JSON.parse(raw);
      if (data && data.list && data.list.length > 0) {
        return { source: "list", data, debug: { url: listUrl, raw } };
      }
    }
  }
  if (shortUrl) {
    let listUrl = `https://dm.terabox.app/share/list?app_id=${appId}&web=1&channel=dubox&clienttype=0&shorturl=${shortUrl}&page=${page}`;
    if (debug) console.log(`[TeraboxAPI] listUrl (shortUrl): ${listUrl}`);
    res = await fetch(listUrl, { headers: { "accept": "application/json" } });
    if (res.ok) {
      const raw = await res.text();
      if (debug) console.log(`[TeraboxAPI] Raw response (shortUrl):`, raw);
      data = JSON.parse(raw);
      if (data && data.list && data.list.length > 0) {
        return { source: "list", data, debug: { url: listUrl, raw } };
      }
    }
    let infoUrl = `https://dm.terabox.app/api/shorturlinfo?app_id=${appId}&web=1&channel=dubox&clienttype=0&shorturl=${shortUrl}`;
    if (debug) console.log(`[TeraboxAPI] infoUrl (shortUrl): ${infoUrl}`);
    res = await fetch(infoUrl, { headers: { "accept": "application/json" } });
    if (res.ok) {
      const raw = await res.text();
      if (debug) console.log(`[TeraboxAPI] Raw response (shorturlinfo):`, raw);
      data = JSON.parse(raw);
      if (data && data.list && data.list.length > 0) {
        return { source: "shorturlinfo", data, debug: { url: infoUrl, raw } };
      }
    }
  }
  throw new Error("No valid Terabox file info found");
}

// server/scraper.ts
function normalizeUrl(url) {
  try {
    const urlObject = new URL(url);
    const path3 = urlObject.pathname;
    const match = path3.match(/\/s\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://1024terabox.com/s/${match[1]}`;
    }
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error);
  }
  return url;
}
async function scrapeSingle(url, browser) {
  const normalized = normalizeUrl(url);
  console.log(`[Scraper] Starting to scrape single URL: ${normalized}`);
  const appId = "250528";
  const match = normalized.match(/\/s\/([a-zA-Z0-9_-]+)/);
  const shortUrl = match ? match[1] : "";
  let shareid = void 0;
  let uk = void 0;
  try {
    const page = await browser.newPage();
    await page.goto(normalized, { waitUntil: "domcontentloaded", timeout: 6e4 });
    const shareInfo = await page.evaluate(() => {
      let shareid2 = void 0;
      let uk2 = void 0;
      if (window.shareid) shareid2 = window.shareid;
      if (window.uk) uk2 = window.uk;
      const html = document.documentElement.innerHTML;
      let shareidMatch = html.match(/shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
      let ukMatch = html.match(/uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
      if (shareidMatch && shareidMatch[1]) shareid2 = shareidMatch[1];
      if (ukMatch && ukMatch[1]) uk2 = ukMatch[1];
      if (!shareid2 || !uk2) {
        const scripts = Array.from(document.querySelectorAll("script"));
        for (const script of scripts) {
          const text2 = script.textContent || "";
          try {
            if (text2.includes("shareid") || text2.includes("uk")) {
              let sMatch = text2.match(/shareid["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
              let uMatch = text2.match(/uk["']?\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/);
              if (sMatch && sMatch[1] && !shareid2) shareid2 = sMatch[1];
              if (uMatch && uMatch[1] && !uk2) uk2 = uMatch[1];
              if ((!shareid2 || !uk2) && text2.trim().startsWith("{")) {
                try {
                  const obj = JSON.parse(text2);
                  if (obj.shareid && !shareid2) shareid2 = obj.shareid;
                  if (obj.uk && !uk2) uk2 = obj.uk;
                } catch {
                }
              }
            }
          } catch {
          }
        }
      }
      if (!shareid2 || !uk2) {
        return { shareid: shareid2, uk: uk2, htmlDebug: html.slice(0, 5e3) };
      }
      return { shareid: shareid2, uk: uk2 };
    });
    shareid = shareInfo.shareid;
    uk = shareInfo.uk;
    if (!shareid || !uk) {
      console.warn("[Scraper] Could not extract shareid or uk. HTML debug:", shareInfo.htmlDebug);
    }
    console.log(`[Scraper] Extracted shareid: ${shareid}, uk: ${uk}`);
    await page.close();
    const { data, debug } = await fetchTeraboxFileInfo({ shortUrl, appId, shareid, uk, debug: true });
    const file = data.list && data.list[0];
    if (!file) throw new Error("No file info found in Terabox API response");
    return {
      url: normalized,
      title: file.server_filename,
      size: file.size,
      category: file.category,
      isdir: file.isdir,
      server_filename: file.server_filename,
      dlink: file.dlink,
      thumbs: file.thumbs,
      description: void 0,
      thumbnail: file.thumbs?.url1 || file.thumbs?.icon
    };
  } catch (error) {
    console.error(`[Scraper] Error scraping ${normalized}:`, error);
    return { url: normalized, title: "", error: error.message };
  }
}
async function scrapeWithPlaywright(urls) {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const concurrency = 5;
  const batches = [];
  for (let i = 0; i < urls.length; i += concurrency) {
    batches.push(urls.slice(i, i + concurrency));
  }
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map((url) => scrapeSingle(url, browser)));
    results.push(...batchResults);
  }
  await browser.close();
  return results;
}

// server/routes.ts
var PORT = process.env.PORT || 5e3;
var BASE_URL = `http://localhost:${PORT}`;
async function scrapeMetadata(mediaItemId, storage2) {
  const mediaItem = await storage2.getMediaItem(mediaItemId);
  if (!mediaItem) return;
  console.log(`Scraping metadata for: ${mediaItem.url}`);
  const results = await scrapeWithPlaywright([mediaItem.url]);
  const result = results[0];
  if (result) {
    console.log("Scrape result:", result);
    if (result.title) {
      const updates = {
        title: result.title,
        description: result.description || mediaItem.description,
        thumbnail: result.thumbnail || mediaItem.thumbnail,
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
  constructor(dbName = "cipherbox.db") {
    this.dbPath = dbName;
    this.sqlite = new Database(dbName, { verbose: console.log });
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
