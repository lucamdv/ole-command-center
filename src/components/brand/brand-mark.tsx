import azulAsset from "@/assets/excelsior-azul.png.asset.json";
import brancaAsset from "@/assets/excelsior-branca.png.asset.json";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function BrandMark({ className, height = 32 }: { className?: string; height?: number }) {
  const { theme } = useTheme();
  const src = theme === "dark" ? brancaAsset.url : azulAsset.url;
  return (
    <img
      src={src}
      alt="Excelsior Seguros"
      style={{ height, width: "auto" }}
      className={cn("object-contain select-none", className)}
      draggable={false}
    />
  );
}
