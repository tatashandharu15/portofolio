"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      form.reset();
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="contact-done">
        <h2 className="t-h2">Message sent.</h2>
        <p className="t-body c-muted">Thanks for reaching out — I&apos;ll reply to your email soon.</p>
        <button type="button" className="contact-reset t-mono" onClick={() => setStatus("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate={false}>
      <label className="contact-field">
        <span className="t-mono c-muted">Name</span>
        <input name="name" type="text" required maxLength={120} autoComplete="name" placeholder="Your name" />
      </label>
      <label className="contact-field">
        <span className="t-mono c-muted">Email</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@company.com" />
      </label>
      <label className="contact-field">
        <span className="t-mono c-muted">Subject</span>
        <input name="subject" type="text" maxLength={160} placeholder="Project, role, collaboration…" />
      </label>
      <label className="contact-field">
        <span className="t-mono c-muted">Message</span>
        <textarea name="message" required minLength={10} maxLength={5000} rows={6} placeholder="Tell me a bit about it" />
      </label>
      <div className="contact-hp" aria-hidden="true">
        <label>Company<input name="company" type="text" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="contact-actions">
        <button type="submit" className="contact-submit t-mono" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <p className="t-mono c-muted contact-alt">
          or email <a href={`mailto:${email}`} className="l-ink">{email}</a>
        </p>
      </div>
      {status === "error" ? <p className="t-body contact-error" role="alert">{error}</p> : null}
    </form>
  );
}
