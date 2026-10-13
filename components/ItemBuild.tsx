import type { ItemView } from "@/lib/api";

/** Cores oficiais das categorias de item (de /v1/assets/colors). */
const SLOT_COLOR: Record<string, string> = {
  weapon: "#e58a00", // weapon_color_bright
  vitality: "#00ff99", // armor_color
  spirit: "#d8b8ff", // ap_currency_color
};

const SLOT_LABEL: Record<string, string> = {
  weapon: "Weapon",
  vitality: "Vitality",
  spirit: "Spirit",
};

/**
 * Build final do jogador. Os nomes ficam em inglês de propósito: é como a
 * comunidade e o próprio jogo se referem aos itens.
 */
export default function ItemBuild({
  items,
  compact = false,
}: {
  items: ItemView[];
  compact?: boolean;
}) {
  if (items.length === 0) {
    return compact ? null : <div className="w-[164px] shrink-0" />;
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-[2px]"
          : "flex w-[164px] shrink-0 flex-wrap content-center gap-[3px]"
      }
    >
      {items.map((item) => {
        const color = SLOT_COLOR[item.slot] ?? "#aeaa94";
        return (
          <span key={item.id} className="group/item relative">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                className={`${compact ? "size-[19px]" : "size-[23px]"} rounded border bg-bg/60 object-contain`}
                style={{ borderColor: `${color}80` }}
              />
            ) : (
              <span
                className={`flex ${compact ? "size-[19px]" : "size-[23px]"} items-center justify-center rounded border bg-bg/60 text-[10px] font-bold`}
                style={{ borderColor: `${color}80`, color }}
              >
                {item.name.charAt(0)}
              </span>
            )}

            {/* Tooltip em CSS puro: mantém a linha como Server Component. */}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-bg px-2 py-1 text-[11px] shadow-xl group-hover/item:block">
              <span className="font-semibold text-ink">{item.name}</span>
              <span className="ml-1.5" style={{ color }}>
                {SLOT_LABEL[item.slot] ?? item.slot} T{item.tier}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
