import { Nav } from "./Nav";
import { Footer } from "./Footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <Nav />
      <main className="site-main">{children}</main>
      <div className="grow" />
      <Footer />
    </div>
  );
}
