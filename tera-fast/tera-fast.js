
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/teraboxfast", async (req, res) => {
  const { url, key } = req.query;
  if (!url || !key) return res.status(400).json({ error: "Missing url or key" });

  try {
    const response = await fetch("https://hex.teraboxfast2.workers.dev/", {
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
        url: url,
        key: key
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
//key is C7mAq
//working but the api may sometimes be down
//does not work for folders