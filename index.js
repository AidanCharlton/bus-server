import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "gtfs-rt-bindings";

dotenv.config();
const { FeedMessage } = pkg;

const app = express();
app.use(cors());

const STM_VEHICLE_URL = "https://api.stm.info/pub/od/gtfs-rt/ic/v2/vehiclePositions";

app.get("/api/vehicles", async (req, res) => {
  try {
    const apiKey = process.env.STM_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "STM_API_KEY missing" });
    }

    console.log("Fetching STM vehicle feed...");
    const response = await fetch(STM_VEHICLE_URL, { headers: { apikey: apiKey } });
    console.log("Response status:", response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error("STM API error:", text);
      return res.status(response.status).send(text);
    }

    const buffer = await response.arrayBuffer();
    const feed = FeedMessage.decode(new Uint8Array(buffer));

    const vehicles = feed.entity
      .filter(e => e.vehicle)
      .map(e => {
        const v = e.vehicle;
        return {
          id: e.id,
          vehicleId: v.vehicle?.id || null,
          tripId: v.trip?.trip_id || null,
          route: v.trip?.route_id || null,
          lat: v.position?.latitude ?? null,
          lon: v.position?.longitude ?? null,
          speed: v.position?.speed ?? null,
          bearing: v.position?.bearing ?? null,
          congestionLevel: v.congestionLevel ?? null,
          timestamp: v.timestamp ?? null,
          multiCarriageDetails: v.multi_carriage_details || null,
        };
      });

    console.log(`✅ Total vehicles found: ${vehicles.length}`);
    // console.log(vehicles);

    res.json({ vehicles });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => console.log("✅ Server running at http://localhost:4000"));
