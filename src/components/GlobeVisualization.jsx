import React, { useEffect, useRef, useState, useMemo } from "react";

/**
 * GlobeVisualization — Enterprise-grade interactive 3D intelligence globe
 * Rendering Engine: Canvas 2D + custom 3D mathematics (zero external 3D libraries)
 * Data Mapping: worldStateEngine + feedStatus → geospatial layer with confidence scoring
 * Features: Real-time event mapping, relationship lines, forecast halos, dual-mode visualization
 */
export default function GlobeVisualization({
  worldState,
  feedStatus,
  language = "ar",
  mode = "simplified",
  hoveredEntity = null,
}) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState({ lat: 0.3, lon: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ─── GEOGRAPHIC COORDINATE DATABASE ────────────────────────────────────
  const REGION_COORDS = useMemo(
    () => ({
      "Middle East": [25, 45],
      "Ukraine": [49, 31],
      "Taiwan": [23.7, 120.9],
      "South China Sea": [12, 115],
      "Russia": [61, 105],
      "Iran": [32, 54],
      "North Korea": [40, 127],
      "Gaza": [31.9, 34.4],
      "Syria": [34.8, 38.8],
      "Yemen": [15.4, 48.5],
      "India": [20, 78],
      "Pakistan": [30, 69],
      "Afghanistan": [34, 67],
      "Europe": [50, 15],
      "USA": [40, -95],
      "China": [35, 105],
      "Japan": [36, 138],
      "Korea": [37, 127],
      "Southeast Asia": [15, 105],
    }),
    []
  );

  // ─── INTELLIGENT DATA MAPPING LAYER ────────────────────────────────────  
  /**
   * Maps worldStateEngine + feedStatus into 5-layer geospatial visualization:
   * Layer 1: Breaking Events (red) - top urgency
   * Layer 2: Tension Zones (orange) - stability risk
   * Layer 3: Forecast Zones (subtle gold halos) - 72h outlook
   * Layer 4: Relationships (dashed lines) - causal/entity linking
   * Layer 5: Signal Confidence (halo intensity) - prediction confidence
   */
  const getDataLayers = () => {
    const layers = {
      breakingEvents: [],    // Red: urgent + high confidence
      tensionZones: [],      // Orange: regions with sustained risk
      forecastZones: [],     // Gold halos: 72h outlook targets
      connections: [],       // Purple dashed lines: relationships
      signals: [],           // Internal confidence scores
    };

    // Layer 1: Breaking Events (top priority from strategicSummary)
    const topEvents = worldState?.strategicSummary?.topGlobalEvents || [];
    topEvents.slice(0, mode === "simplified" ? 5 : 10).forEach((event, idx) => {
      const region = event.region || event.country || "Global";
      const coords = REGION_COORDS[region];
      if (coords) {
        layers.breakingEvents.push({
          id: `event-${idx}`,
          lat: coords[0],
          lon: coords[1],
          intensity: 0.85 + idx * 0.05,
          confidence: Number(event.confidence || 0.8).toFixed(2),
          label: event.title,
          type: "breaking",
          urgency: event.urgency || "high",
          description: event.summary || "",
        });
      }
    });

    // Layer 2: Tension Zones (from strategicSummary hotspots)
    const hotspots = worldState?.strategicSummary?.regionsWithHighestTension || [];
    hotspots.slice(0, mode === "simplified" ? 4 : 8).forEach((region, idx) => {
      const coords = REGION_COORDS[region];
      if (coords) {
        layers.tensionZones.push({
          id: `tension-${idx}`,
          lat: coords[0],
          lon: coords[1],
          intensity: 0.6 + idx * 0.05,
          confidence: (worldState?.strategicGlobalRisk?.confidence || 0.75).toFixed(2),
          label: region,
          type: "tension",
          riskLevel: worldState?.strategicGlobalRisk?.level || "MODERATE",
        });
      }
    });

    // Layer 3: Forecast Zones (advanced only, from 72h outlook)
    if (mode === "advanced") {
      const forecast = worldState?.strategicSummary?.likelyNext72Hours || "";
      const forecastKey = worldState?.strategicSummary?.forecastKey || "monitoring";
      if (forecast || forecastKey !== "monitoring") {
        Object.keys(REGION_COORDS)
          .slice(0, 5)
          .forEach((region, idx) => {
            if (forecast.toLowerCase().includes(region.toLowerCase())) {
              const coords = REGION_COORDS[region];
              layers.forecastZones.push({
                id: `forecast-${idx}`,
                lat: coords[0],
                lon: coords[1],
                intensity: 0.4,
                label: region,
                confidence: 0.6,
                type: "forecast",
              });
            }
          });
      }
    }

    // Layer 4: Relationships/Causal Links (advanced only)
    if (mode === "advanced") {
      const causalLinks = worldState?.strategicCausalLinks || [];
      causalLinks.slice(0, 4).forEach((link, idx) => {
        if (link.source && link.target) {
          const sourceCoords = REGION_COORDS[link.source];
          const targetCoords = REGION_COORDS[link.target];
          if (sourceCoords && targetCoords) {
            layers.connections.push({
              id: `conn-${idx}`,
              source: { lat: sourceCoords[0], lon: sourceCoords[1], label: link.source },
              target: { lat: targetCoords[0], lon: targetCoords[1], label: link.target },
              strength: Number(link.strength || 0.7),
              type: link.type || "causal",
              explanation: link.explanation || "",
            });
          }
        }
      });
    }

    return layers;
  };

  const dataLayers = useMemo(() => getDataLayers(), [worldState, mode, REGION_COORDS]);

  // ─── 3D MATHEMATICS ──────────────────────────────────────────────────────
  /**
   * Convert geographic coordinates to 3D cartesian on unit sphere
   * X: East-West (longitude), Y: Up-Down (latitude), Z: depth (front-back)
   */
  const latLonTo3D = (lat, lon, radius = 1) => {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    return {
      x: radius * Math.cos(latRad) * Math.cos(lonRad),
      y: radius * Math.sin(latRad),
      z: radius * Math.cos(latRad) * Math.sin(lonRad),
    };
  };

  /**
   * Apply rotations (latitude + longitude) to 3D point
   * Latitude rotation: around X axis with constraint [-π/2, π/2]
   * Longitude rotation: around Y axis (unbounded)
   */
  const rotatePoint = (point, latRot, lonRot) => {
    let { x, y, z } = point;

    // Rotate around Y axis (longitude)
    const cosLon = Math.cos(lonRot);
    const sinLon = Math.sin(lonRot);
    const xTemp = x * cosLon - z * sinLon;
    const zTemp = x * sinLon + z * cosLon;
    x = xTemp;
    z = zTemp;

    // Rotate around X axis (latitude)
    const cosLat = Math.cos(latRot);
    const sinLat = Math.sin(latRot);
    const yTemp = y * cosLat - z * sinLat;
    const zTemp2 = y * sinLat + z * cosLat;
    y = yTemp;
    z = zTemp2;

    return { x, y, z };
  };

  /**
   * Draw with 5-layer rendering pipeline for visual clarity + data density
   */
  const render = (canvas) => {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const globeRadius = Math.min(centerX, centerY) * 0.4;

    // LAYER 0: Background gradient (premium dark gradient)
    const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, globeRadius + 80);
    bgGrad.addColorStop(0, "rgba(30, 41, 59, 0.8)");
    bgGrad.addColorStop(0.5, "rgba(15, 23, 42, 0.95)");
    bgGrad.addColorStop(1, "rgba(2, 6, 23, 1)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // LAYER 1: Wireframe globe (subtle grid)
    ctx.strokeStyle = "rgba(100, 180, 220, 0.08)";
    ctx.lineWidth = 0.5;

    // Latitude lines (horizontal)
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let isFirst = true;
      for (let lon = -180; lon <= 180; lon += 15) {
        const p3d = rotatePoint(latLonTo3D(lat, lon, 1), rotation.lat, rotation.lon);
        if (p3d.z > -0.3) {
          const sx = centerX + p3d.x * globeRadius;
          const sy = centerY - p3d.y * globeRadius;
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
    }

    // Longitude lines (vertical)
    for (let lon = -180; lon <= 180; lon += 30) {
      ctx.beginPath();
      let isFirst = true;
      for (let lat = -90; lat <= 90; lat += 15) {
        const p3d = rotatePoint(latLonTo3D(lat, lon, 1), rotation.lat, rotation.lon);
        if (p3d.z > -0.3) {
          const sx = centerX + p3d.x * globeRadius;
          const sy = centerY - p3d.y * globeRadius;
          if (isFirst) {
            ctx.moveTo(sx, sy);
            isFirst = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
      }
      ctx.stroke();
    }

    // LAYER 2: Relationship lines (advanced mode only, dashed, gradient)
    if (mode === "advanced" && dataLayers.connections.length > 0) {
      dataLayers.connections.forEach((conn) => {
        const src3d = rotatePoint(latLonTo3D(conn.source.lat, conn.source.lon, 1), rotation.lat, rotation.lon);
        const tgt3d = rotatePoint(latLonTo3D(conn.target.lat, conn.target.lon, 1), rotation.lat, rotation.lon);

        if (src3d.z > -0.4 && tgt3d.z > -0.4) {
          const sx = centerX + src3d.x * globeRadius;
          const sy = centerY - src3d.y * globeRadius;
          const tx = centerX + tgt3d.x * globeRadius;
          const ty = centerY - tgt3d.y * globeRadius;

          // Gradient line
          const lineGrad = ctx.createLinearGradient(sx, sy, tx, ty);
          const strength = Number(conn.strength || 0.7);
          lineGrad.addColorStop(0, `rgba(168, 85, 247, ${0.3 * strength})`);
          lineGrad.addColorStop(1, `rgba(249, 115, 22, ${0.3 * strength})`);
          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 1 + strength * 1.5;
          ctx.setLineDash([5, 4]);

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // LAYER 3: Forecast zones (advanced mode, subtle gold halos)
    if (mode === "advanced") {
      dataLayers.forecastZones.forEach((zone) => {
        const p3d = rotatePoint(latLonTo3D(zone.lat, zone.lon, 1), rotation.lat, rotation.lon);
        if (p3d.z > -0.4) {
          const sx = centerX + p3d.x * globeRadius;
          const sy = centerY - p3d.y * globeRadius;

          const forecastGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 45);
          forecastGlow.addColorStop(0, "rgba(217, 119, 6, 0.15)");
          forecastGlow.addColorStop(0.5, "rgba(217, 119, 6, 0.05)");
          forecastGlow.addColorStop(1, "rgba(217, 119, 6, 0)");
          ctx.fillStyle = forecastGlow;
          ctx.beginPath();
          ctx.arc(sx, sy, 45, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // LAYER 4: Tension Zones (orange blips + glows)
    dataLayers.tensionZones.forEach((zone) => {
      const p3d = rotatePoint(latLonTo3D(zone.lat, zone.lon, 1), rotation.lat, rotation.lon);
      if (p3d.z > -0.4) {
        const sx = centerX + p3d.x * globeRadius;
        const sy = centerY - p3d.y * globeRadius;
        const intensity = Number(zone.intensity || 0.7);

        // Tension halo (orange gradient)
        const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 32);
        haloGrad.addColorStop(0, `rgba(251, 146, 60, ${0.25 * intensity})`);
        haloGrad.addColorStop(0.6, `rgba(251, 146, 60, ${0.08 * intensity})`);
        haloGrad.addColorStop(1, "rgba(251, 146, 60, 0)");
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 32, 0, Math.PI * 2);
        ctx.fill();

        // Core marker (orange)
        ctx.fillStyle = "rgba(251, 146, 60, 0.9)";
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Subtle border
        ctx.strokeStyle = "rgba(251, 146, 60, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // LAYER 5: Breaking Events (red markers + confidence halos)
    dataLayers.breakingEvents.forEach((event) => {
      const p3d = rotatePoint(latLonTo3D(event.lat, event.lon, 1), rotation.lat, rotation.lon);
      if (p3d.z > -0.4) {
        const sx = centerX + p3d.x * globeRadius;
        const sy = centerY - p3d.y * globeRadius;
        const intensity = Number(event.intensity || 0.9);
        const confidence = Number(event.confidence || 0.8);

        // Confidence-scaled halo (red, sized by confidence + intensity)
        const haloRadius = 22 + confidence * 18;
        const haloGrad = ctx.createRadialGradient(sx, sy, 2, sx, sy, haloRadius);
        haloGrad.addColorStop(0, `rgba(244, 63, 94, ${0.35 * intensity})`);
        haloGrad.addColorStop(0.5, `rgba(244, 63, 94, ${0.15 * intensity})`);
        haloGrad.addColorStop(1, "rgba(244, 63, 94, 0)");
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core pulse (red)
        ctx.fillStyle = `rgba(244, 63, 94, ${0.85 + intensity * 0.15})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();

        // Confidence ring (inner, subtle)
        ctx.strokeStyle = `rgba(244, 63, 94, ${0.6 * confidence})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 9 + confidence * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // LAYER 6: Globe outline shine (premium effect)
    const shineGrad = ctx.createRadialGradient(
      centerX - globeRadius * 0.3,
      centerY - globeRadius * 0.3,
      0,
      centerX,
      centerY,
      globeRadius * 1.2
    );
    shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  // ─── EVENT HANDLERS ────────────────────────────────────────────────────

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setRotation((prev) => {
      const newLon = prev.lon + dx * 0.005;
      const newLat = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, prev.lat + dy * 0.005)
      );
      return { lat: newLat, lon: newLon };
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;

    setRotation((prev) => {
      const newLon = prev.lon + dx * 0.004;
      const newLat = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, prev.lat + dy * 0.004)
      );
      return { lat: newLat, lon: newLon };
    });

    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // ─── CANVAS LIFECYCLE & RENDERING ──────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Responsive canvas sizing
    const rect = canvas.parentElement?.getBoundingClientRect() || {
      width: 500,
      height: 500,
    };
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Animation frame loop
    const animate = () => {
      render(canvas);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [rotation, mode, worldState, dataLayers, hoveredEntity]);

  // ─── RENDER COMPONENT ──────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1",
        overflow: "hidden",
        borderRadius: "50%",
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
      />
    </div>
  );
}
