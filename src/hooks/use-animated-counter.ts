import { useEffect, useState } from "react";

function prefersInstant() {
  if (typeof window === "undefined") return true;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  // Em telas pequenas o ganho visual não paga o custo de ~60 re-renders.
  return Boolean(reduced) || window.innerWidth < 768;
}

export function useAnimatedCounter(target: number, duration = 900) {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (prefersInstant()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    setValue(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
