import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-2xl border px-3 py-1 text-xs font-semibold ui-smooth focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 glass neo-raised",
          {
            "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 hover:scale-105":
              variant === "default",
            "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105":
              variant === "secondary",
            "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:scale-105":
              variant === "destructive",
            "text-foreground hover:scale-105": variant === "outline",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Badge.displayName = "Badge";

export { Badge };
