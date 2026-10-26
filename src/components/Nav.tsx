import Link from "next/link";
import { site } from "@/content/site";
import { LiveClock } from "./LiveClock";
import { GlitchMenu } from "./GlitchMenu";

export function Nav() {
  return (
    <nav className="nav" aria-label="Primary">
      <Link href="/" className="nav-home">
        <LiveClock prefix={site.clock.prefix} timeZone={site.clock.timeZone} hour12={site.clock.hour12} />
      </Link>
      <div className="nav-links">
        <Link href="/#contact" className="nav-talk t-mono">Lets talk</Link>
        <GlitchMenu brand={site.menu.brand} items={site.menu.items} email={site.email} socials={site.menu.socials} />
      </div>
    </nav>
  );
}
