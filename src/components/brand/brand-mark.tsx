import olexAsset from "@/assets/olex.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className, height = 32 }: { className?: string; height?: number }) {
  return (
    <img
      src={olexAsset.url}
      alt="Oléx"
      style={{ height, width: "auto" }}
      className={cn("object-contain select-none", className)}
      draggable={false}
    />
  );
}
