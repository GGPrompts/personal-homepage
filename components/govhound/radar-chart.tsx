"use client";

/**
 * Lightweight SVG radar/spider chart for go/no-go criteria visualization.
 * No external dependencies required.
 */

interface RadarDataPoint {
  label: string;
  value: number; // 0-5 scale
  maxValue?: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
}

export function RadarChart({ data, size = 240 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.38;
  const levels = 5;

  if (data.length < 3) return null;

  const angleStep = (2 * Math.PI) / data.length;
  // Start from top (-PI/2)
  const startAngle = -Math.PI / 2;

  function getPoint(index: number, radius: number): [number, number] {
    const angle = startAngle + index * angleStep;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  // Grid rings
  const gridRings = Array.from({ length: levels }, (_, i) => {
    const r = (maxRadius * (i + 1)) / levels;
    const points = data
      .map((_, j) => getPoint(j, r))
      .map(([x, y]) => `${x},${y}`)
      .join(" ");
    return points;
  });

  // Axis lines
  const axes = data.map((_, i) => {
    const [x, y] = getPoint(i, maxRadius);
    return { x1: cx, y1: cy, x2: x, y2: y };
  });

  // Data polygon
  const dataPoints = data.map((d, i) => {
    const maxVal = d.maxValue || 5;
    const normalizedRadius = (d.value / maxVal) * maxRadius;
    return getPoint(i, normalizedRadius);
  });
  const dataPolygon = dataPoints
    .map(([x, y]) => `${x},${y}`)
    .join(" ");

  // Labels
  const labelPositions = data.map((d, i) => {
    const labelRadius = maxRadius + 20;
    const [x, y] = getPoint(i, labelRadius);
    return { x, y, label: d.label, value: d.value };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="mx-auto"
    >
      {/* Grid rings */}
      {gridRings.map((points, i) => (
        <polygon
          key={`ring-${i}`}
          points={points}
          fill="none"
          stroke="hsla(210, 40%, 60%, 0.12)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axes.map((axis, i) => (
        <line
          key={`axis-${i}`}
          x1={axis.x1}
          y1={axis.y1}
          x2={axis.x2}
          y2={axis.y2}
          stroke="hsla(210, 40%, 60%, 0.12)"
          strokeWidth="1"
        />
      ))}

      {/* Data fill */}
      <polygon
        points={dataPolygon}
        fill="hsla(209, 100%, 56%, 0.15)"
        stroke="#2491ff"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map(([x, y], i) => (
        <circle
          key={`point-${i}`}
          cx={x}
          cy={y}
          r="3"
          fill="#2491ff"
          stroke="#0d1b2a"
          strokeWidth="1.5"
        />
      ))}

      {/* Labels */}
      {labelPositions.map((pos, i) => {
        // Determine text-anchor based on position
        const angle = startAngle + i * angleStep;
        const normalizedAngle =
          ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        let anchor: "start" | "middle" | "end" = "middle";
        if (normalizedAngle > 0.3 && normalizedAngle < Math.PI - 0.3) {
          anchor = "start";
        } else if (
          normalizedAngle > Math.PI + 0.3 &&
          normalizedAngle < 2 * Math.PI - 0.3
        ) {
          anchor = "end";
        }

        // Truncate long labels
        const shortLabel =
          pos.label.length > 14
            ? pos.label.substring(0, 12) + "..."
            : pos.label;

        return (
          <text
            key={`label-${i}`}
            x={pos.x}
            y={pos.y}
            textAnchor={anchor}
            dominantBaseline="central"
            className="fill-text-tertiary"
            fontSize="9"
          >
            {shortLabel}
          </text>
        );
      })}
    </svg>
  );
}
