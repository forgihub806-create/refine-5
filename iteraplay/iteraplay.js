import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const ITERAPLAY_API_KEY = "terabox_pro_api_august_2025_premium"; // from screenshot

app.post("/iteraplay-proxy", async (req, res) => {
    const link = req.body.link;
    if (!link) {
        return res.status(400).json({ error: "Missing 'link' in request body" });
    }

    try {
        const response = await fetch("https://api.iteraplay.com/", {
            method: "POST",
            headers: {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "x-api-key": ITERAPLAY_API_KEY
            },
            referrer: "https://www.teraboxdownloader.pro/",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({ link })
        });

        const text = await response.text();
        res.send(text);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("Iteraplay proxy server running on http://localhost:3000");
});
//works but returns Json 
// can also reads folders 