import type { MetadataRoute } from "next";
import { getSb } from "@/lib/supabase";

const BASE_URL = "https://aidedomicile.quebec";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sb = getSb();

  // Paginate through all org IDs in batches of 1000
  const ids: number[] = [];
  let from = 0;
  while (true) {
    const { data } = await sb
      .from("organismes")
      .select("id")
      .range(from, from + 999);

    if (!data || data.length === 0) break;
    for (const row of data) ids.push(row.id);
    if (data.length < 1000) break;
    from += 1000;
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/recherche`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/en`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/en/recherche`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const orgPages: MetadataRoute.Sitemap = ids.flatMap((id) => [
    {
      url: `${BASE_URL}/organisme/${id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/en/organisme/${id}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ]);

  return [...staticPages, ...orgPages];
}
