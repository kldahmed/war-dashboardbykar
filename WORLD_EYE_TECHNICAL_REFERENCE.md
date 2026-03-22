# World Eye Implementation — Technical Reference Guide

## Quick Start

### Viewing the World Eye Interface
1. Navigate to **World Eye** page
2. See the eye-shaped interface with globe inside
3. **Drag to rotate** the globe (left/right = longitude, up/down = latitude)
4. **Toggle mode** (simplified ↔ advanced) to change data visualization density

### Important Files
- **Component**: [src/components/GlobeVisualization.jsx](src/components/GlobeVisualization.jsx) — 680-line rendering engine
- **Container**: [src/components/EyeViewer.jsx](src/components/EyeViewer.jsx) — Eye frame styling
- **Page**: [src/pages/WorldEyePage.jsx](src/pages/WorldEyePage.jsx) — Integration point
- **Data**: [api/live-intake.js](api/live-intake.js) — Source governance system

---

## API Reference

### GlobeVisualization Component

```jsx
<GlobeVisualization 
  worldState={worldState}        // Required: from worldStateEngine
  feedStatus={feedStatus}        // Optional: feed health metrics
  language="ar"                  // Optional: language (default: ar)
  mode="advanced"                // Optional: "simplified" | "advanced"
  hoveredEntity={null}           // Optional: highlight entity
/>
```

#### Data Flow — worldState Structure Required
```javascript
worldState: {
  strategicSummary: {
    topGlobalEvents: [
      {
        region: "Middle East",
        title: "Crisis Title",
        confidence: 0.85,  // Used for halo sizing
        urgency: "high",
        summary: "Event description"
      },
      // ... up to 10 events in advanced mode
    ],
    regionsWithHighestTension: [
      "Middle East",      // Rendered as orange tension markers
      "Ukraine",
      // ... up to 8 regions in advanced mode
    ],
    likelyNext72Hours: "Description mentioning regions",  // Forecast zones
    forecastKey: "monitoring" | "escalating" | "resolving"
  },
  strategicCausalLinks: [       // Advanced mode only
    {
      source: "Middle East",     // Must match REGION_COORDS key
      target: "Europe",
      strength: 0.75,            // Line width & opacity scaling
      type: "causal" | "influence",
      explanation: "Link reason"
    }
  ],
  strategicGlobalRisk: {
    level: "HIGH" | "MODERATE" | "LOW",
    confidence: 0.8
  }
}
```

#### Mode Comparison

| Feature | Simplified | Advanced |
|---------|-----------|----------|
| Breaking Events | 5 | 10 |
| Tension Zones | 4 | 8 |
| Causal Links | ✗ | ✓ (4-8) |
| Forecast Zones | ✗ | ✓ |
| Halo Details | Basic | Confidence-scaled |
| Visual Complexity | Low | High |
| Use Case | Quick scan | Investigation |

---

## Color Legend

### Visual Markers on Globe

| Color | Component | Meaning | Intensity |
|-------|-----------|---------|-----------|
| 🔴 Red | Breaking Event | Urgent, high-priority incident | 0.85-1.0 |
| 🟠 Orange | Tension Zone | Regional stability risk | 0.6-0.8 |
| 🟡 Gold (Adv) | Forecast Zone | 72h outlook target | 0.4 |
| 💜 Purple (Adv) | Causal Link | Relationship/consequence | strength-scaled |
| 🔵 Blue | Wireframe | Geographic reference grid | 0.08 opacity |

### Halo System

**Breaking Events (Red)**:
- **Halo Radius**: 22px + (confidence × 18)
  - 0.6 confidence → 32px
  - 0.8 confidence → 36px
  - 1.0 confidence → 40px
- **Halo Opacity**: 0.35 × intensity (max 0.35 at 1.0 intensity)
- **Inner Ring**: Confidence indicator (0.6 × confidence opacity)

**Tension Zones (Orange)**:
- **Halo Radius**: Fixed 32px
- **Halo Opacity**: 0.25 × intensity (max 0.25)
- **Core Marker**: 5px solid orange

**Forecast Zones (Gold, Advanced)**:
- **Halo Radius**: 45px
- **Halo Opacity**: Subtle gradient (0.15 → 0)
- **Purpose**: Predictive outlook visualization

---

## Interaction Guide

### Mouse/Trackpad
| Action | Behavior |
|--------|----------|
| Drag Left/Right | Rotate longitude (unbounded) |
| Drag Up/Down | Rotate latitude (clamped to ±90°) |
| Release | Immediate stop (no momentum) |
| Cursor | "grab" (idle) → "grabbing" (dragging) |

