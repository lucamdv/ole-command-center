import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts";

type Dim = number | `${number}%`;

interface Props {
  width?: Dim;
  height?: Dim;
  minHeight?: number | string;
  className?: string;
  children: ReactNode;
}

/**
 * Drop-in replacement for recharts' ResponsiveContainer that only mounts the
 * chart once it scrolls into view. Keeps initial render (and re-layout work)
 * cheap on mobile / slow networks.
 */
export const ResponsiveContainer = memo(function InViewResponsiveContainer({
  width = "100%",
  height = "100%",
  minHeight,
  className,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%", minHeight }}>
      {visible ? (
        <RechartsResponsiveContainer width={width} height={height} minHeight={minHeight}>
          {children as never}
        </RechartsResponsiveContainer>
      ) : null}
    </div>
  );
});
