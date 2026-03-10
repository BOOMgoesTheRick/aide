#!/usr/bin/env node
/**
 * 04-enrich-google.js
 * Enriches organismes with Google Places data: rating, review count, photo, website.
 * Uses Text Search → Place Details. Skips rows already enriched (refreshed_at not null).
 * Safe to re-run.
 *
 * Run: npm run enrich
 */

import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const KEY = process.env.GOOGLE_API_KEY;
const DELAY_MS = 300;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Search for a place by name + city, return place_id */
async function searchPlace(nom, ville) {
  const query = `${nom} ${ville} Québec Canada`;
  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
    { params: { query, key: KEY, language: "fr", region: "ca" }, timeout: 10000 }
  );
  if (data.status !== "OK" || !data.results.length) return null;
  return data.results[0].place_id;
}

/** Fetch place details: rating, reviews, photo, website */
async function fetchDetails(placeId) {
  const fields = "rating,user_ratings_total,photos,website";
  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/place/details/json",
    { params: { place_id: placeId, fields, key: KEY, language: "fr" }, timeout: 10000 }
  );
  if (data.status !== "OK" || !data.result) return null;

  const r = data.result;
  const photoRef = r.photos?.[0]?.photo_reference ?? null;
  const photoUrl = photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${KEY}`
    : null;

  return {
    note_google:    r.rating ?? null,
    nb_avis_google: r.user_ratings_total ?? null,
    photo_url:      photoUrl,
    site_web:       r.website ?? null,
    refreshed_at:   new Date().toISOString(),
  };
}

async function main() {
  // Fetch rows not yet enriched
  const { data: rows, error } = await sb
    .from("organismes")
    .select("id, nom, ville")
    .is("refreshed_at", null)
    .order("id");

  if (error) { console.error(error); process.exit(1); }
  console.log(`${rows.length} organismes to enrich`);

  let ok = 0, notFound = 0, fail = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const placeId = await searchPlace(r.nom, r.ville);
      if (!placeId) {
        notFound++;
        console.log(`[${i + 1}/${rows.length}] — ${r.nom}: not found on Google`);
        // Mark as attempted so we don't retry every run
        await sb.from("organismes").update({ refreshed_at: new Date().toISOString() }).eq("id", r.id);
        await sleep(DELAY_MS);
        continue;
      }

      await sleep(DELAY_MS);
      const details = await fetchDetails(placeId);
      if (!details) throw new Error("No details returned");

      const { error: upErr } = await sb
        .from("organismes")
        .update(details)
        .eq("id", r.id);

      if (upErr) throw new Error(upErr.message);

      ok++;
      console.log(
        `[${i + 1}/${rows.length}] ✓ ${r.nom} — ★${details.note_google ?? "—"} (${details.nb_avis_google ?? 0} avis)${details.site_web ? " 🌐" : ""}`
      );
    } catch (err) {
      fail++;
      console.error(`[${i + 1}/${rows.length}] ✗ ${r.nom}: ${err.message}`);
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} enriched, ${notFound} not found on Google, ${fail} errors`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