### Touch (Mobile/Tablet)
| Action | Behavior |
|--------|----------|
| Single-finger drag left/right | Rotate longitude |
| Single-finger drag up/down | Rotate latitude (±90° constraint) |
| Multi-touch (2+ fingers) | Ignored (single-touch only) |
| Release | Immediate stop |

### Sensitivity Settings
- **Mouse**: 0.005 radians per pixel
- **Touch**: 0.004 radians per pixel
- **Adjustment**: Edit `handleMouseMove()` / `handleTouchMove()` sensitivity multiplier (0.005 / 0.004)

### Rotation Constraints
```javascript
// Latitude is clamped: cannot rotate further than north/south poles
newLat = Math.max(-π/2, Math.min(π/2, currentLat + deltaLat))

// Longitude is unbounded: can rotate 360°+ naturally
newLon = currentLon + deltaLon  // wraps seamlessly
```

---

## Geographic Database Reference

### Supported Regions (REGION_COORDS)
The following regions are mapped and can display data points:

| Region | Latitude | Longitude |
|--------|----------|-----------|
| Middle East | 25° | 45° |
| Ukraine | 49° | 31° |
| Taiwan | 23.7° | 120.9° |
| South China Sea | 12° | 115° |
| Russia | 61° | 105° |
| Iran | 32° | 54° |
| North Korea | 40° | 127° |
| Gaza | 31.9° | 34.4° |
| Syria | 34.8° | 38.8° |
| Yemen | 15.4° | 48.5° |
| India | 20° | 78° |
| Pakistan | 30° | 69° |
| Afghanistan | 34° | 67° |
| Europe | 50° | 15° |
| USA | 40° | -95° |
| China | 35° | 105° |
| Japan | 36° | 138° |
| Korea | 37° | 127° |
| Southeast Asia | 15° | 105° |

### Adding New Regions
Edit REGION_COORDS in GlobeVisualization.jsx:
```javascript
const REGION_COORDS = useMemo(() => ({
  // ... existing regions
  "New Region": [latitude, longitude],
}), []);
```

---

## 3D Mathematics Explanation

### Coordinate Systems

**Geographic (Lat/Lon)**:
- Latitude: -90° (south pole) to +90° (north pole)
- Longitude: -180° to +180° (or 0° to 360°)

**3D Cartesian (Unit Sphere)**:
```
x = cos(lat) × cos(lon)   // East-West
y = sin(lat)              // Up-Down
z = cos(lat) × sin(lon)   // Front-Back
```

**Screen Projection**:
```
screenX = centerX + p.x × globeRadius
screenY = centerY - p.y × globeRadius   // Y inverted
visibility = p.z > -0.4  (front hemisphere + margin)
```

### Rotation Transforms

**Y-axis rotation (Longitude)**:
```javascript
newX = x × cos(θ) - z × sin(θ)
newZ = x × sin(θ) + z × cos(θ)
```

**X-axis rotation (Latitude)**:
```javascript
newY = y × cos(φ) - z × sin(φ)
newZ = y × sin(φ) + z × cos(φ)
```

### Visibility Culling
```javascript
// Only render markers on front hemisphere (facing user)
if (rotatedPoint.z > -0.4) {  // -0.4 extends visibility slightly
  render(marker)
}
```

---

## Rendering Pipeline Details

### Layer Rendering Order

1. **Background** — Radial gradient (slate → dark slate → near black)
2. **Wireframe** — 30° latitude/longitude grid lines (subtle blue, 0.08 opacity)
3. **Connections** — Causal link dashed lines (purple→orange gradient, adv only)
4. **Forecast Zones** — Gold halos for 72h outlook targets (adv only)
5. **Tension Zones** — Orange blips with gradient halos (always visible)
6. **Breaking Events** — Red markers with confidence-scaled halos (always visible)
7. **Shine Effect** — Subtle white glow on globe outline (premium lighting)

### Rendering Code Structure
```javascript
// Pseudo-code rendering sequence
render(canvas) {
  ctx.clearRect()  // 1. Erase previous frame
  
  // LAYER 0
  drawBackgroundGradient()
  
  // LAYER 1
  drawWireframeGrid()
  
  // LAYERS 2-6 (conditionally)
  if (mode === 'advanced') drawConnections()
  if (mode === 'advanced') drawForecastZones()
  dataLayers.tensionZones.forEach(drawTensionZone)
  dataLayers.breakingEvents.forEach(drawBreakingEvent)
  
  // LAYER 7
  drawShineGlow()
}
```

