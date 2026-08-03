import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/kanam-events-logo-light.png";
import logoDark from "@/assets/kanam-events-logo-dark.png";

type BrandLogoProps = {
  className?: string;
  imgClassName?: string;
};

export const BrandLogo = ({ className, imgClassName }: BrandLogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid a flash of the wrong logo before hydration.
  const isDark = mounted && resolvedTheme === "dark";
  const src = isDark ? logoDark : logoLight;

  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={src}
        alt="Kanam Events"
        className={cn("h-24 w-auto object-contain", imgClassName)}
      />
    </span>
  );
};
