import Link from "next/link";
import { site } from "@/content/site";
import { GridLines } from "@/components/GridLines";
import { FerroPattern } from "@/components/FerroPattern";
import { ArrowElbowDownRight } from "@/components/Icons";

export default function NotFound() {
  const n = site.notFound;
  return (
    <section className="nf px">
      <GridLines />
      <div className="grid12 nf-row">
        <div className="nf-art">
          <div className="nf-art__pattern">
            <FerroPattern color="rgb(227, 226, 220)" cursorSize={10} gloss={0} pattern="maze" radius={85} scale={1.5} shadow={0} shape="radial" speed={1} interactive />
          </div>
        </div>
        <div className="nf-content">
          <p className="t-mono c-muted">{n.label}</p>
          <h1 className="t-h1">{n.title}</h1>
          <p className="t-role">{n.text}</p>
          <div className="elbow-link">
            <ArrowElbowDownRight color="var(--ink)" />
            <p className="t-body"><Link href="/" className="l-underline">{n.back}</Link></p>
          </div>
        </div>
      </div>
    </section>
  );
}