---

## Performance Optimization

### Canvas Configuration
- **Resolution**: Responsive (matches parent BoundingClientRect)
- **Context**: 2D (CPU-side rendering, no GPU acceleration)
- **Refresh Rate**: 60fps (requestAnimationFrame)

### Optimization Techniques Used
1. **Visibility Culling**: Skip rendering if z < -0.4
2. **Early Exit**: Only iterate over visible layers based on mode
3. **Math Library**: None (pure JavaScript, no Gsap/Three.js)
4. **Reflow Prevention**: Set canvas.width/height once per resize

### Potential Improvements
- Pre-compute rotation matrices (if rotation updates frequently)
- Use OffscreenCanvas for multi-threaded rendering
- Cache gradient objects instead of creating per-frame
- Batch draw calls (use fewer ctx.stroke/fill operations)

---

## Debugging Guide

### Check Data Flow
```javascript
// In browser console, on WorldEyePage:
console.log(worldState.strategicSummary.topGlobalEvents)
console.log(worldState.strategicCausalLinks)
console.log(dataLayers)  // Not directly accessible, but check rendering
```

### Verify Rendering
```javascript
// Canvas rendering indicators
- Background gradient visible? → Canvas context OK
- Wireframe grid visible? → 3D math OK
- Red/orange markers visible? → Data mapping OK
- Halos visible? → Canvas gradients OK
```

### Test Interaction
```javascript
- Drag left/right: should rotate globe
- Drag up/down: should rotate up to ±90°
- Check browser console for no errors
```

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No globe visible | worldState null | Check subscription in WorldEyePage |
| Markers not appearing | Region not in REGION_COORDS | Add region to database |
| Halos too small | Confidence score < 0.6 | Check event.confidence value |
| Rotation stuck | Latitude clamped at ±90° | Expected behavior (poles) |
| Touch not working | touchAction not configured | Verify "touchAction": "none" in style |

---

## Config Options

### Available Props
```jsx
<GlobeVisualization
  worldState={...}        // REQUIRED
  feedStatus={...}        // Optional (not currently used in rendering)
  language="ar"           // Optional (default: "ar", not used in current version)
  mode="advanced"         // Optional ("simplified" | "advanced", default: "simplified")
  hoveredEntity={null}    // Optional (prepared for future entity highlighting)
/>
```

### Sensitivity Values (Easy Tuning)
```javascript
// In handleMouseMove():
setRotation(prev => {
  const scale = 0.005;  // Change this: 0.003 = slower, 0.010 = faster
  const newLon = prev.lon + dx * scale
  return { lat: newLat, lon: newLon }
})

// In handleTouchMove():
const scale = 0.004;  // Touch typically 20% slower than mouse
```

### Visual Tweaks
```javascript
// In render() function:
const globeRadius = Math.min(centerX, centerY) * 0.4  // Change: 0.3 = smaller, 0.5 = larger
const haloRadius = 22 + confidence * 18  // Halo sizing
const visitibilityThreshold = -0.4  // How far back to render (higher = less clipping)
```

---

## Deployment Checklist

- [x] Component compiles (no TypeScript/JSX errors)
- [x] Data structure validated (worldState required props verified)
- [x] Rendering tested (all 7 layers appear)
- [x] Interaction tested (mouse/touch rotation works)
- [x] Mode switching tested (simplified ↔ advanced)
- [x] Mobile responsive (canvas resizes properly)
- [x] Performance acceptable (60fps on modern devices)
- [ ] Live data testing (connect to production worldStateEngine)
- [ ] A/B testing (simplified mode adoption)
- [ ] Analytics tracking (interaction patterns)

---

## Future Enhancement Ideas

1. **Entity Search** — Filter and highlight specific regions/events
2. **Time Scrubbing** — Drag timeline to view historical snapshots
3. **Event Tooltips** — Hover markers to show event summary
4. **Export** — Screenshot globe state or generate report
5. **Animation** — Smooth camera transitions between regions of interest
6. **Sound Design** — Brief audio cue for new breaking events
7. **Heatmap Overlay** — Color intensity across globe based on global risk
8. **Connection Exploration** — Click links to expand causal chain

---

**Document Version**: 1.0  
**Last Updated**: [Today]  
**Technology Stack**: React 18 + Canvas 2D + Pure JavaScript Math  
**Status**: Production Ready ✅
