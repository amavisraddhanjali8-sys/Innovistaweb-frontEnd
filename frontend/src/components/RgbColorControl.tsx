import { useEffect, useId, useMemo, useState } from "react";
import {
  QUICK_ARCHITECTURAL_SWATCHES,
  clampByte,
  formatRgbString,
  normalizeHexColor,
  parseColorInput,
  rgbToHex,
  type RgbColor,
} from "../../../shared/heroThemeHelpers";

interface RgbColorControlProps {
  id?: string;
  label: string;
  value: string;
  onChange: (nextHex: string) => void;
  compact?: boolean;
  showSwatches?: boolean;
}

export default function RgbColorControl({
  id,
  label,
  value,
  onChange,
  compact = false,
  showSwatches = false,
}: RgbColorControlProps) {
  const autoId = useId();
  const baseId = id || `rgb-ctrl-${autoId}`;

  const hex = useMemo(() => normalizeHexColor(value, "#3393B8"), [value]);
  const rgb: RgbColor = useMemo(
    () => parseColorInput(hex) || { r: 51, g: 147, b: 184 },
    [hex]
  );

  const [textDraft, setTextDraft] = useState<string>(formatRgbString(rgb));
  const [isFocused, setIsFocused] = useState(false);
  const [invalidCode, setInvalidCode] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setTextDraft(formatRgbString(rgb));
      setInvalidCode(false);
    }
  }, [rgb, isFocused]);

  const handleChannelChange = (channel: keyof RgbColor, rawVal: string) => {
    const parsedNum = rawVal === "" ? 0 : Number(rawVal);
    if (!Number.isFinite(parsedNum)) return;
    const nextRgb: RgbColor = {
      ...rgb,
      [channel]: clampByte(parsedNum, rgb[channel]),
    };
    const nextHex = rgbToHex(nextRgb);
    setTextDraft(formatRgbString(nextRgb));
    setInvalidCode(false);
    onChange(nextHex);
  };

  const handleCodeChange = (rawInput: string) => {
    setTextDraft(rawInput);
    const parsed = parseColorInput(rawInput);
    if (parsed) {
      setInvalidCode(false);
      onChange(rgbToHex(parsed));
    } else {
      setInvalidCode(rawInput.trim().length > 0);
    }
  };

  const handleCodeBlur = () => {
    setIsFocused(false);
    const parsed = parseColorInput(textDraft);
    if (parsed) {
      const nextHex = rgbToHex(parsed);
      setTextDraft(formatRgbString(parsed));
      setInvalidCode(false);
      onChange(nextHex);
    } else {
      setTextDraft(formatRgbString(rgb));
      setInvalidCode(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label
          htmlFor={`${baseId}-code`}
          className="text-xs font-bold text-slate-800 tracking-tight"
        >
          {label}
        </label>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
            {hex}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 overflow-hidden cursor-pointer shrink-0 shadow-xs">
          <input
            type="color"
            aria-label={`${label} color picker`}
            value={hex}
            onChange={(e) => onChange(normalizeHexColor(e.target.value, hex))}
            className="absolute -inset-2 w-14 h-14 cursor-pointer border-0 p-0 bg-transparent"
          />
        </label>

        <input
          id={`${baseId}-code`}
          type="text"
          aria-label={`${label} code`}
          value={textDraft}
          onFocus={() => setIsFocused(true)}
          onBlur={handleCodeBlur}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="rgb(51, 147, 184) / #3393B8"
          className={`flex-1 min-w-0 h-9 px-2.5 rounded-lg border text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white focus:outline-none transition-colors ${
            invalidCode
              ? "border-amber-400 focus:border-amber-500"
              : "border-slate-200 focus:border-[#3393B8]"
          }`}
        />
      </div>

      {/* Numeric RGB Channel Inputs (0 - 255) */}
      <div className={`grid grid-cols-3 gap-1.5 ${compact ? "pt-0.5" : "pt-1"}`}>
        {(
          [
            { key: "r", short: "R", full: "Red", tint: "text-rose-700" },
            { key: "g", short: "G", full: "Green", tint: "text-emerald-700" },
            { key: "b", short: "B", full: "Blue", tint: "text-sky-700" },
          ] as const
        ).map((ch) => (
          <div
            key={ch.key}
            className="flex items-center min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-1 focus-within:border-[#3393B8] focus-within:bg-white"
          >
            <span
              className={`text-[11px] font-bold mr-1 select-none shrink-0 ${ch.tint}`}
            >
              {ch.short}
            </span>
            <input
              type="number"
              min={0}
              max={255}
              step={1}
              aria-label={`${label} ${ch.full} channel`}
              value={rgb[ch.key]}
              onChange={(e) => handleChannelChange(ch.key, e.target.value)}
              className="w-full min-w-0 bg-transparent text-xs font-mono font-semibold text-slate-900 tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        ))}
      </div>

      {showSwatches && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {QUICK_ARCHITECTURAL_SWATCHES.map((swatch) => {
            const isSelected = hex === swatch.hex.toUpperCase();
            return (
              <button
                key={swatch.hex}
                type="button"
                title={`${swatch.label} (${swatch.hex})`}
                aria-label={`${label}: ${swatch.label}`}
                onClick={() => onChange(swatch.hex)}
                style={{ backgroundColor: swatch.hex }}
                className={`w-5 h-5 rounded-md border cursor-pointer transition-transform hover:scale-110 ${
                  isSelected
                    ? "ring-2 ring-[#22577A] ring-offset-1 border-white"
                    : "border-slate-300"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
