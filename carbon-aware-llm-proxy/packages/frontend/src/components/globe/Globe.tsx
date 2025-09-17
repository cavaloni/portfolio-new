"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import ReactGlobe from "react-globe.gl";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { GlobeProps } from "./Globe.types";
import { useTheme } from "next-themes";
import { CarbonIntensityBadge } from "@/components/chat/carbon-intensity-badge";
import {
	getRegionCoordinates,
	getMarkerColor,
	getRegionDisplayName,
	createModelLabel,
	GLOBE_ANIMATION_CONFIG,
	calculateShortestRotation,
} from './Globe.utils';

export const GlobeComponent: React.FC<GlobeProps> = ({
  activeRegion,
  size = 200,
  isLoading = false,
  className,
  autoRotate = true,
  rotationSpeed = 0.01,
  preference,
  selectedModel,
  currentDeployment,
}) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme || "light") === "dark";
  // Theme-aware visual tokens for the globe
  const globeImageUrl = isDark
    ? "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"
    : "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
  const atmosphereColor = isDark ? "#4f46e5" : "#60a5fa";
  const atmosphereAltitude = isDark ? 0.15 : 0.12;
	const [isGlobeLoaded, setIsGlobeLoaded] = useState(false);
	const [isGlobeAnimating, setIsGlobeAnimating] = useState(false);
	const globeRef = useRef<any>(null);
	const previousTargetRegionRef = useRef<string | null>(null);
	const pendingTargetRegionRef = useRef<string | null>(null);
	// Use a ref for animation state to avoid stale state during async phases
	const isAnimatingRef = useRef<boolean>(false);
	// Signal to cancel the current animation sequence early
	const cancelRequestedRef = useRef<boolean>(false);

	// Determine the target region for label/camera: prefer selectedModel.region, fallback to activeRegion
	const targetRegion = useMemo(() => {
		return selectedModel?.region || activeRegion || null;
	}, [selectedModel?.region, activeRegion]);

	// Prepare label data for the selected model at the target region
	const labelData = useMemo(() => {
		if (selectedModel?.id && targetRegion) {
			const labels = createModelLabel(selectedModel.id, targetRegion);
			return labels;
		}
		return [];
	}, [selectedModel, targetRegion]);

  const [countries, setCountries] = useState({ features: []});

  useEffect(() => {
    // load data
    fetch('../datasets/ne_110m_admin_0_countries.geojson').then(res => res.json()).then(setCountries);
  }, []);

	// Get region coordinates for positioning (UI overlays)
	const regionCoords = useMemo(() => {
		return getRegionCoordinates(activeRegion || null);
	}, [activeRegion]);

	// Animation function for smooth globe transitions
	const animateToRegion = useCallback(async (targetRegion: string | null) => {
		if (!globeRef.current || !targetRegion || isAnimatingRef.current) return;

		const targetCoords = getRegionCoordinates(targetRegion);
		if (!targetCoords) return;

		const [targetLat, targetLng] = targetCoords;
		const currentCoords = globeRef.current.pointOfView();

		// Calculate shortest rotation
		const rotation = calculateShortestRotation(currentCoords.lng, targetLng);

		console.log('Globe animation details:', {
			targetRegion,
			targetLat,
			targetLng,
			currentLng: currentCoords.lng,
			rotation,
		});

		try {
			// mark animating
			isAnimatingRef.current = true;
			setIsGlobeAnimating(true);
			// this run owns the cancel flag until done
			cancelRequestedRef.current = false;
			console.log(`Globe: Starting animation to ${targetRegion}`);

			// Utility to create a promise-based delay
			const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

			// Phase 1: Zoom out
			globeRef.current.pointOfView({
				altitude: GLOBE_ANIMATION_CONFIG.ZOOMED_OUT_ALTITUDE,
			}, GLOBE_ANIMATION_CONFIG.ZOOM_OUT_DURATION);
			await delay(GLOBE_ANIMATION_CONFIG.ZOOM_OUT_DURATION);

			// If a new target was requested, abort remaining phases to retarget
			if (cancelRequestedRef.current) {
				console.log('Globe: Animation canceled before rotation; retargeting...');
				return;
			}

			// Phase 2: Rotate to target
			console.log('Rotating to:', { targetLat, targetLng });
			globeRef.current.pointOfView({
				lat: targetLat,
				lng: ((targetLng + 180) % 360 + 360) % 360 - 180, // normalize to [-180, 180]
				altitude: GLOBE_ANIMATION_CONFIG.ZOOMED_OUT_ALTITUDE, // Maintain altitude
			}, GLOBE_ANIMATION_CONFIG.ROTATION_DURATION);
			await delay(GLOBE_ANIMATION_CONFIG.ROTATION_DURATION);

			if (cancelRequestedRef.current) {
				console.log('Globe: Animation canceled after rotation; retargeting...');
				return;
			}

			// Phase 3: Zoom in
			globeRef.current.pointOfView({
				altitude: GLOBE_ANIMATION_CONFIG.ZOOMED_IN_ALTITUDE,
			}, GLOBE_ANIMATION_CONFIG.ZOOM_IN_DURATION);
			await delay(GLOBE_ANIMATION_CONFIG.ZOOM_IN_DURATION);

			console.log('Globe: Animation completed successfully');

		} catch (error) {
			console.error('Globe animation failed:', error);
		} finally {
			// mark animation complete
			isAnimatingRef.current = false;
			setIsGlobeAnimating(false);
			previousTargetRegionRef.current = targetRegion;

			// If a new target arrived during animation, chain it now
			if (pendingTargetRegionRef.current && pendingTargetRegionRef.current !== targetRegion) {
				const next = pendingTargetRegionRef.current;
				pendingTargetRegionRef.current = null;
				cancelRequestedRef.current = false;
				// chain next animation
				animateToRegion(next);
			}
		}
	}, []);

	// Trigger animation when the target region (selectedModel.region || activeRegion) changes
	useEffect(() => {
		if (!isGlobeLoaded) return;
		if (!targetRegion) return;

		if (isAnimatingRef.current) {
			// queue latest target and request cancel to retarget immediately
			pendingTargetRegionRef.current = targetRegion;
			cancelRequestedRef.current = true;
			console.log('Globe: Canceling current animation; queued ->', previousTargetRegionRef.current, '=>', targetRegion);
			return;
		}

		if (targetRegion !== previousTargetRegionRef.current) {
			console.log('Globe: Detected target region change ->', previousTargetRegionRef.current, '=>', targetRegion);
			animateToRegion(targetRegion);
		}
	}, [targetRegion, isGlobeLoaded, animateToRegion]);

	const displayName = getRegionDisplayName(activeRegion || null);
	const showLoading = isLoading || !isGlobeLoaded;
	return (
		<div className={cn("relative", className)}>
			{/* Globe Container */}
			<div
				className="relative overflow-hidden rounded-lg"
				style={{ width: size, height: size }}>
									<ReactGlobe
						ref={globeRef}
						width={size}
						height={size}
						backgroundColor="rgba(0,0,0,0)"
						showAtmosphere={true}
						atmosphereColor={atmosphereColor}
						atmosphereAltitude={atmosphereAltitude}
						enablePointerInteraction={!isGlobeAnimating}
					// HTML elements for model icons
					htmlElementsData={labelData}
					htmlLat={(d: any) => d.lat}
					htmlLng={(d: any) => d.lng}
					htmlElement={(d: any) => {
						const el = document.createElement("div");
						el.style.display = "flex";
						el.style.alignItems = "center";
						el.style.justifyContent = "center";
						el.style.width = "28px";
						el.style.height = "28px";
						el.style.background = isDark
							? "rgba(0,0,0,0.55)"
							: "rgba(255,255,255,0.55)";
						el.style.borderRadius = "50%";
						el.style.border = `2px solid #4f46e5`;
						el.style.boxShadow = isDark
							? "0 2px 14px rgba(0,0,0,0.6)"
							: "0 2px 12px rgba(0,0,0,0.3)";
						el.style.cursor = "pointer";
						el.style.transition = "all 0.2s ease";
						// Ensure proper centering with react-globe.gl's positioning
						el.style.transformOrigin = "center center";
						el.style.position = "absolute";
						el.style.left = "-14px"; // Half of width to center
						el.style.top = "-14px"; // Half of height to center

						const img = document.createElement("img");
						img.src = d.icon;
						img.alt = d.name;
						img.style.width = "18px";
						img.style.height = "18px";
						img.style.objectFit = "contain";
						img.style.borderRadius = "50%";

						el.appendChild(img);
						el.title = `${d.name} - Active Model`;

						return el;
					}}
					globeImageUrl={globeImageUrl}
					hexPolygonsData={countries.features}
					hexPolygonResolution={3}
					hexPolygonMargin={0.3}
					hexPolygonUseDots={true}
					hexPolygonColor={() => (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)")}
					onGlobeReady={() => setIsGlobeLoaded(true)}
				/>

				{/* Loading State */}
				{showLoading && (
					<div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm rounded-lg z-10">
						<div className="flex flex-col items-center gap-2">
							<Loader2 className="h-6 w-6 animate-spin text-primary" />
							<span className="text-xs text-muted-foreground">Loading globe...</span>
						</div>
					</div>
				)}

				{/* Region Indicator Overlay */}
				{activeRegion && !showLoading && (
					<div className="absolute bottom-2 left-2 right-2 z-10">
						<div className="glass-strong p-2 rounded text-center">
							<span className="text-xs font-medium text-primary">{displayName}</span>
						</div>
					</div>
				)}

				{/* Glow Effect */}
				<div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
			</div>

			{/* Region Status */}
			{/* {activeRegion && (
				<div className="mt-2 text-center">
					<div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
						<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
						<span>Active in {displayName}</span>
					</div>
				</div>
			)} */}

			{/* Model Indicator */}
			{selectedModel && labelData.length > 0 && !showLoading && (
				<div className="mt-1 text-center space-y-1">
					<div className="flex items-center justify-center gap-1 flex-wrap">
						<span className="text-xs text-muted-foreground">Model: {labelData[0]?.name}</span>
					</div>
					{currentDeployment?.region && (
						<div className="flex items-center justify-center gap-1 flex-wrap text-xs text-muted-foreground">
							<span>{currentDeployment.region}</span>
							{currentDeployment?.co2_g_per_kwh && (
								<>
									<span>•</span>
									<CarbonIntensityBadge intensity={currentDeployment.co2_g_per_kwh} />
								</>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// Export as Globe for backward compatibility
export { GlobeComponent as Globe };
GlobeComponent.displayName = 'Globe';
