#!/usr/bin/env node
/**
 * 03-geocode.js
 * Geocodes organismes that have no lat/lng yet using Google Maps Geocoding API.
 * Updates Supabase in place. Safe to re-run (skips already geocoded rows).
 *
 * Run: npm run geocode
 */

import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const DELAY_MS = 200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Call Google Maps Geocoding API */
async function geocode(adresse, ville, code_postal) {
  const parts = [adresse, ville, code_postal, "Québec", "Canada"]
    .filter(Boolean)
    .join(", ");

  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    { params: { address: parts, key: GOOGLE_KEY }, timeout: 10000 }
  );

  if (data.status !== "OK" || !data.results.length) return null;

  const loc = data.results[0].geometry.location;
  return { latitude: loc.lat, longitude: loc.lng };
}

async function main() {
  // Fetch all rows missing lat/lng
  const { data: rows, error } = await sb
    .from("organismes")
    .select("id, nom, adresse, ville, code_postal")
    .is("latitude", null)
    .order("id");

  if (error) { console.error(error); process.exit(1); }
  console.log(`${rows.length} organismes to geocode`);

  let ok = 0, fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const coords = await geocode(r.adresse, r.ville, r.code_postal);
      if (!coords) throw new Error("No result from API");

      const { error: upErr } = await sb
        .from("organismes")
        .update(coords)
        .eq("id", r.id);

      if (upErr) throw new Error(upErr.message);

      ok++;
      console.log(`[${i + 1}/${rows.length}] ✓ ${r.nom} → ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
    } catch (err) {
      fail++;
      console.error(`[${i + 1}/${rows.length}] ✗ ${r.nom}: ${err.message}`);
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} geocoded, ${fail} failed`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
