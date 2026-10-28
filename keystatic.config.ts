import { config, fields, singleton } from "@keystatic/core";

// Tanpa env GitHub → mode lokal (npm run dev, edit file langsung).
// Setelah GitHub App dibuat (env NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG ada) → simpan sebagai commit ke GitHub.
const useGithub =
  !!process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG || process.env.NEXT_PUBLIC_KEYSTATIC_STORAGE === "github";

const link = fields.object({
  label: fields.text({ label: "Label" }),
  href: fields.text({ label: "URL", description: "https://…, mailto:… atau /path" }),
});
const linkList = (label: string) =>
  fields.array(link, { label, itemLabel: (p) => p.fields.label.value || "Link" });

export default config({
  storage: useGithub ? { kind: "github", repo: "tatashandharu15/portofolio" } : { kind: "local" },
  ui: {
    brand: { name: "Tatas Handharu" },
    navigation: { Content: ["site", "projects", "skills"] },
  },
  singletons: {
    site: singleton({
      label: "Site & teks",
      path: "content/site",
      format: { data: "json" },
      schema: {
        name: fields.text({ label: "Nama" }),
        title: fields.text({ label: "Judul SEO" }),
        description: fields.text({ label: "Deskripsi SEO", multiline: true }),
        email: fields.text({ label: "Email" }),
        cvUrl: fields.text({ label: "Link profil/CV" }),
        clock: fields.object(
          {
            prefix: fields.text({ label: "Prefix jam" }),
            timeZone: fields.text({ label: "Zona waktu (IANA)", defaultValue: "Asia/Jakarta" }),
            hour12: fields.checkbox({ label: "Format 12 jam", defaultValue: true }),
          },
          { label: "Jam di navigasi" },
        ),
        hero: fields.object(
          {
            name: fields.text({ label: "Nama besar (enter = baris baru)", multiline: true }),
            roleLines: fields.array(fields.text({ label: "Baris" }), { label: "Peran (2 baris)", itemLabel: (p) => p.value }),
            portfolioLabel: fields.text({ label: "Label kecil" }),
            scrollHint: fields.text({ label: "Petunjuk scroll" }),
            socials: linkList("Link sosial hero"),
          },
          { label: "Hero" },
        ),
        badge: fields.object(
          {
            photo: fields.image({
              label: "Foto kartu ID (potret, akan dibuat hitam-putih)",
              directory: "public/media/badge",
              publicPath: "/media/badge/",
            }),
            name: fields.text({ label: "Nama di kartu (enter = baris baru)", multiline: true }),
            role: fields.text({ label: "Peran" }),
            idLabel: fields.text({ label: "Label ID / teks di tali" }),
            backLabel: fields.text({ label: "Teks belakang kartu" }),
            backUrl: fields.text({ label: "URL di belakang kartu" }),
          },
          { label: "Kartu ID (lanyard di hero)" },
        ),
        work: fields.object(
          {
            label: fields.text({ label: "Label" }),
            range: fields.text({ label: "Rentang" }),
            dragHint: fields.text({ label: "Petunjuk drag" }),
          },
          { label: "Section Work" },
        ),
        about: fields.object(
          {
            label: fields.text({ label: "Label" }),
            statement: fields.text({ label: "Kalimat besar", multiline: true }),
            practice: fields.text({ label: "Paragraf keahlian", multiline: true }),
            cvLabel: fields.text({ label: "Teks link profil" }),
            offDuty: fields.text({ label: "Paragraf kedua", multiline: true }),
            stats: fields.array(
              fields.object({
                label: fields.text({ label: "Label" }),
                value: fields.integer({ label: "Angka", defaultValue: 0 }),
                prefix: fields.text({ label: "Prefix (mis. +)" }),
                suffix: fields.text({ label: "Suffix (mis. +)" }),
              }),
              { label: "Statistik", itemLabel: (p) => `${p.fields.value.value ?? ""} ${p.fields.label.value}` },
            ),
          },
          { label: "Section About" },
        ),
        footer: fields.object(
          {
            mediaType: fields.select({
              label: "Jenis media di atas Get in touch",
              options: [
                { label: "Video", value: "video" },
                { label: "Gambar", value: "image" },
              ],
              defaultValue: "video",
            }),
            mediaSrc: fields.text({ label: "Path media (di /public)" }),
            cta: fields.text({ label: "Teks CTA besar" }),
            linksA: linkList("Link kolom 1"),
            linksB: linkList("Link kolom 2"),
            creditName: fields.text({ label: "Nama kredit" }),
            builtWith: fields.text({ label: "Dibuat dengan" }),
            copyright: fields.text({ label: "Copyright" }),
          },
          { label: "Footer" },
        ),
        menu: fields.object(
          {
            brand: fields.text({ label: "Nama di menu" }),
            socials: linkList("Link sosial di menu"),
          },
          { label: "Menu" },
        ),
        notFound: fields.object(
          {
            label: fields.text({ label: "Label" }),
            title: fields.text({ label: "Judul" }),
            text: fields.text({ label: "Teks", multiline: true }),
            back: fields.text({ label: "Teks tombol kembali" }),
          },
          { label: "Halaman 404" },
        ),
      },
    }),
    projects: singleton({
      label: "Projects",
      path: "content/projects",
      format: { data: "json" },
      schema: {
        items: fields.array(
          fields.object({
            title: fields.text({ label: "Judul", validation: { length: { min: 1 } } }),
            slug: fields.text({
              label: "Slug URL",
              description: "Huruf kecil & tanda hubung, mis. ai-ticketing → /work/ai-ticketing",
              validation: { length: { min: 1 } },
            }),
            category: fields.text({ label: "Kategori" }),
            year: fields.text({ label: "Tahun" }),
            context: fields.text({ label: "Konteks (perusahaan/personal)" }),
            summary: fields.text({ label: "Ringkasan", multiline: true }),
            cover: fields.image({
              label: "Cover (16:9, ±1672×941)",
              directory: "public/media/projects",
              publicPath: "/media/projects/",
              validation: { isRequired: true },
            }),
            detail: fields.image({
              label: "Gambar detail (opsional)",
              directory: "public/media/projects",
              publicPath: "/media/projects/",
            }),
            linkLabel: fields.text({ label: "Teks link (opsional)" }),
            linkHref: fields.text({ label: "URL link (opsional)" }),
            body: fields.array(
              fields.object({
                heading: fields.text({ label: "Subjudul" }),
                paragraphs: fields.array(fields.text({ label: "Paragraf", multiline: true }), {
                  label: "Paragraf",
                  itemLabel: (p) => p.value.slice(0, 60) || "Paragraf",
                }),
              }),
              { label: "Isi", itemLabel: (p) => p.fields.heading.value || "Blok" },
            ),
          }),
          { label: "Daftar project (urutan = urutan di slider)", itemLabel: (p) => p.fields.title.value || "Project" },
        ),
      },
    }),
    skills: singleton({
      label: "Skills",
      path: "content/skills",
      format: { data: "json" },
      schema: {
        intro: fields.object(
          {
            label: fields.text({ label: "Label" }),
            statement: fields.text({ label: "Kalimat besar", multiline: true }),
          },
          { label: "Intro" },
        ),
        groups: fields.array(
          fields.object({
            title: fields.text({ label: "Nama kelompok" }),
            items: fields.array(
              fields.object({
                name: fields.text({ label: "Nama" }),
                icon: fields.text({
                  label: "Ikon",
                  description:
                    "Slug dari simpleicons.org (mis. python, docker, nextdotjs) atau ikon generik: custom:sql, custom:gpt, custom:chart, custom:flow, custom:nodes, custom:code",
                }),
              }),
              { label: "Skill", itemLabel: (p) => p.fields.name.value || "Skill" },
            ),
          }),
          { label: "Kelompok", itemLabel: (p) => p.fields.title.value || "Kelompok" },
        ),
      },
    }),
  },
});
