import { site, projects } from "@/content/site";
import { GridLines } from "@/components/GridLines";
import { Ferrofluid } from "@/components/Ferrofluid";
import { LensText } from "@/components/LensText";
import { IconLink } from "@/components/IconLink";
import { ProjectSlider } from "@/components/ProjectSlider";
import { IndentText } from "@/components/IndentText";
import { GlitchCounter } from "@/components/GlitchCounter";
import { ArrowElbowDownRight } from "@/components/Icons";

export default function Home() {
  const { hero, work, about } = site;
  return (
    <>
      {/* ── Hero ── */}
      <section id="index" className="hero">
        <GridLines />
        <div className="hero-intro">
          <div className="grid12 hero-row">
            <div className="hero-art">
              <div className="hero-art__fluid">
                <Ferrofluid
                  color="rgb(212, 208, 203)"
                  particles={1000}
                  particleSize={6}
                  mobileParticles={400}
                  keepVolume
                  cohesion={1.1}
                  magnetism={2}
                  viscosity={8}
                  activity={2}
                  speed={1.55}
                  heartbeat
                  heartRate={60}
                  pulseStrength={0.45}
                  gloss={0}
                  shadow={0}
                  trails
                  trailDrag={0.6}
                  trailLife={3}
                  size={1.05}
                  placement="Center"
                  interactive
                  strength={58}
                  radius={120}
                  seed={20}
                  mobile={{ placement: "Hero", size: 1.35 }}
                />
              </div>
            </div>
            <div className="hero-block">
              <div className="hero-name">
                <LensText
                  text={hero.name}
                  as="h1"
                  className="hero-name__text"
                  color="#0a0a0a"
                  trigger="load"
                  delay={0.15}
                  duration={1.4}
                  lineStagger={0.4}
                  blur={0.17}
                  lens={1.3}
                  gain={1.5}
                  hover
                />
              </div>
              <div className="hero-meta appear" style={{ animationDelay: "0.9s" }}>
                <p className="t-role">
                  {hero.roleLines[0]}
                  <br />
                  {hero.roleLines[1]}
                </p>
                <p className="t-mono c-muted">{hero.portfolioLabel}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid12 hero-footer appear" style={{ animationDelay: "1.1s" }}>
          <div className="hero-footer__spacer" />
          <p className="t-mono hero-footer__hint">
            <a href="#work" className="l-ink">{hero.scrollHint}</a>
          </p>
          <div className="hero-socials">
            {site.heroSocials.map((s) => <IconLink key={s.label} {...s} />)}
          </div>
        </div>
      </section>

      {/* ── Work ── */}
      <section id="work" className="work">
        <div className="grid12 px work-header">
          <p className="t-mono work-header__label" style={{ color: "var(--on-dark)" }}>{work.label}</p>
          <p className="t-mono work-header__range" style={{ color: "var(--on-dark-muted)" }}>{work.range}</p>
          <p className="t-mono work-header__hint" style={{ color: "var(--on-dark)" }}>{work.dragHint}</p>
        </div>
        <div className="work-slider">
          <ProjectSlider items={projects.map((p) => ({ title: p.title, category: p.category, year: p.year, src: p.cover, href: `/work/${p.slug}` }))} />
        </div>
      </section>

      {/* ── Ruang kosong sticky: Work tetap terlihat satu layar lagi ── */}
      <section className="spacer-sticky" aria-hidden="true" />

      {/* ── About ── */}
      <section id="about" className="about px">
        <div className="grid12 about-statement">
          <p className="t-mono c-muted about-statement__label">{about.label}</p>
          <div className="about-statement__text">
            <IndentText text={about.statement} as="h2" className="statement" dimOpacity={0.16} />
          </div>
        </div>
        <div className="grid12 about-details">
          <div className="about-spacer" />
          <div className="about-practice">
            <p className="t-body">{about.practice}</p>
            <div className="elbow-link">
              <ArrowElbowDownRight color="var(--ink)" />
              <p className="t-body">
                <a href={site.cvUrl} target="_blank" rel="noopener noreferrer" className="l-underline">{about.cvLabel}</a>
              </p>
            </div>
          </div>
          <div className="about-offduty">
            <p className="t-body">{about.offDuty}</p>
          </div>
        </div>
        <div className="grid12 about-stats">
          <div className="about-spacer" />
          {about.stats.map((s) => (
            <div key={s.label} className="about-stat">
              <p className="t-body about-stat__label">{s.label}</p>
              <GlitchCounter value={s.value} prefix={s.prefix} suffix={s.suffix} delay={s.delay} duration={1.6} pad={2} className="stat-value" />
            </div>
          ))}
        </div>
      </section>
      <div id="contact" className="contact-anchor" />
    </>
  );
}
