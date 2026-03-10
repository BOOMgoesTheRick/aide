#!/usr/bin/env node
/**
 * 05-scrape-google-places.js
 * Searches Google Places for home care organizations across Quebec cities.
 * Deduplicates by place_id, fetches full details, imports to Supabase.
 *
 * Run: npm run scrape-places
 */

import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import "dotenv/config";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const KEY = process.env.GOOGLE_API_KEY;

// ── Cities covering all 19 Quebec regions ─────────────────────────────────
const CITIES = [
  // Montréal
  "Montréal", "Laval", "Longueuil", "Brossard", "Saint-Laurent",
  // Montérégie
  "Longueuil", "Saint-Hyacinthe", "Granby", "Saint-Jean-sur-Richelieu",
  "Sorel-Tracy", "Salaberry-de-Valleyfield", "Châteauguay",
  // Laurentides
  "Saint-Jérôme", "Mirabel", "Sainte-Agathe-des-Monts", "Mont-Laurier",
  // Lanaudière
  "Joliette", "Repentigny", "Terrebonne", "Mascouche",
  // Capitale-Nationale
  "Québec", "Lévis", "Saint-Georges", "Thetford Mines",
  // Chaudière-Appalaches
  "Lévis", "Sainte-Marie", "Montmagny",
  // Estrie
  "Sherbrooke", "Magog", "Coaticook", "Lac-Mégantic",
  // Centre-du-Québec
  "Drummondville", "Victoriaville", "Nicolet", "Bécancour",
  // Mauricie
  "Trois-Rivières", "Shawinigan",
  // Outaouais
  "Gatineau",
  // Abitibi-Témiscamingue
  "Rouyn-Noranda", "Val-d'Or", "Amos", "Ville-Marie",
  // Saguenay–Lac-Saint-Jean
  "Saguenay", "Alma", "Dolbeau-Mistassini", "Roberval",
  // Bas-Saint-Laurent
  "Rimouski", "Rivière-du-Loup", "Matane", "Trois-Pistoles",
  // Gaspésie–Îles-de-la-Madeleine
  "Gaspé", "Carleton-sur-Mer", "Sainte-Anne-des-Monts",
  // Côte-Nord
  "Baie-Comeau", "Sept-Îles", "Havre-Saint-Pierre",
  // Nord-du-Québec
  "Chibougamau", "Chapais",
];

const SEARCH_TERMS = [
  "aide à domicile",
  "soins à domicile",
  "service d'aide à domicile",
  "préposé aux bénéficiaires",
  "soutien à domicile",
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Text Search — returns up to 60 place_ids (3 pages) */
async function textSearch(query) {
  const placeIds = new Set();
  let pagetoken = null;

  for (let page = 0; page < 3; page++) {
    const params = { query, key: KEY, language: "fr", region: "ca" };
    if (pagetoken) params.pagetoken = pagetoken;

    const { data } = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      { params, timeout: 10000 }
    );

    if (!["OK", "ZERO_RESULTS"].includes(data.status)) {
      console.error(`  Text Search error: ${data.status}`);
      break;
    }

    for (const r of data.results ?? []) placeIds.add(r.place_id);
    pagetoken = data.next_page_token ?? null;
    if (!pagetoken) break;

    await sleep(2000); // Google requires a delay before using next_page_token
  }

  return placeIds;
}

/** Place Details */
async function fetchDetails(placeId) {
  const fields = [
    "name", "formatted_address", "formatted_phone_number",
    "website", "rating", "user_ratings_total", "photos",
    "geometry", "address_component",
  ].join(",");

  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/place/details/json",
    { params: { place_id: placeId, fields, key: KEY, language: "fr" }, timeout: 10000 }
  );

  if (data.status !== "OK" || !data.result) return null;
  return data.result;
}

/** Extract city and postal code from address_components */
function parseAddressComponents(components = []) {
  let ville = null, code_postal = null, region = null;
  for (const c of components) {
    if (c.types.includes("locality")) ville = c.long_name;
    if (c.types.includes("postal_code")) code_postal = c.long_name;
    if (c.types.includes("administrative_area_level_2")) region = c.long_name; // county/MRC
  }
  return { ville, code_postal };
}

async function main() {
  // Load existing place_ids and eesad source_ids to avoid duplicates
  const { data: existing } = await sb
    .from("organismes")
    .select("source, source_id");
  const existingGoogleIds = new Set(
    (existing ?? []).filter((r) => r.source === "google").map((r) => r.source_id)
  );
  console.log(`${existingGoogleIds.size} Google Places already in DB`);

  // Collect all place_ids across all city × term combinations
  const allPlaceIds = new Set();
  const total = CITIES.length * SEARCH_TERMS.length;
  let searched = 0;

  for (const city of CITIES) {
    for (const term of SEARCH_TERMS) {
      const query = `${term} ${city} Québec`;
      process.stdout.write(`[${++searched}/${total}] ${query}... `);
      try {
        const ids = await textSearch(query);
        const newIds = [...ids].filter((id) => !existingGoogleIds.has(id));
        for (const id of newIds) allPlaceIds.add(id);
        console.log(`${ids.size} results, ${newIds.length} new`);
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
      }
      await sleep(300);
    }
  }

  console.log(`\nTotal unique new place_ids to fetch: ${allPlaceIds.size}`);

  // Fetch details and import
  const ids = [...allPlaceIds];
  let ok = 0, fail = 0;

  for (let i = 0; i < ids.length; i++) {
    const placeId = ids[i];
    try {
      const d = await fetchDetails(placeId);
      if (!d) throw new Error("No details");

      const { ville, code_postal } = parseAddressComponents(d.address_components);
      const photoRef = d.photos?.[0]?.photo_reference ?? null;
      const photoUrl = photoRef
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${KEY}`
        : null;

      const row = {
        source:         "google",
        source_id:      placeId,
        nom:            d.name,
        adresse:        d.formatted_address ?? null,
        ville:          ville ?? null,
        code_postal:    code_postal ?? null,
        telephone:      d.formatted_phone_number ?? null,
        site_web:       d.website ?? null,
        latitude:       d.geometry?.location?.lat ?? null,
        longitude:      d.geometry?.location?.lng ?? null,
        note_google:    d.rating ?? null,
        nb_avis_google: d.user_ratings_total ?? null,
        photo_url:      photoUrl,
        refreshed_at:   new Date().toISOString(),
      };

      const { error } = await sb
        .from("organismes")
        .upsert(row, { onConflict: "source,source_id" });

      if (error) throw new Error(error.message);

      ok++;
      console.log(`[${i + 1}/${ids.length}] ✓ ${d.name} — ${ville ?? "?"}`);
    } catch (err) {
      fail++;
      console.error(`[${i + 1}/${ids.length}] ✗ ${placeId}: ${err.message}`);
    }
    await sleep(200);
  }

  console.log(`\nDone: ${ok} imported, ${fail} failed`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
