// Skill dibaca dari /content/skills.json (diedit lewat CMS). Ikon: slug simple-icons (CC0) atau "custom:*".
// Hanya dipakai di server — path ikon dikirim ke komponen sebagai props.
import * as simpleIcons from "simple-icons";
import skillsData from "../../content/skills.json";

export type Skill = { name: string; path: string };
export type SkillGroup = { id: string; title: string; items: Skill[] };

const CUSTOM: Record<string, string> = {
  sql: "M12 2C7 2 4 3.6 4 5.5v13C4 20.4 7 22 12 22s8-1.6 8-3.5v-13C20 3.6 17 2 12 2zm0 2c3.9 0 6 1.1 6 1.5S15.9 7 12 7 6 5.9 6 5.5 8.1 4 12 4zM6 8.3C7.5 9 9.6 9.3 12 9.3s4.5-.3 6-1V12c0 .4-2.1 1.5-6 1.5S6 12.4 6 12V8.3zm0 6.5c1.5.7 3.6 1 6 1s4.5-.3 6-1v3.7c0 .4-2.1 1.5-6 1.5s-6-1.1-6-1.5v-3.7z",
  gpt: "M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3 6v2h2V9H7zm4 0v2h2V9h-2zm4 0v2h2V9h-2z",
  chart: "M3 21h18v-2H3v2zM5 17h3V9H5v8zm5.5 0h3V4h-3v13zm5.5 0h3v-6h-3v6z",
  flow: "M3 4h6v6H3V4zm12 0h6v6h-6V4zM9 6h6v2H9V6zm8 4h2v4h-2v-4zm-2 4h6v6h-6v-6zM3 14h6v6H3v-6zm6 2h6v2H9v-2z",
  nodes: "M6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm12 0a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM7.5 8.6l3.6 6.3-1.7 1-3.6-6.3 1.7-1zm9 0l1.7 1-3.6 6.3-1.7-1 3.6-6.3z",
  code: "M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z",
  dot: "M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
};

const bySlug = new Map<string, string>();
for (const v of Object.values(simpleIcons) as unknown[]) {
  const icon = v as { slug?: string; path?: string };
  if (icon && typeof icon.slug === "string" && typeof icon.path === "string") bySlug.set(icon.slug, icon.path);
}

function iconPath(key: string) {
  const k = (key || "").trim().toLowerCase();
  if (k.startsWith("custom:")) return CUSTOM[k.slice(7)] ?? CUSTOM.dot;
  return bySlug.get(k) ?? CUSTOM.dot;
}

export const skillsIntro = skillsData.intro;

export const skillGroups: SkillGroup[] = skillsData.groups.map((g, gi) => ({
  id: String(gi + 1).padStart(2, "0"),
  title: g.title,
  items: g.items.filter((s) => s.name).map((s) => ({ name: s.name, path: iconPath(s.icon) })),
}));
