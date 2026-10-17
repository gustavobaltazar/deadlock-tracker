"use client";

import { useRef } from "react";

/**
 * Barra de vida de jogo de luta.
 *
 * Três camadas: o rastro (claro), a vida e a barreira. Quando a vida cai, o
 * rastro segura no valor anterior por um instante e depois escorre até a vida
 * atual — o "pedaço" que você acabou de perder fica visível. A barra é
 * redesenhada a cada quadro da luta, então o rastro é calculado aqui, pelo
 * relógio, e não por transição de CSS (que reiniciaria a cada quadro).
 */
export default function HpBar({
  hp,
  max,
  barrier = 0,
  color,
  size = "md",
  showText = true,
}: {
  hp: number;
  max: number;
  barrier?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const ghost = useRef({ value: hp, holdUntil: 0, last: 0 });
  const now = typeof performance === "undefined" ? 0 : performance.now();
  const g = ghost.current;
  const dt = g.last ? Math.min((now - g.last) / 1000, 0.1) : 0;
  g.last = now;

  if (hp >= g.value) {
    g.value = hp;
    g.holdUntil = 0;
  } else if (g.holdUntil === 0) {
    // Começou a perder vida: o pedaço perdido fica parado por um instante.
    g.holdUntil = now + 380;
  } else if (now >= g.holdUntil) {
    g.value = Math.max(hp, g.value - Math.max(max * 0.45, (g.value - hp) * 3) * dt);
    if (g.value <= hp) g.holdUntil = 0;
  }

  const total = Math.max(max, hp + barrier);
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / total) * 100))}%`;
  const ratio = hp / max;
  const low = ratio < 0.3;
  const fill = low ? "#e04b3f" : (color ?? "#69e799");
  const height = size === "lg" ? "h-5" : size === "sm" ? "h-2.5" : "h-3.5";
  // Uma marca a cada 250 de vida, como no jogo.
  const tick = Math.max(4, (250 / total) * 100);

  return (
    <div className="w-full">
      <div
        className={`relative w-full overflow-hidden rounded-sm border border-black/60 bg-black/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] ${height}`}
      >
        <div className="absolute inset-y-0 left-0 bg-[#fff3c4]" style={{ width: pct(g.value) }} />
        <div
          className={"absolute inset-y-0 left-0 " + (low ? "tower-low" : "")}
          style={{
            width: pct(hp),
            background: `linear-gradient(180deg, color-mix(in srgb, ${fill} 75%, white) 0%, ${fill} 45%, color-mix(in srgb, ${fill} 70%, black) 100%)`,
          }}
        />
        {barrier > 0 && (
          <div
            className="absolute inset-y-0 bg-[#dfe8ff]/90"
            style={{ left: pct(hp), width: pct(barrier) }}
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(${tick}% - 1px), rgba(0,0,0,0.7) calc(${tick}% - 1px) ${tick}%)`,
          }}
        />
      </div>
      {showText && (
        <div className="mt-0.5 flex justify-between text-[10px] font-bold tabular-nums text-eggshell">
          <span>
            {Math.ceil(hp)}
            {barrier >= 1 && <span className="text-[#bcd0ff]"> +{Math.round(barrier)}</span>}
          </span>
          <span className="text-muted">{Math.round(max)}</span>
        </div>
      )}
    </div>
  );
}
