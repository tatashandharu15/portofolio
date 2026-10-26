// Konten situs dibaca dari /content/*.json — diedit lewat CMS di /keystatic.
import siteData from "../../content/site.json";
import projectsData from "../../content/projects.json";

export type Project = {
  slug: string;
  title: string;
  category: string;
  year: string;
  context: string;
  summary: string;
  cover: string;
  detail?: string;
  link?: { label: string; href: string };
  body: { heading: string; paragraphs: string[] }[];
};

const d = siteData;

export const site = {
  name: d.name,
  title: d.title,
  description: d.description,
  clock: d.clock,
  email: d.email,
  cvUrl: d.cvUrl,
  hero: {
    name: d.hero.name,
    roleLines: [d.hero.roleLines[0] ?? "", d.hero.roleLines[1] ?? ""],
    portfolioLabel: d.hero.portfolioLabel,
    scrollHint: d.hero.scrollHint,
  },
  heroSocials: d.hero.socials,
  work: d.work,
  about: {
    ...d.about,
    stats: d.about.stats.map((s, i) => ({ ...s, value: s.value ?? 0, delay: i * 0.15 })),
  },
  footer: {
    media: { type: (d.footer.mediaType === "image" ? "image" : "video") as "image" | "video", src: d.footer.mediaSrc },
    cta: d.footer.cta,
    linksA: d.footer.linksA,
    linksB: d.footer.linksB,
    creditName: d.footer.creditName,
    builtWith: d.footer.builtWith,
    copyright: d.footer.copyright,
  },
  menu: {
    brand: d.menu.brand,
    items: [
      { label: "Index", href: "/#index" },
      { label: "Work", href: "/#work" },
      { label: "About", href: "/#about" },
      { label: "Skills", href: "/#skills" },
      { label: "Contact", href: "/contact" },
      { label: "404", href: "/404" },
    ],
    socials: d.menu.socials,
  },
  notFound: d.notFound,
};

type RawProject = (typeof projectsData.items)[number] & { detail?: string | null };

export const projects: Project[] = (projectsData.items as RawProject[])
  .filter((p) => p.slug && p.title)
  .map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    year: p.year,
    context: p.context,
    summary: p.summary,
    cover: p.cover,
    detail: p.detail || undefined,
    link: p.linkHref ? { label: p.linkLabel || p.linkHref, href: p.linkHref } : undefined,
    body: p.body,
  }));
