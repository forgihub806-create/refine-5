

import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import cors from "cors";


const app = express();
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
  credentials: true
}));
app.use(bodyParser.json());

app.post("/tera-downloader-cc", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await fetch("https://www.tera-downloader.cc/api/terabox-download", {
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
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
//works 
//dosent work for folders