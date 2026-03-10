import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return locale === "fr"
    ? { title: "Qu'est-ce que l'aide à domicile ?", description: "Découvrez ce qu'est l'aide à domicile au Québec : les services offerts, les personnes concernées, la différence entre les ÉÉSAD et les agences privées." }
    : { title: "What is home care?", description: "Learn what home care is in Quebec: the services offered, who it's for, and the difference between ÉÉSAD and private agencies." };
}

export default async function AideADomicilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isFr = locale === "fr";
  const rechercheHref = isFr ? "/recherche?sort=rating" : "/en/recherche?sort=rating";

  const services = isFr
    ? [
        { icon: "🧹", title: "Entretien ménager", desc: "Nettoyage de la maison, lavage, repassage et tâches ménagères courantes." },
        { icon: "🍽️", title: "Préparation des repas", desc: "Aide à la planification et à la préparation de repas nutritifs à domicile." },
        { icon: "🛁", title: "Aide à l'hygiène personnelle", desc: "Assistance pour la toilette, l'habillage et les soins personnels quotidiens." },
        { icon: "🛒", title: "Courses et commissions", desc: "Accompagnement ou réalisation des courses alimentaires et des déplacements." },
        { icon: "👥", title: "Accompagnement et présence", desc: "Visites de compagnie, sorties et soutien à la vie sociale pour briser l'isolement." },
        { icon: "📋", title: "Soutien administratif", desc: "Aide pour la correspondance, les formulaires et les démarches administratives simples." },
      ]
    : [
        { icon: "🧹", title: "Housekeeping", desc: "Cleaning, laundry, ironing and everyday household tasks." },
        { icon: "🍽️", title: "Meal preparation", desc: "Help planning and preparing nutritious meals at home." },
        { icon: "🛁", title: "Personal hygiene assistance", desc: "Support with bathing, dressing and daily personal care." },
        { icon: "🛒", title: "Errands and shopping", desc: "Accompaniment or completion of grocery shopping and outings." },
        { icon: "👥", title: "Companionship", desc: "Friendly visits, outings and social support to reduce isolation." },
        { icon: "📋", title: "Administrative support", desc: "Help with correspondence, forms and simple administrative tasks." },
      ];

  return (
    <main style={{ background: "var(--gray-50)", minHeight: "calc(100vh - 64px)" }}>

      {/* Hero */}
      <section style={{ background: "linear-gradient(160deg, var(--green-pale) 0%, #fff 60%)", padding: "64px 0", borderBottom: "1px solid var(--gray-200)" }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--green-pale)", border: "1px solid var(--green-50)", borderRadius: 20, padding: "4px 14px", fontSize: "0.8rem", fontWeight: 600, color: "var(--green)", marginBottom: 24 }}>
            {isFr ? "Guide" : "Guide"}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 600, lineHeight: 1.15, color: "var(--gray-900)", letterSpacing: "-0.02em", marginBottom: 20 }}>
            {isFr ? "Qu'est-ce que l'aide à domicile ?" : "What is home care?"}
          </h1>
          <p style={{ fontSize: "1.125rem", color: "var(--gray-600)", lineHeight: 1.75, maxWidth: 640 }}>
            {isFr
              ? "L'aide à domicile désigne un ensemble de services offerts à des personnes qui ont besoin d'un soutien pour accomplir les tâches de la vie quotidienne — sans quitter leur domicile. Elle s'adresse principalement aux personnes âgées, aux personnes en situation de handicap ou en convalescence."
              : "Home care refers to a range of services provided to people who need support to carry out daily tasks — without leaving their home. It is mainly aimed at the elderly, people with disabilities, or those recovering from illness."}
          </p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: 760, paddingTop: 56, paddingBottom: 80 }}>

        {/* Who is it for */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--gray-900)", marginBottom: 16, letterSpacing: "-0.01em" }}>
            {isFr ? "À qui s'adresse-t-elle ?" : "Who is it for?"}
          </h2>
          <p style={{ color: "var(--gray-600)", lineHeight: 1.75, marginBottom: 16 }}>
            {isFr
              ? "L'aide à domicile s'adresse à toute personne qui souhaite maintenir son autonomie chez elle, mais qui a besoin d'un coup de main pour certaines tâches :"
              : "Home care is for anyone who wishes to maintain their independence at home but needs a helping hand with certain tasks:"}
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {(isFr
              ? ["Personnes âgées souhaitant rester à leur domicile le plus longtemps possible", "Personnes en convalescence après une hospitalisation ou une chirurgie", "Personnes en situation de handicap physique ou cognitif", "Proches aidants qui ont besoin de répit"]
              : ["Seniors who want to stay at home as long as possible", "People recovering from hospitalization or surgery", "People with physical or cognitive disabilities", "Family caregivers who need a break"]
            ).map((item, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: "0.9375rem", color: "var(--gray-700)", lineHeight: 1.6 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--green)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", flexShrink: 0, marginTop: 2 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Services */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--gray-900)", marginBottom: 8, letterSpacing: "-0.01em" }}>
            {isFr ? "Les services offerts" : "Services offered"}
          </h2>
          <p style={{ color: "var(--gray-600)", lineHeight: 1.75, marginBottom: 28 }}>
            {isFr
              ? "L'aide à domicile couvre un large éventail de tâches non médicales pour faciliter la vie quotidienne :"
              : "Home care covers a wide range of non-medical tasks to make daily life easier:"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {services.map(({ icon, title, desc }, i) => (
              <div key={i} style={{ background: "var(--white)", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "20px 22px" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>{icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--gray-900)", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--gray-600)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: "0.875rem", color: "var(--gray-400)", fontStyle: "italic" }}>
            {isFr
              ? "Important : l'aide à domicile ne comprend pas les soins infirmiers, les soins médicaux ou paramédicaux. Ces services sont fournis par des professionnels de la santé."
              : "Important: home care does not include nursing, medical or paramedical care. These services are provided by healthcare professionals."}
          </p>
        </section>

        {/* ÉÉSAD vs private */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--gray-900)", marginBottom: 16, letterSpacing: "-0.01em" }}>
            {isFr ? "ÉÉSAD ou agence privée ?" : "ÉÉSAD or private agency?"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* ÉÉSAD */}
            <div style={{ background: "var(--green-pale)", border: "1.5px solid var(--green-50)", borderRadius: "var(--radius)", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span className="badge-eesad">✓ ÉÉSAD</span>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(isFr
                  ? ["Organisme accrédité par le Réseau de coopération des ÉÉSAD", "Tarifs souvent réglementés et abordables", "Personnel formé et encadré", "Présence dans toutes les régions du Québec", "Peut être admissible à des subventions gouvernementales"]
                  : ["Accredited by the ÉÉSAD cooperative network", "Often regulated and affordable rates", "Trained and supervised staff", "Present in all regions of Quebec", "May be eligible for government subsidies"]
                ).map((item, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "var(--green-dark)", display: "flex", gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--green)", flexShrink: 0 }}>✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Private */}
            <div style={{ background: "var(--white)", border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius)", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span className="badge-source">{isFr ? "Agence privée" : "Private agency"}</span>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(isFr
                  ? ["Offre souvent plus flexible et personnalisée", "Disponibilité parfois plus rapide", "Tarifs variables selon les services", "Grande diversité d'organismes", "Vérifier les avis et références avant de choisir"]
                  : ["Often more flexible and personalized offering", "Availability sometimes faster", "Variable rates depending on services", "Wide variety of organizations", "Check reviews and references before choosing"]
                ).map((item, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "var(--gray-700)", display: "flex", gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--gray-400)", flexShrink: 0 }}>•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: "var(--green-pale)", border: "1.5px solid var(--green-50)", borderRadius: "var(--radius)", padding: "36px 40px", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 600, color: "var(--gray-900)", marginBottom: 12, letterSpacing: "-0.01em" }}>
            {isFr ? "Trouvez un organisme près de chez vous" : "Find an organization near you"}
          </h2>
          <p style={{ color: "var(--gray-600)", marginBottom: 24, fontSize: "0.9375rem" }}>
            {isFr
              ? "Notre répertoire recense plus de 600 organismes d'aide à domicile partout au Québec."
              : "Our directory lists over 600 home care organizations across Quebec."}
          </p>
          <a href={rechercheHref} className="btn btn-primary" style={{ fontSize: "0.9375rem", padding: "12px 28px" }}>
            {isFr ? "Rechercher un organisme →" : "Search for an organization →"}
          </a>
        </section>

      </div>
    </main>
  );
}
