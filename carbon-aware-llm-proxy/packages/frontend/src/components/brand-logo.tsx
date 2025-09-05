import React from "react";
import Image from "next/image";

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
 * It uses Next.js Image components for optimized loading and Vercel compatibility.
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
      <div className={`relative h-6 w-6 sm:h-7 sm:w-7 transform scale-[${scale}] ${zIndexClass}`} style={{ left: `${leftOffsetPx}px` }}>
        <Image
          src="/logo-light.svg"
          alt="Carbon-Aware LLM Proxy Logo (Light)"
          fill
          className="block dark:hidden object-contain"
        />
      </div>

      {/* Dark mode logo */}
      <div className={`relative h-6 w-6 sm:h-7 sm:w-7 transform scale-[${scale}] ${zIndexClass}`} style={{ left: `${leftOffsetPx}px` }}>
        <Image
          src="/logo-dark.svg"
          alt="Carbon-Aware LLM Proxy Logo (Dark)"
          fill
          className="hidden dark:block object-contain"
        />
      </div>

      {showWordmark && (
        <span className="ml-2 text-xl sm:text-2xl font-thin text-foreground/60">
          Routly
        </span>
      )}
    </div>
  );
}

export default BrandLogo;
