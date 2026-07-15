import { forwardRef } from "react";
import type { FixtureSpec, FloorPlan } from "../../shared/floorplan";

type Props = {
  floorPlan: FloorPlan;
};

const areaPalette: Record<string, string> = {
  dining: "#dfe8e3",
  terrace: "#f0dbb0",
  bar: "#d7dde1",
  kitchen: "#d2d8dd",
  restrooms: "#cfd6dc",
  storage: "#dad7cf",
  entry: "#e8dfcf",
  other: "#e5e1d8"
};

export const FloorPlanSvg = forwardRef<SVGSVGElement, Props>(function FloorPlanSvg({ floorPlan }, forwardedRef) {
  return (
    <svg
      ref={forwardedRef}
      className="floorplan-svg"
      viewBox={`0 0 ${floorPlan.canvas.width} ${floorPlan.canvas.height}`}
      role="img"
      aria-label={floorPlan.title}
    >
      <defs>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#33423c" floodOpacity="0.18" />
        </filter>
        <pattern id="tile-pattern" width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill="#f5efe4" />
          <path d="M0 0H56V56H0Z" fill="none" stroke="#e0d1b9" strokeWidth="3" />
          <rect width="28" height="28" fill="#f0c76f" opacity="0.35" />
          <rect x="28" y="28" width="28" height="28" fill="#f0c76f" opacity="0.35" />
        </pattern>
        <radialGradient id="plant-gradient">
          <stop offset="0%" stopColor="#90a66b" />
          <stop offset="100%" stopColor="#4f6d4c" />
        </radialGradient>
      </defs>

      <rect width={floorPlan.canvas.width} height={floorPlan.canvas.height} rx="36" fill="#ebe4da" />
      <rect x="56" y="56" width={floorPlan.canvas.width - 112} height={floorPlan.canvas.height - 112} rx="24" fill="#d8d5cc" />

      {floorPlan.areas.map((area) => (
        <polygon
          key={area.id}
          points={area.points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill={area.kind === "terrace" ? "url(#tile-pattern)" : area.color || areaPalette[area.kind]}
          stroke="#c9c1b6"
          strokeWidth="4"
        />
      ))}

      {floorPlan.walls.map((wall) => (
        <polyline
          key={wall.id}
          points={wall.points.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="#8c8f89"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={wall.thickness ?? 12}
        />
      ))}

      {floorPlan.fixtures.map((fixture) => (
        <Fixture key={fixture.id} fixture={fixture} />
      ))}
    </svg>
  );
});

function Fixture({ fixture }: { fixture: FixtureSpec }) {
  const transform = `rotate(${fixture.rotation ?? 0} ${fixture.x + fixture.width / 2} ${fixture.y + fixture.height / 2})`;

  if (fixture.kind === "plant") {
    return (
      <g transform={transform}>
        <ellipse cx={fixture.x + fixture.width / 2} cy={fixture.y + fixture.height / 2} rx={fixture.width / 2} ry={fixture.height / 2} fill="url(#plant-gradient)" opacity="0.82" />
        <circle cx={fixture.x + fixture.width * 0.38} cy={fixture.y + fixture.height * 0.42} r={fixture.width * 0.18} fill="#718a57" opacity="0.8" />
        <circle cx={fixture.x + fixture.width * 0.58} cy={fixture.y + fixture.height * 0.36} r={fixture.width * 0.16} fill="#99ad77" opacity="0.75" />
      </g>
    );
  }

  const fill = fixture.kind === "bar" || fixture.kind === "counter" ? "#b78f62" : fixture.kind === "restroom" ? "#eef1f4" : "#c7b79e";

  return (
    <g transform={transform}>
      <rect
        x={fixture.x}
        y={fixture.y}
        width={fixture.width}
        height={fixture.height}
        rx="12"
        fill={fill}
        stroke="#937b5f"
        strokeWidth="4"
        filter="url(#soft-shadow)"
      />
      <text x={fixture.x + fixture.width / 2} y={fixture.y + fixture.height / 2 + 6} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4f514d">
        {fixture.label}
      </text>
    </g>
  );
}
