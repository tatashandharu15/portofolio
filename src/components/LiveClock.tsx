"use client";
import { useEffect, useState } from "react";

function fmt(timeZone: string, hour12: boolean) {
  try {
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12, timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12 }).format(new Date());
  }
}

export function LiveClock({ prefix, timeZone, hour12 = true }: { prefix: string; timeZone: string; hour12?: boolean }) {
  const [time, setTime] = useState(hour12 ? "00:00 AM" : "00:00");
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setTime(fmt(timeZone, hour12));
      id = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    tick();
    return () => window.clearTimeout(id);
  }, [timeZone, hour12]);
  return (
    <span className="t-mono clock" style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
      {prefix} <time suppressHydrationWarning>{time}</time>
    </span>
  );
}
