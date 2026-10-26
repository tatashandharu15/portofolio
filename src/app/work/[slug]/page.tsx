import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects, site } from "@/content/site";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = projects.find((x) => x.slug === slug);
  if (!p) return {};
  return { title: `${p.title} — ${site.name}`, description: p.summary };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = projects.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const p = projects[i];
  const next = projects[i + 1];
  return (
    <>
      <section className="project-header px">
        <div className="grid12 project-top">
          <p className="t-mono project-top__back"><Link href="/#work" className="l-ink">All work</Link></p>
          <p className="t-mono c-muted project-top__cat">{p.category}</p>
          <p className="t-mono c-muted project-top__year">{p.year}</p>
        </div>
        <h1 className="t-h1">{p.title}</h1>
        <div className="grid12 project-info">
          <div className="project-info__role">
            <p className="t-mono c-muted">Context</p>
            <p className="t-mono c-ink">{p.context}</p>
          </div>
          <p className="t-role project-info__summary">{p.summary}</p>
        </div>
      </section>
      <div className="project-cover px">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.cover} alt="" width={1672} height={941} />
      </div>
      <section className="grid12 project-body px">
        {p.detail ? (
          <div className="project-body__detail">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.detail} alt="" />
          </div>
        ) : (
          <div className="project-body__detail project-body__detail--empty" />
        )}
        <div className="project-body__content">
          {p.body.map((b) => (
            <div key={b.heading} className="project-body__block">
              <h2 className="t-h2">{b.heading}</h2>
              {b.paragraphs.map((t, k) => <p key={k} className="t-body">{t}</p>)}
            </div>
          ))}
          {p.link ? (
            <p className="t-body project-body__link">
              <a href={p.link.href} target="_blank" rel="noopener noreferrer" className="l-underline">{p.link.label}</a>
            </p>
          ) : null}
        </div>
      </section>
      {next ? (
        <div className="project-next px">
          <p className="t-mono c-muted">Next project</p>
          <h2 className="t-next"><Link href={`/work/${next.slug}`} className="l-ink">{next.title}</Link></h2>
        </div>
      ) : null}
    </>
  );
}
