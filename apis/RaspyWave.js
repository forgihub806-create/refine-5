import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/raspywave-proxy", async (req, res) => {
    const link = req.body.link;
    if (!link) {
        return res.status(400).json({ error: "Missing 'link' in request body" });
    }

    try {
        const response = await fetch("https://raspy-wave-5e61.sonukalakhari76.workers.dev/", {
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
                "sec-fetch-site": "cross-site"
            },
            referrer: "https://downloadterabox.com/",
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
    console.log("RaspyWave proxy running at http://localhost:3000");
});
//dosent work for folders