import { site } from "@/content/site";
import { GridLines } from "./GridLines";
import { IconLink } from "./IconLink";
import { LensText } from "./LensText";

export function Footer() {
  const f = site.footer;
  return (
    <footer className="footer px" data-name="Contact">
      <GridLines />
      <div className="grid12 footer-media">
        <div className="footer-media__spacer" />
        <div className="footer-media__video">
          {f.media.type === "video" ? (
            <video src={f.media.src} autoPlay muted loop playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.media.src} alt="" />
          )}
        </div>
      </div>
      <LensText
        text={f.cta}
        as="h2"
        className="footer-cta"
        color="#0a0a0a"
        href="/contact"
        fit
        fullWidth
        trigger="inView"
        threshold={0.4}
        duration={1.4}
        lineStagger={0.15}
        blur={0.21}
        lens={1.3}
        gain={1.5}
        hover
      />
      <div className="footer-bottom">
        <div className="grid12">
          <div className="footer-spacer6" />
          <div className="footer-links">
            {f.linksA.map((l) => <IconLink key={l.label} {...l} />)}
          </div>
          <div className="footer-links">
            {f.linksB.map((l) => <IconLink key={l.label} {...l} />)}
          </div>
        </div>
        <div className="grid12">
          <div className="footer-spacer6" />
          <div className="footer-credits">
            <div>
              <p className="t-mono c-muted">Design &amp; engineering_<span className="c-ink">{f.creditName}</span></p>
              <p className="t-mono c-ink"><span className="c-muted">Built in_</span>{f.builtWith}</p>
            </div>
            <p className="t-mono c-muted">{f.copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
