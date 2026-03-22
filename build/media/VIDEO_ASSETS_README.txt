Drop optional video assets here for cinematic background playback:

- command-surface.webm
- command-surface.mp4

Used by:
- src/pages/OverviewPage.jsx (motion deck primary media)

Behavior:
- If either video is available and decodable, it auto-plays muted/loop/inline.
- If unavailable or decoding fails, UI automatically falls back to ops-motion-poster.svg.
