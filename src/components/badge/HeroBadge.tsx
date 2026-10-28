"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { BadgeData } from "./textures";

const Lanyard = dynamic(() => import("./Lanyard"), { ssr: false });

// Dipasang di dalam .hero — event pointer diambil dari section hero, canvas tidak menghalangi elemen lain.
export function HeroBadge({ data }: { data: BadgeData }) {
  const holder = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    hero.current = holder.current?.closest("section") ?? null;
    setReady(!!hero.current);
  }, []);
  return <div ref={holder} className="hero-badge-holder">{ready ? <Lanyard data={data} eventSource={hero} /> : null}</div>;
}
