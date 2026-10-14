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

/**
 * Cor de cada família de atributo, seguindo o jogo: dano e cadência puxam para
 * o laranja de arma, cura e vida para o verde, dano de spirit para o roxo.
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

/** Base escura sobre a qual a cor da categoria é diluída. */
const BASE = "#241c16";
/** Tom de texto do jogo (base_text) e o verde das almas. */
const TEXTO = "#ffefd7";
const VERDE_ALMA = "#99ffd5";

/**
 * O modal do jogo não usa cinza: cada faixa é a cor da categoria do item
 * diluída em diferentes intensidades sobre um fundo escuro. As proporções
 * abaixo foram medidas do modal original.
 */
const faixa = (cor: string, pct: number) =>
  `color-mix(in srgb, ${cor} ${pct}%, ${BASE})`;

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
 * Cartão do item no hover, reproduzindo o da loja do jogo: faixa de título na
 * cor da categoria, bônus permanentes, linha de passivo/ativo com o cooldown
 * em selo, descrição e os atributos em destaque.
 *
 * Em CSS puro (sem estado) para que a lista de partidas não precise virar um
 * componente controlado só por causa do hover.
 */
function ItemCard({ item }: { item: ItemView }) {
  const { locale, t } = useI18n();
  const cor = SLOT_COLOR[item.slot] ?? "#aeaa94";
  const temPreco = item.cost > 0 && item.cost !== 9999;

  const innate = item.sections
    .filter((s) => s.kind === "innate")
    .flatMap((s) => [...s.important, ...s.details]);
  const efeitos = item.sections.filter((s) => s.kind !== "innate");

  return (
    <span
      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-[320px] -translate-x-1/2 flex-col overflow-hidden rounded-md text-left shadow-2xl group-hover/item:flex"
      style={{ background: faixa(cor, 36) }}
    >
      {/* Faixa de título, na cor cheia da categoria */}
      <span
        className="flex flex-col gap-0.5 px-3.5 py-2.5"
        style={{ background: `linear-gradient(135deg, ${cor}, ${faixa(cor, 86)})` }}
      >
        <span
          className="text-[17px] font-extrabold leading-tight"
          style={{ color: TEXTO }}
        >
          {item.name}
        </span>
        {temPreco && (
          <span
            className="flex items-center gap-1.5 text-[15px] font-bold tabular-nums"
            style={{ color: VERDE_ALMA }}
          >
            <SoulIcon className="h-3.5 w-auto" />
            {item.cost.toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
          </span>
        )}
      </span>

      {/* Bônus permanentes */}
      {innate.length > 0 && (
        <span
          className="flex flex-col gap-0.5 px-3.5 py-2"
          style={{ background: faixa(cor, 40) }}
        >
          {innate.map((stat) => (
            <span key={stat.label} className="flex items-baseline gap-2 text-[13px]">
              <span className="font-bold" style={{ color: TEXTO }}>
                {stat.value}
              </span>
              <span className="text-[#cdcdcd]">{stat.label}</span>
            </span>
          ))}
        </span>
      )}

      {efeitos.map((section, i) => (
        <Efeito
          key={i}
          section={section}
          cor={cor}
          activation={item.activation}
          t={t}
        />
      ))}

      {/* Descrição solta, quando o item não tem seção de efeito */}
      {efeitos.length === 0 && item.description && (
        <span className="px-3.5 py-2.5 text-[12px] leading-relaxed text-[#f8f8f8]">
          <Rich text={item.description} />
        </span>
      )}
    </span>
  );
}

function Efeito({
  section,
  cor,
  activation,
  t,
}: {
  section: ItemSection;
  cor: string;
  activation: string | null;
  t: { item: { passive: string; active: string } };
}) {
  // O cooldown vira um selo no canto, como no jogo; o resto fica no rodapé.
  const cooldown = section.details.find((s) => s.cssClass === "cooldown");
  const rodape = section.details.filter((s) => s.cssClass !== "cooldown");
  const ehPassivo = section.kind === "passive" || activation === "passive";

  return (
    <>
      <span
        className="flex items-center justify-between gap-2 px-3.5 py-1.5"
        style={{ background: faixa(cor, 18) }}
      >
        <span className="text-[13px] italic text-[#cdcdcd]">
          {ehPassivo ? t.item.passive : t.item.active}
        </span>
        {cooldown && (
          <span
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-bold tabular-nums"
            style={{ background: faixa(cor, 10), color: TEXTO }}
          >
            {cooldown.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cooldown.icon} alt="" className="size-3 opacity-90" />
            )}
            {cooldown.value}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-2.5 px-3.5 py-2.5">
        {section.text && (
          <span className="text-[12px] leading-relaxed text-[#f8f8f8]">
            <Rich text={section.text} />
          </span>
        )}

        {section.important.length > 0 && (
          <span className="grid grid-cols-3 gap-1.5">
            {section.important.map((stat) => (
              <span
                key={stat.label}
                className="flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-center"
                style={{ background: faixa(cor, 12) }}
              >
                <span className="flex items-center gap-1">
                  {stat.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stat.icon} alt="" className="size-3.5" />
                  )}
                  <span className="text-[15px] font-extrabold tabular-nums text-white">
                    {stat.value}
                  </span>
                </span>
                <span
                  className="text-[11px] font-semibold leading-tight"
                  style={{ color: stat.cssClass ? STAT_COLOR[stat.cssClass] ?? TEXTO : TEXTO }}
                >
                  {stat.label}
                </span>
                {stat.conditional && (
                  <span className="text-[10px] italic leading-none text-[#a99f8e]">
                    Conditional
                  </span>
                )}
              </span>
            ))}
          </span>
        )}
      </span>

      {rodape.length > 0 && (
        <span
          className="flex flex-col gap-0.5 px-3.5 py-2"
          style={{ background: faixa(cor, 22) }}
        >
          {rodape.map((stat) => (
            <span key={stat.label} className="flex items-baseline gap-2 text-[13px]">
              <span className="font-bold" style={{ color: TEXTO }}>
                {stat.value}
              </span>
              <span className="text-[#cdcdcd]">{stat.label}</span>
            </span>
          ))}
        </span>
      )}
    </>
  );
}

/** Renderiza o texto do jogo preservando os termos que ele realça. */
function Rich({ text }: { text: RichText }) {
  return (
    <>
      {text.map((parte, i) =>
        parte.highlight ? (
          <span key={i} className="font-bold text-white">
            {parte.text}
          </span>
        ) : (
          <span key={i}>{parte.text}</span>
        ),
      )}
    </>
  );
}
