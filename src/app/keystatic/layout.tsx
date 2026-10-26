import type { Metadata } from "next";
import KeystaticApp from "./keystatic";

export const metadata: Metadata = { title: "CMS — Tatas Handharu", robots: { index: false, follow: false } };

export default function Layout() {
  return <KeystaticApp />;
}
