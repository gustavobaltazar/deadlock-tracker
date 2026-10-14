"use client";

import {
  type MouseEvent as EventoReact,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "./I18nProvider";
import SoulIcon from "./SoulIcon";
import type {
  ItemRef,
  ItemSection,
  ItemStat,
  ItemView,
  RichText,
} from "@/lib/api";

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

/** Largura do cartão, usada para centralizá-lo e mantê-lo dentro da janela. */
const LARGURA = 320;
/** Folga entre o ícone e o cartão, e entre o cartão e a borda da janela. */
const FOLGA = 8;

type Posicao = { left: number; top: number; acima: boolean };

/**
 * Só um cartão fica aberto por vez. O controle é global porque o `mouseleave`
 * de um ícone não é garantido: rolar a página tira o ícone de baixo do cursor
 * sem disparar evento nenhum nele, e o ícone seguinte abriria o seu cartão com
 * o anterior ainda na tela.
 */
let fecharAberto: (() => void) | null = null;

function ItemIcon({ item, compact }: { item: ItemView; compact: boolean }) {
  const size = compact ? "size-[19px]" : "size-6";
  const ancora = useRef<HTMLSpanElement>(null);
  const cursor = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState<Posicao | null>(null);

  const esconder = useCallback(() => setPos(null), []);

  const fechar = useCallback(() => {
    esconder();
    if (fecharAberto === esconder) fecharAberto = null;
  }, [esconder]);

  /**
   * O cartão é posicionado em coordenadas de janela porque vive num portal:
   * dentro da árvore ele seria recortado pelos contêineres com `overflow-hidden`
   * (a caixa de cada time, por exemplo) e pelas bordas da lista.
   */
  const posicionar = useCallback(() => {
    const el = ancora.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const acima = r.top >= window.innerHeight - r.bottom;
    const centro = r.left + r.width / 2 - LARGURA / 2;
    setPos({
      left: Math.min(
        Math.max(centro, FOLGA),
        window.innerWidth - LARGURA - FOLGA,
      ),
      top: acima ? r.top - FOLGA : r.bottom + FOLGA,
      acima,
    });
  }, []);

  const abrir = useCallback(
    (e: EventoReact) => {
      cursor.current = { x: e.clientX, y: e.clientY };
      if (fecharAberto && fecharAberto !== esconder) fecharAberto();
      fecharAberto = esconder;
      posicionar();
    },
    [esconder, posicionar],
  );

  /*
   * Com o cartão aberto, a posição é fixa na janela e precisa acompanhar o
   * scroll e o redimensionamento. Antes disso vem a pergunta que o navegador
   * não responde sozinho: o ícone ainda está sob o cursor? Se o scroll o levou
   * embora, o cartão fecha — é esse o caso em que o `mouseleave` não dispara.
   */
  const aberto = pos !== null;
  useEffect(() => {
    if (!aberto) return;

    const mover = (e: MouseEvent) => {
      cursor.current = { x: e.clientX, y: e.clientY };
    };
    const revisar = () => {
      const r = ancora.current?.getBoundingClientRect();
      const { x, y } = cursor.current;
      if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) {
        fechar();
      } else {
        posicionar();
      }
    };

    window.addEventListener("mousemove", mover, { passive: true });
    window.addEventListener("scroll", revisar, true);
    window.addEventListener("resize", revisar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("scroll", revisar, true);
      window.removeEventListener("resize", revisar);
    };
  }, [aberto, fechar, posicionar]);

  // Recolher o detalhe da partida desmonta o ícone com o cartão aberto, e aí
  // também não há `mouseleave` para avisar.
  useEffect(() => fechar, [fechar]);

  return (
    <span
      ref={ancora}
      className="relative flex items-center justify-center"
      onMouseEnter={abrir}
      onMouseLeave={fechar}
    >
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

      {pos && createPortal(<ItemCard item={item} pos={pos} />, document.body)}
    </span>
  );
}

/**
 * Cartão do item no hover, reproduzindo o da loja do jogo: faixa de título na
 * cor da categoria, bônus permanentes, linha de passivo/ativo com o cooldown
 * em selo, descrição e os atributos em destaque.
 */
function ItemCard({ item, pos }: { item: ItemView; pos: Posicao }) {
  const { locale, t } = useI18n();
  const cor = SLOT_COLOR[item.slot] ?? "#aeaa94";
  const temPreco = item.cost > 0 && item.cost !== 9999;

  const innate = item.sections
    .filter((s) => s.kind === "innate")
    .flatMap((s) => [...s.important, ...s.details]);
  const efeitos = item.sections.filter((s) => s.kind !== "innate");

  return (
    <span
      className={
        "grao pointer-events-none fixed z-50 flex flex-col overflow-hidden rounded-md text-left shadow-2xl " +
        (pos.acima ? "-translate-y-full" : "")
      }
      style={{
        left: pos.left,
        top: pos.top,
        width: LARGURA,
        background: faixa(cor, 36),
      }}
    >
      {/* Faixa de título, na cor cheia da categoria */}
      <span
        className="flex flex-col gap-0.5 px-3.5 py-2.5"
        style={{ background: `linear-gradient(135deg, ${cor}, ${faixa(cor, 86)})` }}
      >
        <span
          className="text-[21px] font-bold leading-tight"
          // A sombra é o que dá peso ao nome no cartão do jogo: a Quicksand
          // para no peso 700 e sozinha ela fica leve sobre a faixa colorida.
          style={{ color: TEXTO, textShadow: "0 2px 2px rgba(0,0,0,.35)" }}
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

      <Caminho
        rotulo={t.item.upgradesFrom}
        itens={item.upgradesFrom}
        cor={cor}
      />
      <Caminho rotulo={t.item.upgradesTo} itens={item.upgradesTo} cor={cor} />
    </span>
  );
}

/**
 * Um lado do caminho de melhoria: de quais itens este vem, ou em quais ele
 * vira. A maioria dos itens não tem nenhum dos dois e a faixa simplesmente
 * não aparece.
 */
function Caminho({
  rotulo,
  itens,
  cor,
}: {
  rotulo: string;
  itens: ItemRef[];
  cor: string;
}) {
  if (itens.length === 0) return null;

  return (
    <span
      className="flex flex-col gap-1.5 px-3.5 py-2"
      style={{ background: faixa(cor, 22) }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#cdcdcd]">
        {rotulo}
      </span>
      {itens.map((ref) => (
        <span key={ref.id} className="flex items-center gap-2">
          {ref.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ref.image}
              alt=""
              loading="lazy"
              className="size-5 shrink-0 rounded-[3px] object-contain"
            />
          )}
          <span className="text-[12px] font-semibold" style={{ color: TEXTO }}>
            {ref.name}
          </span>
        </span>
      ))}
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
