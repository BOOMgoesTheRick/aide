import type { Metadata } from "next";
import "../globals.css";
import { getTranslations } from "next-intl/server";
import { routing } from "@/lib/i18n";
import { notFound } from "next/navigation";

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

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
  const template = isFr ? "%s | Aide à domicile Québec" : "%s | Home Care Quebec";

  return {
    title: { default: title, template },
    description,
    openGraph: {
      title,
      description,
      locale: isFr ? "fr_CA" : "en_CA",
      type: "website",
      siteName: title,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate the locale
  if (!routing.locales.includes(locale as "fr" | "en")) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "nav" });
  const tf = await getTranslations({ locale, namespace: "footer" });

  const rechercheHref = locale === "en" ? "/en/recherche" : "/recherche";
  const homeHref = locale === "en" ? "/en" : "/";
  const frHref = "/";
  const enHref = "/en";

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <nav className="nav">
          <div className="container">
            <div className="nav-inner">
              <a href={homeHref} className="nav-logo">
                <span className="nav-logo-dot" />
                {t("brand")}
              </a>
              <ul className="nav-links">
                <li><a href={rechercheHref + "?sort=rating"} className="nav-link nav-link-cta">{t("findProvider")}</a></li>
                <li style={{ marginLeft: 16, display: "flex", alignItems: "center", gap: 4, fontSize: "0.8rem", color: "var(--gray-400)" }}>
                  <a href={frHref} style={{ color: locale === "fr" ? "var(--green)" : "var(--gray-400)", fontWeight: locale === "fr" ? 600 : 400, textDecoration: "none" }}>FR</a>
                  <span>|</span>
                  <a href={enHref} style={{ color: locale === "en" ? "var(--green)" : "var(--gray-400)", fontWeight: locale === "en" ? 600 : 400, textDecoration: "none" }}>EN</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {children}

        <footer className="footer">
          <div className="container">
            <div className="footer-logo">{tf("brand")}</div>
            <p>{tf("desc")}</p>
            <p style={{ marginTop: 8 }}>{tf("eesadNote")}</p>
            <p className="footer-copy">{tf("copy")}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
