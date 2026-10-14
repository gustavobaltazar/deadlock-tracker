"use client";

import { useI18n } from "./I18nProvider";
import SoulIcon from "./SoulIcon";
import type { ItemSection, ItemStat, ItemView, RichText } from "@/lib/api";

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
 * Cor de cada família de atributo, seguindo o jogo: dano e cadência puxam para
 * o laranja de arma, cura e vida para o verde, dano de spirit para o roxo. O
 * resto (cooldown, alcance, deslocamento) fica neutro.
 */
const STAT_COLOR: Record<string, string> = {
  fire_rate: "#e58a00",
  bullet_damage: "#e58a00",
  bullet_armor_up: "#e58a00",
  bullet_armor_down: "#e58a00",
  melee_damage: "#e58a00",
  damage: "#e58a00",
  healing: "#69e799",
  health: "#69e799",
  combat_barrier: "#69e799",
  tech_damage: "#d8b8ff",
  tech_armor_up: "#d8b8ff",
  tech_armor_down: "#d8b8ff",
};

function corDoStat(stat: ItemStat): string | undefined {
  return stat.cssClass ? STAT_COLOR[stat.cssClass] : undefined;
}

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
 * Cartão do item no hover, no formato da loja do jogo: faixa superior na cor
 * da categoria com nome e preço, bônus permanentes logo abaixo, e então o
 * efeito do item com os atributos em destaque.
 *
 * Em CSS puro (sem estado) para que a lista de partidas não precise virar um
 * componente controlado só por causa do hover.
 */
function ItemCard({ item }: { item: ItemView }) {
  const { locale, t } = useI18n();
  const color = SLOT_COLOR[item.slot] ?? "#aeaa94";
  const temPreco = item.cost > 0 && item.cost !== 9999;

  const innate = item.sections.filter((s) => s.kind === "innate");
  const efeitos = item.sections.filter((s) => s.kind !== "innate");

  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-[300px] -translate-x-1/2 flex-col overflow-hidden rounded-md text-left shadow-2xl group-hover/item:flex"
      style={{ background: "#1a1713", border: `1px solid ${color}33` }}
    >
      {/* Faixa do título, na cor da categoria */}
      <span
        className="flex flex-col gap-1 px-3 py-2.5"
        style={{ background: `linear-gradient(160deg, ${color}, ${color}99)` }}
      >
        <span className="text-base font-extrabold leading-tight text-[#1a1713]">
          {item.name}
        </span>
        {temPreco && (
          // O jogo mostra o preço em verde, mesmo sobre a faixa colorida.
          <span
            className="flex items-center gap-1.5 text-sm font-extrabold tabular-nums"
            style={{ color: "#163d2a" }}
          >
            <SoulIcon className="h-3.5 w-auto" />
            {item.cost.toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
          </span>
        )}
      </span>

      {/* Bônus permanentes */}
      {innate.flatMap((s) => [...s.important, ...s.details]).length > 0 && (
        <span className="flex flex-col gap-0.5 bg-black/20 px-3 py-2">
          {innate
            .flatMap((s) => [...s.important, ...s.details])
            .map((stat) => (
              <span key={stat.label} className="flex items-baseline gap-2 text-[13px]">
                <span className="font-bold text-ink">{stat.value}</span>
                <span className="text-muted">{stat.label}</span>
              </span>
            ))}
        </span>
      )}

      {efeitos.map((section, i) => (
        <Efeito key={i} section={section} color={color} activation={item.activation} t={t} />
      ))}

      {/* Descrição solta, quando o item não tem seção de efeito */}
      {efeitos.length === 0 && item.description && (
        <span className="px-3 py-2.5 text-[11px] leading-snug text-eggshell">
          <Rich text={item.description} color={color} />
        </span>
      )}
    </span>
  );
}

function Efeito({
  section,
  color,
  activation,
  t,
}: {
  section: ItemSection;
  color: string;
  activation: string | null;
  t: { item: { passive: string; active: string } };
}) {
  // O cooldown vira um selo no canto, como no jogo; o resto fica no rodapé.
  const cooldown = section.details.find((s) => s.cssClass === "cooldown");
  const rodape = section.details.filter((s) => s.cssClass !== "cooldown");
  const ehPassivo = section.kind === "passive" || activation === "passive";

  return (
    <>
      <span className="flex items-center justify-between gap-2 border-y border-white/5 bg-black/10 px-3 py-1.5">
        <span className="text-xs italic text-muted">
          {ehPassivo ? t.item.passive : t.item.active}
        </span>
        {cooldown && (
          <span className="flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink">
            {cooldown.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cooldown.icon} alt="" className="size-3 opacity-80" />
            )}
            {cooldown.value}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-2.5 px-3 py-2.5">
        {section.text && (
          <span className="text-[11px] leading-relaxed text-eggshell">
            <Rich text={section.text} color={color} />
          </span>
        )}

        {section.important.length > 0 && (
          <span className="grid grid-cols-3 gap-1">
            {section.important.map((stat) => (
              <span
                key={stat.label}
                className="flex flex-col items-center gap-0.5 rounded bg-white/5 px-1.5 py-1.5 text-center"
              >
                <span className="flex items-center gap-1">
                  {stat.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stat.icon} alt="" className="size-3.5" />
                  )}
                  <span className="text-sm font-extrabold tabular-nums text-ink">
                    {stat.value}
                  </span>
                </span>
                <span
                  className="text-[10px] font-semibold leading-tight"
                  style={{ color: corDoStat(stat) ?? "#ffefd7" }}
                >
                  {stat.label}
                </span>
                {stat.conditional && (
                  <span className="text-[9px] italic leading-none text-muted">
                    Conditional
                  </span>
                )}
              </span>
            ))}
          </span>
        )}

        {rodape.length > 0 && (
          <span className="flex flex-col gap-0.5">
            {rodape.map((stat) => (
              <span key={stat.label} className="flex items-baseline gap-2 text-[11px]">
                <span className="font-bold text-ink">{stat.value}</span>
                <span className="text-muted">{stat.label}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </>
  );
}

/** Renderiza o texto do jogo preservando os termos que ele realça. */
function Rich({ text, color }: { text: RichText; color: string }) {
  return (
    <>
      {text.map((parte, i) =>
        parte.highlight ? (
          <span key={i} className="font-bold text-ink">
            {parte.text}
          </span>
        ) : (
          <span key={i}>{parte.text}</span>
        ),
      )}
    </>
  );
}
