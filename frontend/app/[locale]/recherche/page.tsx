import type { Metadata } from "next";
import { getSb } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";

type Service = { nom: string; prix_heure?: number };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; region?: string; [key: string]: string | undefined }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const isFr = locale === "fr";

  let title: string;
  if (q) {
    title = isFr ? `Résultats pour «${q}»` : `Results for «${q}»`;
  } else {
    title = isFr ? "Recherche — Aide à domicile Québec" : "Search — Home Care Quebec";
  }

  const description = isFr
    ? "Filtrez et recherchez parmi plus de 900 organismes d'aide à domicile au Québec par ville, région ou type de service."
    : "Filter and search among over 900 home care organizations in Quebec by city, region or service type.";

  return { title, description };
}
type Org = {
  id: number; source: string; nom: string; ville: string | null; region: string | null;
  telephone: string | null; email: string | null; site_web: string | null;
  note_google: number | null; nb_avis_google: number | null;
  services: Service[] | null;
};

type SearchParams = Promise<{ q?: string; source?: string; region?: string; page?: string; sort?: string }>;

const PER_PAGE = 20;

export default async function RecherchePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recherche" });

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const source = sp.source ?? "";
  const region = sp.region?.trim() ?? "";
  const sort = sp.sort ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const sb = getSb();

  // Strip accents to match the unaccented _search columns
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = sb
    .from("organismes")
    .select("id, source, nom, ville, region, telephone, email, site_web, note_google, nb_avis_google, services", { count: "exact" });

  if (q) query = query.or(`nom_search.ilike.%${normalize(q)}%,ville_search.ilike.%${normalize(q)}%`);
  if (source) query = query.eq("source", source);
  if (region) query = query.ilike("region_search", `%${normalize(region)}%`);

  if (sort === "rating") {
    query = query
      .not("note_google", "is", null)
      .gte("nb_avis_google", 50)
      .order("note_google", { ascending: false })
      .order("nb_avis_google", { ascending: false, nullsFirst: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  } else {
    query = query
      .order("source", { ascending: true })
      .order("note_google", { ascending: false, nullsFirst: false })
      .order("nom")
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  }

  const { data: rows, count: resultCount } = await query;
  const totalPages = Math.ceil((resultCount ?? 0) / PER_PAGE);

  const rechercheBase = locale === "en" ? "/en/recherche" : "/recherche";
  const orgBase = locale === "en" ? "/en/organisme" : "/organisme";

  function url(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (source) p.set("source", source);
    if (region) p.set("region", region);
    if (sort) p.set("sort", sort);
    p.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    const str = p.toString();
    return `${rechercheBase}${str ? `?${str}` : ""}`;
  }

  const hasFilters = q || source || region;
  const numLocale = locale === "en" ? "en-CA" : "fr-CA";

  return (
    <main style={{ minHeight: "calc(100vh - 64px)", background: "var(--gray-50)" }}>
      {/* Search bar header */}
      <div style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-200)", padding: "20px 0" }}>
        <div className="container">
          <form method="get" action={rechercheBase} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Text search */}
            <div style={{ flex: "2 1 200px", position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
              </svg>
              <input name="q" defaultValue={q} placeholder={t("searchPlaceholder")}
                style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid var(--gray-200)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-body)", outline: "none" }} />
            </div>
            {/* Source */}
            <div style={{ flex: "1 1 140px" }}>
              <select name="source" defaultValue={source}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--gray-200)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-body)", background: "var(--white)" }}>
                <option value="">{t("sourceAll")}</option>
                <option value="eesad">{t("sourceEesad")}</option>
                <option value="google">{t("sourceGoogle")}</option>
              </select>
            </div>
            {/* Region */}
            <div style={{ flex: "1 1 150px" }}>
              <input name="region" defaultValue={region} placeholder={t("regionPlaceholder")}
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--gray-200)", borderRadius: 8, fontSize: "0.875rem", fontFamily: "var(--font-body)", outline: "none" }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: "0.875rem" }}>
              {t("searchBtn")}
            </button>
            {hasFilters && (
              <a href={rechercheBase} style={{ fontSize: "0.8rem", color: "var(--gray-400)", padding: "10px 0", textDecoration: "none" }}>
                {t("clear")}
              </a>
            )}
          </form>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 28, paddingBottom: 60 }}>
        {/* Active filters */}
        {hasFilters && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>{t("activeFilters")}</span>
            {q && <span style={chipStyle}>&quot;{q}&quot; <a href={url({ q: "" })} style={{ marginLeft: 4, color: "inherit" }}>✕</a></span>}
            {source && <span style={chipStyle}>{source === "eesad" ? "ÉÉSAD" : "Google Places"} <a href={url({ source: "" })} style={{ marginLeft: 4, color: "inherit" }}>✕</a></span>}
            {region && <span style={chipStyle}>{region} <a href={url({ region: "" })} style={{ marginLeft: 4, color: "inherit" }}>✕</a></span>}
          </div>
        )}

        {/* Count */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontSize: "0.875rem", color: "var(--gray-600)" }}>
            <strong style={{ color: "var(--gray-900)" }}>{resultCount?.toLocaleString(numLocale)}</strong>{" "}
            {(resultCount ?? 0) !== 1 ? t("organisations") : t("organisation")}
            {totalPages > 1 && (
              <span style={{ color: "var(--gray-400)" }}>
                {" "}— {t("page", { page: String(page), total: String(totalPages) })}
              </span>
            )}
          </p>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(rows as Org[])?.map((org) => (
            <a key={org.id} href={`${orgBase}/${org.id}`} className="result-card">
              {/* Left */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  {org.source === "eesad"
                    ? <span className="badge-eesad">✓ ÉÉSAD</span>
                    : <span className="badge-source">Google Places</span>
                  }
                  {org.ville && (
                    <span style={{ fontSize: "0.8rem", color: "var(--gray-400)" }}>
                      {org.ville}{org.region ? ` · ${org.region}` : ""}
                    </span>
                  )}
                </div>
                <h2 style={{ fontWeight: 600, fontSize: "1rem", color: "var(--gray-900)", lineHeight: 1.3, marginBottom: 10 }}>
                  {org.nom}
                </h2>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.8125rem", color: "var(--gray-600)", marginBottom: org.services ? 14 : 0 }}>
                  {org.telephone && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" /></svg>
                      {org.telephone}
                    </span>
                  )}
                  {org.site_web && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--green)" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253" /></svg>
                      {org.site_web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </span>
                  )}
                  {org.email && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                      {org.email}
                    </span>
                  )}
                </div>
                {/* Services */}
                {org.services && org.services.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {org.services.slice(0, 4).map((s, i) => (
                      <span key={i} style={{
                        fontSize: "0.72rem", background: "var(--green-pale)", color: "var(--green)",
                        padding: "3px 10px", borderRadius: 20, fontWeight: 500,
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        {s.nom}
                        {s.prix_heure != null && <strong>{s.prix_heure.toFixed(2)} $/h</strong>}
                      </span>
                    ))}
                    {org.services.length > 4 && (
                      <span style={{ fontSize: "0.72rem", color: "var(--gray-400)", padding: "3px 0" }}>
                        +{org.services.length - 4} {locale === "en" ? "more" : "autres"}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Right: rating */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {org.note_google ? (
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--gray-900)", lineHeight: 1 }}>
                      <span style={{ color: "#F59E0B" }}>★</span> {org.note_google.toFixed(1)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--gray-400)", marginTop: 3 }}>
                      {org.nb_avis_google} {t("reviewsShort")}
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "var(--gray-300)" }}>{t("noRating")}</span>
                )}
              </div>
            </a>
          ))}
        </div>

        {(rows as Org[])?.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--gray-400)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: "1.125rem", fontWeight: 500, color: "var(--gray-600)", marginBottom: 8 }}>{t("noResults")}</p>
            <p style={{ fontSize: "0.875rem" }}>{t("noResultsHint")} <a href={rechercheBase} style={{ color: "var(--green)" }}>{t("noResultsClear")}</a>.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
            {page > 1 && <a href={url({ page: String(page - 1) })} style={pageBtn}>{t("prev")}</a>}
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
              <a key={p} href={url({ page: String(p) })}
                style={{ ...pageBtn, background: p === page ? "var(--green)" : "var(--white)", color: p === page ? "var(--white)" : "var(--gray-600)", fontWeight: p === page ? 700 : 400, borderColor: p === page ? "var(--green)" : "var(--gray-200)" }}>
                {p}
              </a>
            ))}
            {page < totalPages && <a href={url({ page: String(page + 1) })} style={pageBtn}>{t("next")}</a>}
          </div>
        )}
      </div>
    </main>
  );
}

const chipStyle: React.CSSProperties = {
  fontSize: "0.75rem", background: "var(--green-50)", color: "var(--green)",
  padding: "4px 10px", borderRadius: 20, fontWeight: 500,
  border: "1px solid var(--green-50)",
};

const pageBtn: React.CSSProperties = {
  padding: "8px 14px", background: "var(--white)", borderRadius: 8,
  border: "1.5px solid var(--gray-200)", textDecoration: "none",
  color: "var(--gray-600)", fontSize: "0.8125rem", transition: "all 0.15s",
};
