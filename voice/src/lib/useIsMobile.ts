"use client";
import { useEffect, useState } from "react";

/** True below the `lg` breakpoint (1024px) — the phone/tablet experience. */
export function useIsMobile(query = "(max-width: 1023px)") {
  const [is, setIs] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setIs(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return is;
}
