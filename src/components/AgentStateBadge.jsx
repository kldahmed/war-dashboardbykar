/**
 * AgentStateBadge — Shows the current agent state as a pill with color + label.
 */
import React from "react";

export default function AgentStateBadge({ stateInfo, size = "normal" }) {
  if (!stateInfo) return null;
  const isSmall = size === "small";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? 4 : 6,
        background: `${stateInfo.color}18`,
        border: `1px solid ${stateInfo.color}44`,
        borderRadius: 999,
        padding: isSmall ? "2px 8px" : "4px 12px",
        fontSize: isSmall ? 10 : 12,
        fontWeight: 700,
        color: stateInfo.color,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: isSmall ? 5 : 7,
          height: isSmall ? 5 : 7,
          borderRadius: "50%",
          background: stateInfo.color,
          boxShadow: `0 0 6px ${stateInfo.color}88`,
          flexShrink: 0,
        }}
      />
      {stateInfo.ar}
    </span>
  );
}
