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
 * It uses CSS background images for optimal Vercel compatibility (like other SVGs in the project).
 * The component includes a wordmark by default and supports theme switching.
 */
export function BrandLogo({
  scale = 3,
  leftOffsetPx = 35,
  className = "",
  showWordmark = true,
  zIndexClass = "-z-10",
}: BrandLogoProps) {
  const containerClasses = `flex items-center ${className}`;

  return (
    <div className={containerClasses}>
      {/* Light mode logo */}
      <div
        className={`relative h-6 w-6 sm:h-7 sm:w-7 transform scale-[${scale}] ${zIndexClass} block dark:hidden bg-contain bg-no-repeat bg-center`}
        style={{
          left: `${leftOffsetPx}px`,
          backgroundImage: "url('/logo-light.svg')"
        }}
        role="img"
        aria-label="Carbon-Aware LLM Proxy Logo (Light)"
      />

      {/* Dark mode logo */}
      <div
        className={`relative h-6 w-6 sm:h-7 sm:w-7 transform scale-[${scale}] ${zIndexClass} hidden dark:block bg-contain bg-no-repeat bg-center`}
        style={{
          left: `${leftOffsetPx}px`,
          backgroundImage: "url('/logo-dark.svg')"
        }}
        role="img"
        aria-label="Carbon-Aware LLM Proxy Logo (Dark)"
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
