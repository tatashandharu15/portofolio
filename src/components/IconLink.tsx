import { ArrowUpRight } from "./Icons";

export function IconLink({ label, href }: { label: string; href: string }) {
  const external = /^https?:/.test(href);
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="icon-link t-mono l-muted">
      <span>{label}</span>
      <ArrowUpRight color="var(--muted)" />
    </a>
  );
}
