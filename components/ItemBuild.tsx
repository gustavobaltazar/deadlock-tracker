"use client";

import { useI18n } from "./I18nProvider";
import SoulIcon from "./SoulIcon";
import type { ItemSection, ItemView, RichText } from "@/lib/api";

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
 * Build final do jogador, em grade de 6 colunas como a loja do jogo.
 *
 * Os ícones não levam moldura: a arte de cada item já vem com o fundo na cor
 * da categoria, então uma borda colorida só duplicaria a informação.
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
          ? "grid grid-cols-6 gap-[2px]"
          : "grid w-[164px] shrink-0 grid-cols-6 content-center gap-1"
      }
    >
      {items.map((item) => (
        <ItemIcon key={item.id} item={item} compact={compact} />
      ))}
    </div>
  );
}

function ItemIcon({ item, compact }: { item: ItemView; compact: boolean }) {
  const size = compact ? "size-[19px]" : "size-6";

  return (
    <span className="group/item relative flex items-center justify-center">
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className={`${size} rounded-[3px] object-contain`}
        />
      ) : (
        <span
          className={`flex ${size} items-center justify-center rounded-[3px] bg-surface-2 text-[10px] font-bold`}
          style={{ color: SLOT_COLOR[item.slot] ?? "#aeaa94" }}
        >
          {item.name.charAt(0)}
        </span>
      )}

      <ItemCard item={item} />
    </span>
  );
}

/**
 * Cartão do item no hover, no formato da loja do jogo: faixa superior na cor da
 * categoria, com ícone, nome e preço; abaixo, os atributos e o que o item faz.
 *
 * Em CSS puro (sem estado) para que a lista de partidas não precise virar um
 * componente controlado só por causa do hover.
 */
function ItemCard({ item }: { item: ItemView }) {
  const { locale, t } = useI18n();
  const color = SLOT_COLOR[item.slot] ?? "#aeaa94";
  const temPreco = item.cost > 0 && item.cost !== 9999;

  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-[272px] -translate-x-1/2 flex-col overflow-hidden rounded-md border border-border bg-surface text-left shadow-2xl group-hover/item:flex">
      <span
        className="flex items-center gap-2.5 p-2.5"
        style={{ background: `linear-gradient(135deg, ${color}2e, transparent)` }}
      >
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt=""
            className="size-10 shrink-0 rounded-[3px] object-contain"
          />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-bold leading-tight text-ink">
            {item.name}
          </span>
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
            <span style={{ color }}>
              {SLOT_LABEL[item.slot] ?? item.slot} · T{item.tier}
            </span>
            <span className="text-muted">
              {item.activation === "passive" ? t.item.passive : t.item.active}
            </span>
          </span>
        </span>
        {temPreco && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums text-souls">
            <SoulIcon className="h-3 w-auto" />
            {item.cost.toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-2 border-t border-border p-2.5">
        {item.description && (
          <span className="text-[11px] leading-snug text-eggshell">
            <Rich text={item.description} color={color} />
          </span>
        )}
        {item.sections.map((section, i) => (
          <Section key={i} section={section} color={color} />
        ))}
      </span>
    </span>
  );
}

function Section({ section, color }: { section: ItemSection; color: string }) {
  return (
    <span className="flex flex-col gap-1">
      {section.text && (
        <span className="text-[11px] leading-snug text-eggshell">
          <Rich text={section.text} color={color} />
        </span>
      )}
      {section.stats.length > 0 && (
        <span className="flex flex-col">
          {section.stats.map((stat) => (
            <span
              key={stat.label + stat.value}
              className="flex items-baseline justify-between gap-3 border-b border-border/40 py-[3px] text-[11px] last:border-0"
            >
              <span className="text-muted">{stat.label}</span>
              <span
                className={
                  "shrink-0 tabular-nums " +
                  (stat.important ? "font-bold" : "font-semibold text-ink")
                }
                style={stat.important ? { color } : undefined}
              >
                {stat.value}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** Renderiza o texto do jogo preservando os termos que ele realça. */
function Rich({ text, color }: { text: RichText; color: string }) {
  return (
    <>
      {text.map((parte, i) =>
        parte.highlight ? (
          <span key={i} className="font-semibold" style={{ color }}>
            {parte.text}
          </span>
        ) : (
          <span key={i}>{parte.text}</span>
        ),
      )}
    </>
  );
}
