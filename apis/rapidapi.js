// rapidapi.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/rapidapi", async (req, res) => {
    try {
        const { link } = req.body;

        if (!link) {
            return res.status(400).json({ error: "No link provided" });
        }

        const response = await fetch("https://terabox-downloader-direct-download-link-generator.p.rapidapi.com/fetch", {
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
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`RapidAPI proxy running on port ${PORT}`);
});
//working and gives clean and more data 
//dosent works for folders 
