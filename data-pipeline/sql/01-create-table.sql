-- Table: organismes
-- Aide à domicile organizations in Quebec (EÉSADs, CPEs, etc.)

CREATE TABLE IF NOT EXISTS organismes (
  id              serial PRIMARY KEY,
  source          text NOT NULL,           -- 'eesad', 'google', etc.
  source_id       text,                    -- original ID from source (e.g. eesadid)
  nom             text NOT NULL,
  adresse         text,
  ville           text,
  code_postal     text,
  region          text,
  territoire      text,                    -- MRC / territoire de desserte
  telephone       text,
  email           text,
  site_web        text,
  latitude        float,
  longitude       float,
  services        jsonb,                   -- [{ nom, prix_min, prix_max, unite }]
  note_google     float,
  nb_avis_google  int,
  photo_url       text,
  quality_score   int,
  nom_search      text GENERATED ALWAYS AS (lower(unaccent(nom))) STORED,
  ville_search    text GENERATED ALWAYS AS (lower(unaccent(ville))) STORED,
  region_search   text GENERATED ALWAYS AS (lower(unaccent(region))) STORED,
  refreshed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(source, source_id)
);

-- Enable unaccent extension (run once per project)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Indexes
CREATE INDEX IF NOT EXISTS organismes_ville_search_idx    ON organismes (ville_search);
CREATE INDEX IF NOT EXISTS organismes_region_search_idx   ON organismes (region_search);
CREATE INDEX IF NOT EXISTS organismes_nom_search_idx      ON organismes (nom_search);
CREATE INDEX IF NOT EXISTS organismes_source_idx          ON organismes (source);
CREATE INDEX IF NOT EXISTS organismes_latlon_idx          ON organismes (latitude, longitude);
