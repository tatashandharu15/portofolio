import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: `Contact — ${site.name}`,
  description: "Get in touch about AI systems, data platforms or collaboration.",
};

export default function ContactPage() {
  return (
    <section className="contact px">
      <div className="grid12 project-top">
        <p className="t-mono project-top__back"><Link href="/" className="l-ink">Index</Link></p>
        <p className="t-mono c-muted project-top__cat">Contact</p>
        <p className="t-mono c-muted project-top__year">Jakarta, GMT+7</p>
      </div>
      <h1 className="t-h1">Lets talk</h1>
      <div className="grid12 contact-body">
        <div className="contact-intro">
          <p className="t-role">Building something with AI or data? Tell me about it — roles, projects or just a good question.</p>
          <p className="t-mono c-muted">Replies within 1–2 days</p>
        </div>
        <div className="contact-main">
          <ContactForm email={site.email} />
        </div>
      </div>
    </section>
  );
}
