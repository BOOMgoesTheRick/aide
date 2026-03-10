import type { Metadata } from "next";
import { getSb } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

type Service = { nom: string; prix_heure?: number };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const sb = getSb();
  const { data: org } = await sb
    .from("organismes")
    .select("nom, ville, region")
    .eq("id", parseInt(id))
    .single();

  if (!org) return {};

  const isFr = locale === "fr";
  const title = isFr
    ? `${org.nom} — Aide à domicile à ${org.ville ?? org.region ?? "Québec"}`
    : `${org.nom} — Home Care in ${org.ville ?? org.region ?? "Quebec"}`;
  const description = isFr
    ? `Trouvez les services, tarifs et coordonnées de ${org.nom} à ${org.ville ?? org.region ?? "Québec"}.`
    : `Find services, rates and contact details for ${org.nom} in ${org.ville ?? org.region ?? "Quebec"}.`;

  return { title, description };
}

export default async function OrganismePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "organisme" });

  const sb = getSb();

  const { data: org } = await sb
    .from("organismes")
    .select("*")
    .eq("id", parseInt(id))
    .single();

  if (!org) notFound();

  const services: Service[] = org.services ?? [];

  const rechercheHref = locale === "en" ? "/en/recherche" : "/recherche";
  const numLocale = locale === "en" ? "en-CA" : "fr-CA";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: org.nom,
    ...(org.telephone ? { telephone: org.telephone } : {}),
    ...(org.email ? { email: org.email } : {}),
    ...(org.site_web ? { url: org.site_web } : {}),
    address: {
      "@type": "PostalAddress",
      ...(org.adresse ? { streetAddress: org.adresse } : {}),
      ...(org.ville ? { addressLocality: org.ville } : {}),
      ...(org.code_postal ? { postalCode: org.code_postal } : {}),
      ...(org.region ? { addressRegion: org.region } : {}),
      addressCountry: "CA",
    },
    ...(org.note_google
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: org.note_google,
            reviewCount: org.nb_avis_google,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <main style={{ background: "var(--gray-50)", minHeight: "calc(100vh - 64px)", paddingBottom: 80 }}>
      {/* Back */}
      <div style={{ background: "var(--white)", borderBottom: "1px solid var(--gray-200)", padding: "12px 0" }}>
        <div className="container">
          <a href={rechercheHref} style={{ fontSize: "0.875rem", color: "var(--gray-600)", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            {t("back")}
          </a>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>

          {/* Main */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Header card */}
            <div style={{ background: "var(--white)", borderRadius: "var(--radius)", border: "1.5px solid var(--gray-200)", padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                {org.source === "eesad"
                  ? <span className="badge-eesad">✓ ÉÉSAD</span>
                  : <span className="badge-source">Google Places</span>
                }
                {org.region && <span style={{ fontSize: "0.8rem", color: "var(--gray-400)" }}>{org.region}</span>}
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 600, color: "var(--gray-900)", lineHeight: 1.2, marginBottom: 8, letterSpacing: "-0.02em" }}>
                {org.nom}
              </h1>
              {(org.ville || org.adresse) && (
                <p style={{ fontSize: "0.9375rem", color: "var(--gray-600)" }}>
                  {org.adresse ?? org.ville}
                  {org.code_postal && `, ${org.code_postal}`}
                </p>
              )}
              {org.source === "eesad" && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--green-pale)", borderRadius: 8, border: "1px solid var(--green-50)", fontSize: "0.825rem", color: "var(--green-dark)" }}>
                  {t("eesadBox")}
                </div>
              )}
            </div>

            {/* Services */}
            {services.length > 0 && (
              <div style={{ background: "var(--white)", borderRadius: "var(--radius)", border: "1.5px solid var(--gray-200)", overflow: "hidden" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--gray-200)" }}>
                  <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--gray-900)" }}>{t("servicesOffered")}</h2>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {services.map((s, i) => (
                      <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--gray-100)" }}>
                        <td style={{ padding: "13px 24px", fontSize: "0.875rem", color: "var(--gray-800)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green-light)", flexShrink: 0, display: "inline-block" }} />
                            {s.nom}
                          </div>
                        </td>
                        <td style={{ padding: "13px 24px", textAlign: "right", fontWeight: 700, fontSize: "0.9375rem", color: "var(--green)", whiteSpace: "nowrap" }}>
                          {s.prix_heure != null ? `${s.prix_heure.toFixed(2)} $/h` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "12px 24px", background: "var(--gray-50)", fontSize: "0.75rem", color: "var(--gray-400)", borderTop: "1px solid var(--gray-100)" }}>
                  {t("rateDisclaimer")}
                </div>
              </div>
            )}

            {/* Google rating */}
            {org.note_google && (
              <div style={{ background: "var(--white)", borderRadius: "var(--radius)", border: "1.5px solid var(--gray-200)", padding: "20px 24px" }}>
                <h2 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--gray-900)", marginBottom: 14 }}>{t("googleRating")}</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "3rem", fontWeight: 600, color: "var(--gray-900)", lineHeight: 1 }}>
                    {org.note_google.toFixed(1)}
                  </div>
                  <div>
                    <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                      {[1,2,3,4,5].map((star) => (
                        <span key={star} style={{ fontSize: "1.25rem", color: star <= Math.round(org.note_google) ? "#F59E0B" : "#E5E7EB" }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--gray-600)" }}>
                      {t("basedOnReviews", { n: org.nb_avis_google?.toLocaleString(numLocale) })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Contact */}
            <div style={{ background: "var(--white)", borderRadius: "var(--radius)", border: "1.5px solid var(--gray-200)", padding: "22px 24px" }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--gray-900)", marginBottom: 16 }}>{t("contact")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {org.telephone && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={iconBox}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("phone")}</div>
                      <a href={`tel:${org.telephone}`} style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--gray-900)" }}>{org.telephone}</a>
                    </div>
                  </div>
                )}
                {org.email && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={iconBox}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("email")}</div>
                      <a href={`mailto:${org.email}`} style={{ fontSize: "0.875rem", color: "var(--green)", wordBreak: "break-all" }}>{org.email}</a>
                    </div>
                  </div>
                )}
                {org.adresse && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={iconBox}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{t("address")}</div>
                      <div style={{ fontSize: "0.875rem", color: "var(--gray-800)", lineHeight: 1.5 }}>
                        {org.adresse}
                        {org.ville && <><br />{org.ville}{org.code_postal && `, ${org.code_postal}`}</>}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {org.site_web && (
                <a href={org.site_web} target="_blank" rel="noopener" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 20, fontSize: "0.875rem", padding: "11px 16px" }}>
                  {t("visitWebsite")}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                </a>
              )}
            </div>

            {/* Source info */}
            <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius)", border: "1px solid var(--gray-200)", padding: "16px 18px", fontSize: "0.8rem", color: "var(--gray-500)" }}>
              <strong style={{ color: "var(--gray-700)" }}>{t("sourceLabel")}</strong>{" "}
              {org.source === "eesad" ? t("sourceEesad") : t("sourceGoogle")}
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

const iconBox: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  background: "var(--green-pale)", color: "var(--green)",
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};
