import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/playertera-proxy", async (req, res) => {
    const url = req.body.url;
    if (!url) {
        return res.status(400).json({ error: "Missing 'url' in request body" });
    }

    try {
        const response = await fetch("https://playertera.com/api/process-terabox", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-csrf-token": "w0p0LHPpNZFrLR6Rh78o8zBzzyXdeZdEMjiDSSD4" // may expire
            },
            referrer: "https://playertera.com/",
            referrerPolicy: "strict-origin-when-cross-origin",
            body: JSON.stringify({ url })
        });

        const text = await response.text();
        res.send(text);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => {
    console.log("PlayerTera proxy running at http://localhost:3000");
});
//working but might need new x-csrf-token
//works for folders also 