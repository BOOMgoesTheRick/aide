#!/usr/bin/env node
/**
 * 06-cleanup-google.js
 * Removes Google Places entries that are clearly not home care organizations.
 * Strategy: keep only rows whose name or website matches home care keywords.
 * Rows that don't match ANY keyword are deleted.
 *
 * Run: npm run cleanup-google
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// If the name contains ANY of these → keep
const KEEP_KEYWORDS = [
  "aide", "soin", "soins", "domicile", "auxiliaire", "préposé", "prepose",
  "maintien", "autonomie", "bénévole", "benevole", "entraide", "soutien",
  "ménager", "menager", "ménage", "menage", "nettoyage", "nettoy",
  "assistance", "accompagnement", "répit", "repit",
  "santé", "sante", "infirmier", "infirmière", "infirmiere",
  "senior", "aîné", "aine", "personne âgée", "personne agee",
  "coopérative", "cooperative", "coop",
  "ressource", "service", "maison", "foyer",
  "action bénévole", "action benevole",
  "chez soi", "chez-soi",
  // English
  "homecare", "home care", "home health", "home service",
  "caregiver", "caregiving", "elder care", "eldercare",
  "nursing", "personal care", "domestic", "cleaning service",
  " care ", "care inc", "care ltd", "care services",
  "halo", "novaide", "dimavie", "aspire", "universeau",
];

// If the name contains ANY of these → delete (override keep)
const REJECT_KEYWORDS = [
  "restaurant", "pizzeria", "café", "cafe", "bar ", "brasserie", "taverne",
  "épicerie", "epicerie", "grocery", "iga ", "metro ", "maxi ", "provigo",
  "pharmacie", "jean coutu", "brunet", "pharmaprix",
  "quincaillerie", "hardware", "bmr ", "rona ", "home depot",
  "garage", "mécanique", "mecanique", "auto ", "automobile",
  "coiffure", "coiffeur", "salon de", "esthétique", "esthetique",
  "dentiste", "dentaire", "dental", "optique", "optométriste",
  "hotel", "motel", "auberge", "camping",
  "école", "ecole", "college", "cégep", "cegep", "université", "universite",
  "bibliothèque", "bibliotheque", "musée", "musee",
  "église", "eglise", "paroisse",
  "banque", "caisse", "desjardins", "td ", "bmo ", "bnc ",
  "assurance", "courtier", "immobilier", "immeuble",
  "gym", "fitness", "sport", "aréna", "arena",
  "transport", "taxi", "uber",
  "construction", "entrepreneur", "rénovation", "renovation",
  "plomberie", "électricien", "electricien",
  "fleuriste", "jardin", "paysag",
  "vétérinaire", "veterinaire", "animal",
  "massothérapeute", "massotherapeute", "massothérap",
  "chiropract", "ostéopath", "osteopath",
  "supermarché", "supermarche",
  "cabane", "boulangerie", "pâtisserie", "patisserie",
  "village-relais", "québec inc", "quebec inc",
  "9385", "7365",
];

function shouldKeep(nom) {
  const n = nom.toLowerCase();
  // Reject first (stricter)
  if (REJECT_KEYWORDS.some((kw) => n.includes(kw))) return false;
  // Then require at least one keep keyword
  return KEEP_KEYWORDS.some((kw) => n.includes(kw));
}

async function main() {
  // Fetch all Google-source rows
  let allRows = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from("organismes")
      .select("id, nom")
      .eq("source", "google")
      .range(from, from + PAGE - 1);
    if (error) { console.error(error); process.exit(1); }
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`${allRows.length} Google Places rows to evaluate`);

  const toDelete = allRows.filter((r) => !shouldKeep(r.nom));
  const toKeep = allRows.length - toDelete.length;

  console.log(`Keeping: ${toKeep}`);
  console.log(`Deleting: ${toDelete.length}`);

  if (toDelete.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  // Show sample of what's being deleted
  console.log("\nSample deletions:");
  toDelete.slice(0, 20).forEach((r) => console.log(`  ✗ ${r.nom}`));
  if (toDelete.length > 20) console.log(`  ... and ${toDelete.length - 20} more`);

  // Delete in batches
  const ids = toDelete.map((r) => r.id);
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const { error } = await sb.from("organismes").delete().in("id", batch);
    if (error) console.error(`Batch error: ${error.message}`);
    else deleted += batch.length;
  }

  console.log(`\nDone: ${deleted} deleted, ${toKeep} remaining Google rows`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
