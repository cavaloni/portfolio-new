import React from "react";

interface BrandLogoProps {
  // Tailwind arbitrary scale, e.g. 3 for scale-[3]
  scale?: number;
  // Pixel offset to nudge leftwards (positive values move right)
  leftOffsetPx?: number;
  // Additional container classes
  className?: string;
  // Whether to show the wordmark "Routly"
  showWordmark?: boolean;
  // Optional z-index class (e.g. "-z-10")
  zIndexClass?: string;
}

/**
 * BrandLogo renders the Routly brand with theme-aware light/dark SVG variants.
 * It mirrors the header implementation (two <img> tags toggled by Tailwind's dark: utilities)
 * and includes a wordmark by default.
 */
export function BrandLogo({
  scale = 3,
  leftOffsetPx = 35,
  className = "",
  showWordmark = true,
  zIndexClass = "-z-10",
}: BrandLogoProps) {
  const commonImgClasses = `transform scale-[${scale}] h-6 w-6 sm:h-7 sm:w-7 relative ${zIndexClass}`;
  const containerClasses = `flex items-center ${className}`;

  return (
    <div className={containerClasses}>
      {/* Light mode logo */}
      <img
        src="/icons/light/logo-light.svg"
        alt="Carbon-Aware LLM Proxy Logo (Light)"
        className={`block dark:hidden ${commonImgClasses}`}
        style={{ left: `${leftOffsetPx}px` }}
      />

      {/* Dark mode logo */}
      <img
        src="/icons/new-logo.svg"
        alt="Carbon-Aware LLM Proxy Logo (Dark)"
        className={`hidden dark:block ${commonImgClasses}`}
        style={{ left: `${leftOffsetPx}px` }}
      />

      {showWordmark && (
        <span className="ml-2 text-xl sm:text-2xl font-thin text-foreground/60">
          Routly
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
