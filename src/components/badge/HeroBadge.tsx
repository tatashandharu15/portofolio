"use client";
// Kartu ID lanyard di hero (komponen Lanyard dari React Bits). Gambar depan/belakang/tali digambar di canvas
// dari data CMS lalu dikirim sebagai data URL.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { drawBand, drawCardFaces, type BadgeData } from "./textures";

const Lanyard = dynamic(() => import("./RBLanyard"), { ssr: false });

type Look = { anchor: number; size: number; strapLength: number };

function lookFor(w: number): Look {
  if (w < 810) return { anchor: 0.76, size: 0.26, strapLength: 0.14 };
  if (w < 1200) return { anchor: 0.17, size: 0.34, strapLength: 0.3 };
  return { anchor: 0.17, size: 0.56, strapLength: 0.32 };
}

export function HeroBadge({ data }: { data: BadgeData }) {
  const [images, setImages] = useState<{ front: string; back: string; strap: string } | null>(null);
  const [look, setLook] = useState<Look | null>(null);

  useEffect(() => {
    let alive = true;
    drawCardFaces(data).then(({ front, back }) => {
      if (!alive) return;
      setImages({ front: front.toDataURL("image/png"), back: back.toDataURL("image/png"), strap: drawBand(data.idLabel).toDataURL("image/png") });
    });
    return () => {
      alive = false;
    };
  }, [data]);

  useEffect(() => {
    const update = () => setLook((prev) => {
      const next = lookFor(window.innerWidth);
      return prev && prev.anchor === next.anchor && prev.size === next.size ? prev : next;
    });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!images || !look) return null;
  return (
    <div className="hero-badge" aria-label="Kartu ID — tarik untuk mengayun, klik untuk membalik">
      <Lanyard
        frontImage={images.front}
        backImage={images.back}
        strapImage={images.strap}
        imageFit="cover"
        cardColor="#151515"
        finish="glossy"
        cornerRadius={0.3}
        size={look.size}
        anchor={look.anchor}
        strapLength={look.strapLength}
        strapColor="#d4d0cb"
        strapWidth={0.6}
        metal="silver"
        gravity={1}
        damping={0.5}
        elasticity={0.5}
        breeze={0.35}
      />
    </div>
  );
}
