import React from "react";

interface ConfigurationDiagramSvgProps {
  code: string;
}

/**
 * Parses architectural configuration strings such as "3-3-0", "4-1-3", "6-3-3", "7-0-7"
 * into [totalPanels, leftStack, rightStack] and draws a clean architectural elevation diagram.
 */
function parsePanelCounts(code: string): { total: number; left: number; right: number } {
  const parts = (code || "")
    .split(/[^0-9]+/)
    .map((p) => parseInt(p, 10))
    .filter((n) => Number.isFinite(n));

  if (parts.length >= 3) {
    const total = Math.max(2, Math.min(8, parts[0]));
    return {
      total,
      left: Math.min(total, Math.max(0, parts[1])),
      right: Math.min(total, Math.max(0, parts[2])),
    };
  }
  if (parts.length === 2) {
    const total = Math.max(2, Math.min(8, parts[0]));
    return { total, left: parts[1], right: Math.max(0, total - parts[1]) };
  }
  return { total: 4, left: 2, right: 2 };
}

export default function ConfigurationDiagramSvg({ code }: ConfigurationDiagramSvgProps) {
  const { total, left, right } = parsePanelCounts(code);

  const leafWidth = 24;
  const paddingX = 12;
  const topY = 14;
  const height = 74;
  const width = total * leafWidth + paddingX * 2;
  const bottomY = topY + height;

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < total; i += 1) {
    const x1 = paddingX + i * leafWidth;
    const x2 = x1 + leafWidth;
    const isFoldedLeft = i < left && left > 0;
    const isFoldedRight = !isFoldedLeft && total - i <= right && right > 0;

    // Slight perspective fold zig-zag effect matching architectural CAD symbols
    const offsetTop = isFoldedLeft
      ? (i % 2 === 0 ? 4 : -2)
      : isFoldedRight
      ? (i % 2 === 0 ? -2 : 4)
      : 0;

    elements.push(
      <g key={i}>
        <polygon
          points={`${x1},${topY} ${x2},${topY + offsetTop} ${x2},${bottomY - offsetTop} ${x1},${bottomY}`}
          fill="#FFFFFF"
          stroke="#475569"
          strokeWidth={1.1}
        />
        {/* Inner glass glazing rebate line */}
        <line
          x1={x1 + 3}
          y1={topY + 4}
          x2={x1 + 3}
          y2={bottomY - 4}
          stroke="#CBD5E1"
          strokeWidth={0.8}
        />
        {/* Folding direction chevron hint */}
        {isFoldedLeft && (
          <path
            d={`M ${x1 + leafWidth * 0.65} ${topY + height * 0.42} L ${
              x1 + leafWidth * 0.35
            } ${topY + height * 0.5} L ${x1 + leafWidth * 0.65} ${topY + height * 0.58}`}
            fill="none"
            stroke="#3393B8"
            strokeWidth={1}
          />
        )}
        {isFoldedRight && (
          <path
            d={`M ${x1 + leafWidth * 0.35} ${topY + height * 0.42} L ${
              x1 + leafWidth * 0.65
            } ${topY + height * 0.5} L ${x1 + leafWidth * 0.35} ${topY + height * 0.58}`}
            fill="none"
            stroke="#3393B8"
            strokeWidth={1}
          />
        )}
      </g>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-2 px-3 py-2">
      <svg
        width={width}
        height={height + 28}
        viewBox={`0 0 ${width} ${height + 28}`}
        className="overflow-visible"
        role="img"
        aria-label={`Panel configuration diagram ${code}`}
      >
        {/* Outer architectural frame box */}
        <rect
          x={paddingX - 4}
          y={topY - 5}
          width={total * leafWidth + 8}
          height={height + 10}
          fill="#F8FAFC"
          stroke="#334155"
          strokeWidth={1.4}
        />
        {elements}
      </svg>
      <span className="text-xs font-semibold text-slate-700 tracking-wide tabular-nums">
        {code}
      </span>
    </div>
  );
}
