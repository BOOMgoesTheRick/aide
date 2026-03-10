#!/usr/bin/env node
/**
 * 02-import-supabase.js
 * Imports data/eesad.json into the Supabase `organismes` table.
 * Uses upsert on (source, source_id) — safe to re-run.
 *
 * Run: npm run import
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../data/eesad.json");

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

// Filter out error entries and map to DB columns
const rows = raw
  .filter((r) => r.nom && !r.error)
  .map((r) => ({
    source:        r.source,
    source_id:     r.source_id,
    nom:           r.nom,
    adresse:       r.adresse ?? null,
    ville:         r.ville ?? null,
    code_postal:   r.code_postal ?? null,
    region:        r.region ?? null,
    territoire:    r.territoire ?? null,
    telephone:     r.telephone ?? null,
    email:         r.email ?? null,
    site_web:      r.site_web ?? null,
    services:      r.services ?? null,
  }));

console.log(`Importing ${rows.length} records...`);

// Upsert in batches of 50
const BATCH = 50;
let inserted = 0, failed = 0;

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await sb
    .from("organismes")
    .upsert(batch, { onConflict: "source,source_id" });

  if (error) {
    console.error(`Batch ${i}–${i + batch.length - 1} error:`, error.message);
    failed += batch.length;
  } else {
    inserted += batch.length;
    console.log(`[${inserted}/${rows.length}] ✓`);
  }
}

console.log(`\nDone: ${inserted} upserted, ${failed} failed`);
