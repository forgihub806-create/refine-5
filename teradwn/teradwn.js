

import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import cors from "cors";



const app = express();
app.use(cors({
  origin: "http://127.0.0.1:5500",
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.post("/teradownloadr", async (req, res) => {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: "Link is required" });
  }

  try {
    const params = new URLSearchParams();
    params.append("action", "terabox_fetch");
    params.append("url", link);
    params.append("nonce", "ada26da710");

    const response = await fetch("https://teradownloadr.com/wp-admin/admin-ajax.php", {
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

    const data = await response.text(); // WordPress AJAX sometimes returns HTML or JSON
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

//dosent work for folders