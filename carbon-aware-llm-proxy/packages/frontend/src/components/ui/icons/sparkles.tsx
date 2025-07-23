import * as React from "react";
import { cn } from "@/lib/utils";

interface SparklesProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Sparkles = React.forwardRef<SVGSVGElement, SparklesProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      className={cn("h-5 w-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
      />
      <path
        d="M4 17L5.5 19.5L8 21L5.5 22.5L4 25L2.5 22.5L0 21L2.5 19.5L4 17Z"
        fill="currentColor"
      />
      <path
        d="M20 17L21.5 19.5L24 21L21.5 22.5L20 25L18.5 22.5L16 21L18.5 19.5L20 17Z"
        fill="currentColor"
      />
    </svg>
  ),
);

Sparkles.displayName = "Sparkles";

export default Sparkles;
