import type { Metadata } from "next";
import Image from "next/image";
import { getSb } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";

type Service = { nom: string; prix_heure?: number };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === "fr";
  const title = isFr ? "Aide à domicile Québec" : "Home Care Quebec";
  const description = isFr
    ? "Trouvez une organisation d'aide à domicile près de chez vous au Québec. Plus de 900 organismes répertoriés."
    : "Find a home care organization near you in Quebec. Over 900 organizations listed.";
  return { title, description };
}
type Org = {
  id: number; nom: string; ville: string | null; region: string | null;
  note_google: number | null; nb_avis_google: number | null;
  telephone: string | null; site_web: string | null;
  services: Service[] | null; source: string;
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const sb = getSb();

  const [
    { count: total },
    { count: totalEesad },
    { count: withRating },
    { data: featured },
    { data: topRated },
  ] = await Promise.all([
    sb.from("organismes").select("*", { count: "exact", head: true }),
    sb.from("organismes").select("*", { count: "exact", head: true }).eq("source", "eesad"),
    sb.from("organismes").select("*", { count: "exact", head: true }).not("note_google", "is", null),
    sb.from("organismes")
      .select("id, nom, ville, region, note_google, nb_avis_google, telephone, site_web, services, source")
      .eq("source", "eesad")
      .not("note_google", "is", null)
      .gte("nb_avis_google", 25)
      .order("note_google", { ascending: false })
      .order("nb_avis_google", { ascending: false })
      .limit(6),
    sb.from("organismes")
      .select("id, nom, ville, region, note_google, nb_avis_google, telephone, site_web, services, source")
      .not("note_google", "is", null)
      .gte("nb_avis_google", 50)
      .order("note_google", { ascending: false })
      .order("nb_avis_google", { ascending: false })
      .limit(8),
  ]);

  const numLocale = locale === "en" ? "en-CA" : "fr-CA";
  const rechercheBase = locale === "en" ? "/en/recherche" : "/recherche";
  const orgBase = locale === "en" ? "/en/organisme" : "/organisme";

  const stats = [
    { value: total?.toLocaleString(numLocale), label: t("statsLabels.total") },
    { value: totalEesad?.toString(), label: t("statsLabels.eesad") },
    { value: "19", label: t("statsLabels.regions") },
    { value: withRating?.toLocaleString(numLocale), label: t("statsLabels.withRating") },
  ];

  const steps = [
    { step: "01", title: t("steps.0.title"), desc: t("steps.0.desc") },
    { step: "02", title: t("steps.1.title"), desc: t("steps.1.desc") },
    { step: "03", title: t("steps.2.title"), desc: t("steps.2.desc") },
  ];

  return (
    <main>
      {/* Hero */}
      <section style={{
        background: "linear-gradient(160deg, var(--green-pale) 0%, #fff 60%)",
        padding: "40px 0 64px",
        borderBottom: "1px solid var(--gray-200)",
      }}>
        <div className="container">
          <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
          <div style={{ flex: "0 0 580px" }}>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 600,
              lineHeight: 1.15,
              color: "var(--gray-900)",
              marginBottom: 20,
              letterSpacing: "-0.02em",
            }}>
              {t("heroTitle")}{" "}
              <em style={{ color: "var(--green)", fontStyle: "italic" }}>{t("heroTitleEm")}</em>
            </h1>
            <p style={{ fontSize: "1.125rem", color: "var(--gray-600)", marginBottom: 36, lineHeight: 1.7, maxWidth: 560 }}>
              {t("heroDesc")}
            </p>

            {/* Search form */}
            <form action={rechercheBase} method="get">
              <div style={{ display: "flex", gap: 10, maxWidth: 580 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.5 6.5a7.5 7.5 0 0 0 10.15 10.15z" />
                  </svg>
                  <input
                    name="q"
                    placeholder={t("searchPlaceholder")}
                    style={{
                      width: "100%",
                      padding: "14px 16px 14px 42px",
                      fontSize: "0.9375rem",
                      border: "1.5px solid var(--gray-200)",
                      borderRadius: 10,
                      outline: "none",
                      background: "var(--white)",
                      boxShadow: "var(--shadow-sm)",
                      fontFamily: "var(--font-body)",
                    }}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  {t("searchBtn")}
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {["Montréal", "Québec", "Laval", "Sherbrooke", "Gatineau"].map((v) => (
                  <a key={v} href={`${rechercheBase}?q=${v}`} style={{
                    fontSize: "0.8rem", color: "var(--green)", background: "var(--green-pale)",
                    padding: "4px 12px", borderRadius: 20, border: "1px solid var(--green-50)",
                    transition: "background 0.15s",
                  }}>
                    {v}
                  </a>
                ))}
              </div>
            </form>
          </div>

          {/* Nurse photo */}
          <div style={{ flexShrink: 0, alignSelf: "flex-end", marginBottom: -64 }}>
            <Image
              src="/nurse.png"
              alt="Aide-soignante en uniforme vert"
              width={320}
              height={420}
              style={{ objectFit: "contain", objectPosition: "bottom", display: "block" }}
              priority
            />
          </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderBottom: "1px solid var(--gray-200)", background: "var(--white)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", padding: "32px 0" }}>
            {stats.map(({ value, label }, i) => (
              <div key={i} style={{
                padding: "16px 24px",
                borderLeft: i > 0 ? "1px solid var(--gray-200)" : "none",
              }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 600, color: "var(--green)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured ÉÉSAD */}
      <section style={{ padding: "72px 0", background: "var(--white)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 600, color: "var(--gray-900)", letterSpacing: "-0.02em" }}>
                {t("featuredTitle")}
              </h2>
              <p style={{ color: "var(--gray-600)", marginTop: 6, fontSize: "0.9375rem" }}>
                {t("featuredDesc")}
              </p>
            </div>
            <a href={rechercheBase} className="btn btn-outline" style={{ flexShrink: 0 }}>
              {t("viewAll")}
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {(featured as Org[])?.map((org) => (
              <a key={org.id} href={`${orgBase}/${org.id}`} className="org-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span className="badge-eesad">✓ ÉÉSAD</span>
                  {org.note_google && (
                    <span className="rating">
                      <span className="rating-star">★</span>
                      {org.note_google.toFixed(1)}
                      <span className="rating-count">({org.nb_avis_google})</span>
                    </span>
                  )}
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--gray-900)", lineHeight: 1.35, marginBottom: 6 }}>
                  {org.nom}
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--gray-600)", marginBottom: 14 }}>
                  {org.ville}{org.region && ` · ${org.region}`}
                </p>
                {org.services && org.services.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {org.services.slice(0, 3).map((s, i) => (
                      <span key={i} style={{
                        fontSize: "0.72rem", background: "var(--green-pale)", color: "var(--green)",
                        padding: "3px 9px", borderRadius: 20, fontWeight: 500,
                      }}>
                        {s.nom}
                      </span>
                    ))}
                    {org.services.length > 3 && (
                      <span style={{ fontSize: "0.72rem", color: "var(--gray-400)", padding: "3px 0" }}>
                        +{org.services.length - 3} {locale === "en" ? "more" : "autres"}
                      </span>
                    )}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Top rated */}
      <section style={{ padding: "72px 0", background: "var(--gray-50)", borderTop: "1px solid var(--gray-200)" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 600, color: "var(--gray-900)", letterSpacing: "-0.02em" }}>
                {t("topRatedTitle")}
              </h2>
              <p style={{ color: "var(--gray-600)", marginTop: 6, fontSize: "0.9375rem" }}>
                {t("topRatedDesc")}
              </p>
            </div>
            <a href={`${rechercheBase}?sort=rating`} className="btn btn-outline" style={{ flexShrink: 0 }}>
              {t("viewAllRated")}
            </a>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {(topRated as Org[])?.map((org, rank) => (
              <a key={org.id} href={`${orgBase}/${org.id}`} className="org-card" style={{ position: "relative" }}>
                {/* Rank */}
                <div style={{
                  position: "absolute", top: 16, right: 16,
                  fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 600,
                  color: rank === 0 ? "#F59E0B" : rank === 1 ? "#94A3B8" : rank === 2 ? "#CD7F32" : "var(--gray-200)",
                  lineHeight: 1,
                }}>
                  #{rank + 1}
                </div>
                {/* Rating */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--gray-900)", lineHeight: 1 }}>
                    {org.note_google!.toFixed(1)}
                  </span>
                  <div>
                    <div style={{ display: "flex", gap: 1 }}>
                      {[1,2,3,4,5].map((s) => (
                        <span key={s} style={{ fontSize: "0.75rem", color: s <= Math.round(org.note_google!) ? "#F59E0B" : "#E5E7EB" }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--gray-400)" }}>{org.nb_avis_google} {t("reviewsShort")}</div>
                  </div>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--gray-900)", lineHeight: 1.35, marginBottom: 4, paddingRight: 32 }}>
                  {org.nom}
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginBottom: org.source === "eesad" ? 10 : 0 }}>
                  {org.ville}{org.region ? ` · ${org.region}` : ""}
                </p>
                {org.source === "eesad" && (
                  <span className="badge-eesad" style={{ marginTop: 8, display: "inline-flex" }}>✓ ÉÉSAD</span>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--green-pale)", padding: "72px 0", borderTop: "1px solid var(--green-50)" }}>
        <div className="container">
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 600, color: "var(--gray-900)", marginBottom: 48, textAlign: "center", letterSpacing: "-0.02em" }}>
            {t("howItWorksTitle")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
            {steps.map(({ step, title, desc }) => (
              <div key={step} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "var(--green)", color: "var(--white)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.9rem",
                }}>
                  {step}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--gray-900)" }}>{title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--gray-600)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "72px 0", background: "var(--white)", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: 560 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 16, color: "var(--gray-900)" }}>
            {t("ctaTitle")}
          </h2>
          <p style={{ color: "var(--gray-600)", marginBottom: 28, fontSize: "1rem" }}>
            {t("ctaDesc", { total: total?.toLocaleString(numLocale) ?? "" })}
          </p>
          <a href={rechercheBase} className="btn btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
            {t("ctaBtn")}
          </a>
        </div>
      </section>
    </main>
  );
}
