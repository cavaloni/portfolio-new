"use client";

import React, { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  GlobeProps,
  GlobeConfig,
  GlobeState,
} from "./Globe.types";
import {
  DEFAULT_GLOBE_CONFIG,
  createRegionMarker,
  getMarkerColor,
  getRegionDisplayName,
} from "./Globe.utils";

export const Globe: React.FC<GlobeProps> = ({
  activeRegion,
  size = 200,
  isLoading = false,
  className,
  autoRotate = true,
  rotationSpeed = 0.01,
  preference,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<any>(null);
  const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);
  const phiRef = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create markers array
    const markers = [];
    const regionMarker = createRegionMarker(activeRegion);
    if (regionMarker) {
      markers.push({
        ...regionMarker,
        color: getMarkerColor(preference),
      });
    }

    // Globe configuration
    const globeConfig: GlobeConfig = {
      ...DEFAULT_GLOBE_CONFIG,
      width: size * 2, // Higher resolution for crisp display
      height: size * 2,
      markers,
      onRender: (state: GlobeState) => {
        if (autoRotate) {
          phiRef.current += rotationSpeed;
          state.phi = phiRef.current;
        }
      },
    };

    // Create the globe
    try {
      globeRef.current = createGlobe(canvasRef.current, globeConfig);
      setIsGlobeLoaded(true);
    } catch (error) {
      console.error("Failed to create globe:", error);
    }

    // Cleanup function
    return () => {
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, [activeRegion, size, autoRotate, rotationSpeed, preference]);

  // Update markers when activeRegion changes
  useEffect(() => {
    if (!globeRef.current) return;

    const markers = [];
    const regionMarker = createRegionMarker(activeRegion);
    if (regionMarker) {
      markers.push({
        ...regionMarker,
        color: getMarkerColor(preference),
      });
    }

    // Update globe markers
    try {
      globeRef.current.updateConfig({
        markers,
      });
    } catch (error) {
      console.error("Failed to update globe markers:", error);
    }
  }, [activeRegion, preference]);

  const displayName = getRegionDisplayName(activeRegion);
  const showLoading = isLoading || !isGlobeLoaded;

  return (
    <div className={cn("relative", className)}>
      {/* Globe Canvas */}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            showLoading ? "opacity-0" : "opacity-100"
          )}
          style={{
            width: size,
            height: size,
          }}
          width={size * 2}
          height={size * 2}
        />

        {/* Loading State */}
        {showLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                Loading globe...
              </span>
            </div>
          </div>
        )}

        {/* Region Indicator Overlay */}
        {activeRegion && !showLoading && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="glass-strong p-2 rounded text-center">
              <span className="text-xs font-medium text-primary">
                {displayName}
              </span>
            </div>
          </div>
        )}

        {/* Glow Effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
      </div>

      {/* Region Status */}
      {activeRegion && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Active in {displayName}</span>
          </div>
        </div>
      )}
    </div>
  );
};

Globe.displayName = "Globe";
