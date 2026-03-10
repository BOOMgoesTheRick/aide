#!/usr/bin/env node
/**
 * 01-scrape-eesad.js
 * Scrapes all ÉÉSAD member organizations from eesad.org/membres/
 *
 * Run: npm run scrape-eesad
 */

import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../data");
const OUT_FILE = path.join(OUT_DIR, "eesad.json");

const MEMBERS_URL = "https://www.eesad.org/membres/";
const DELAY_MS = 800;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Extract all eesadid values from the members listing page */
async function fetchMemberIds() {
  console.log("Fetching member list...");
  const { data: html } = await axios.get(MEMBERS_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (research bot)" },
    timeout: 15000,
  });
  const $ = cheerio.load(html);

  const ids = new Set();
  $("a[href*='eesadid=']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/eesadid=(\d+)/);
    if (match) ids.add(match[1]);
  });

  console.log(`Found ${ids.size} member IDs`);
  return [...ids];
}

/**
 * Parse a col-sm-6 div that uses the pattern:
 *   <strong><i/> Label</strong>:<br> Value<br> ...
 * Returns a map of { label -> value }
 */
function parseCoordDiv($, divEl) {
  const fields = {};
  let currentLabel = null;
  let currentLines = [];

  // Walk through child nodes (text + elements)
  divEl.childNodes.forEach((node) => {
    if (node.type === "tag" && node.name === "strong") {
      // Save previous field
      if (currentLabel !== null) {
        fields[currentLabel] = currentLines.join("\n").trim();
      }
      // Start new field: strip icon text, keep label text
      const labelText = $(node).clone().find("i").remove().end().text().trim();
      currentLabel = labelText || null;
      currentLines = [];
    } else if (node.type === "text") {
      const t = node.data.trim();
      if (t && t !== ":") currentLines.push(t);
    } else if (node.type === "tag" && node.name === "a") {
      const t = $(node).text().trim();
      if (t) currentLines.push(t);
    }
    // <br> acts as line separator — already handled by text nodes splitting
  });

  // Save last field
  if (currentLabel !== null) {
    fields[currentLabel] = currentLines.join("\n").trim();
  }

  return fields;
}

/** Fetch and parse a single ÉÉSAD detail page */
async function fetchMember(eesadId) {
  const url = `${MEMBERS_URL}?eesadid=${eesadId}`;
  const { data: html } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (research bot)" },
    timeout: 15000,
  });
  const $ = cheerio.load(html);
  const main = $("article, main, #content, .entry-content").first();

  // ── Name ──────────────────────────────────────────────────────────────────
  const nom = main.find("h1, h2, h3").first().text().trim() || null;

  // ── Parse all coord divs ──────────────────────────────────────────────────
  const allFields = {};
  main.find("div.col-sm-6, div.col-sm-12").each((_, el) => {
    const divFields = parseCoordDiv($, el);
    Object.assign(allFields, divFields);
  });

  // ── Address ───────────────────────────────────────────────────────────────
  let adresse = null, ville = null, code_postal = null;
  const adresseRaw = allFields["Adresse"] || null;
  if (adresseRaw) {
    const lines = adresseRaw.split("\n").map((l) => l.trim()).filter(Boolean);
    // Look for postal code
    const cpMatch = adresseRaw.match(/([A-Z]\d[A-Z]\s?\d[A-Z]\d)/i);
    if (cpMatch) code_postal = cpMatch[1].toUpperCase().replace(/\s/, " ");

    if (lines.length >= 2) {
      adresse = lines[0];
      // City is typically on its own line
      ville = lines.find((l) => !l.match(/[A-Z]\d[A-Z]/) && l !== lines[0]) || null;
    } else if (lines.length === 1) {
      adresse = lines[0];
    }
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  const telephone = allFields["Téléphone"] || null;

  // Email: first "Courriel" field value, or mailto link
  const emailKey = Object.keys(allFields).find((k) => k.startsWith("Courriel"));
  let email = emailKey ? allFields[emailKey].split("\n")[0].trim() : null;
  if (!email) {
    main.find("a[href^='mailto:']").first().each((_, el) => {
      email = $(el).attr("href")?.replace("mailto:", "").toLowerCase() || null;
    });
  }

  // ── Region & Territoire ───────────────────────────────────────────────────
  const region = allFields["Région"] || null;
  const territoire = allFields["Territoire"] || allFields["MRC"] || null;

  // ── Services / Tarifs ────────────────────────────────────────────────────
  // Service divs have format: "Nom du service:XX.XX $/h"
  const services = [];
  main.find("div.col-sm-6").each((_, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.includes("$/h")) {
      const match = text.match(/^(.+?):([\d.,]+)\s*\$\/h/);
      if (match) {
        services.push({
          nom: match[1].trim(),
          prix_heure: parseFloat(match[2].replace(",", ".")),
        });
      }
    }
  });

  return {
    source: "eesad",
    source_id: String(eesadId),
    nom,
    adresse,
    ville,
    code_postal,
    region,
    territoire,
    telephone,
    email,
    site_web: null,
    services: services.length ? services : null,
    scraped_at: new Date().toISOString(),
  };
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const ids = await fetchMemberIds();

  const results = [];
  let ok = 0, fail = 0;

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const member = await fetchMember(id);
      results.push(member);
      ok++;
      console.log(`[${i + 1}/${ids.length}] ✓ ${member.nom || id} — ${member.ville || "?"}`);
    } catch (err) {
      fail++;
      console.error(`[${i + 1}/${ids.length}] ✗ eesadid=${id}: ${err.message}`);
      results.push({ source: "eesad", source_id: String(id), nom: null, error: err.message });
    }
    if (i < ids.length - 1) await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nDone: ${ok} OK, ${fail} failed → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
