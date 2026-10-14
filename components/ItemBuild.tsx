"use client";

import {
  type MouseEvent as EventoReact,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
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

type Categoria = { escuro: string; claro: string; faixa: string };

/**
 * Cores do cartão da loja, medidas nos cartões do jogo.
 *
 * Não são as da paleta de interface da API: `armor_color` (#00ff99) e
 * `ap_currency_color` (#d8b8ff) são cores de destaque, muito mais saturadas
 * que o verde-oliva e o magenta que a loja usa de fato.
 */
const PALETA: Record<string, Categoria> = {
  weapon: { escuro: "#c17625", claro: "#cd8b24", faixa: "#7e6536" },
  vitality: { escuro: "#648324", claro: "#759729", faixa: "#526033" },
  spirit: { escuro: "#ae57a2", claro: "#c272ae", faixa: "#694163" },
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

/** Creme da interface do jogo (base_text), usado em nomes e valores. */
const CREME = "#ffefd7";
/** Cinza dos rótulos e do corpo do texto — tudo que não é destaque. */
const CINZA = "#cdcdcd";
/** Branco das palavras que o jogo realça dentro da descrição. */
const BRANCO = "#f8f8f8";
/** Cinza mais apagado: "Passive", "Conditional". */
const CINZA_ESCURO = "#a99f8e";
const VERDE_ALMA = "#99ffd5";

/**
 * Abaixo do título, todas as faixas são a mesma cor multiplicada para o preto.
 * As proporções foram medidas nos cartões do jogo e valem igual para as três
 * categorias — por isso uma cor por categoria basta.
 */
const BONUS = 100;
const CORPO = 92;
const RODAPE = 65;
const LINHA = 55;
const CAIXA = 44;
/** O caminho de melhoria fica mais apagado que o rodapé: é referência. */
const CAMINHO = 54;

const banda = (cor: string, pct: number) =>
  `color-mix(in srgb, ${cor} ${pct}%, #000000)`;

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

/**
 * Largura do cartão, usada para centralizá-lo e mantê-lo dentro da janela.
 * O cartão do jogo tem ~470px; estes 400 mantêm a mesma proporção de texto
 * sem ocupar meia tela numa lista de partidas.
 */
const LARGURA = 400;
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

  return (
    <ItemHover item={item} className="flex items-center justify-center">
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
          style={{ color: (PALETA[item.slot] ?? PALETA.weapon).claro }}
        >
          {item.name.charAt(0)}
        </span>
      )}
    </ItemHover>
  );
}

/**
 * Prende o cartão do item a qualquer elemento — o ícone de uma build, a linha
 * de uma troca sugerida, um item de lista. Quem chama decide o que é a área
 * sensível; aqui ficam só a abertura e o posicionamento.
 */
export function ItemHover({
  item,
  className,
  children,
}: {
  item: ItemView;
  className?: string;
  children: ReactNode;
}) {
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
      className={className}
      onMouseEnter={abrir}
      onMouseLeave={fechar}
    >
      {children}
      {pos && createPortal(<ItemCard item={item} pos={pos} />, document.body)}
    </span>
  );
}

/**
 * Cartão do item no hover, reproduzindo o da loja do jogo: faixa de título na
 * cor da categoria, bônus permanentes, linha de passivo/ativo com o cooldown
 * em selo, descrição, atributos em destaque e o caminho de melhoria.
 */
function ItemCard({ item, pos }: { item: ItemView; pos: Posicao }) {
  const { locale, t } = useI18n();
  const cat = PALETA[item.slot] ?? PALETA.weapon;
  const temPreco = item.cost > 0 && item.cost !== 9999;
  const cartao = useRef<HTMLSpanElement>(null);

  /*
   * A altura do cartão só se conhece depois de montado — varia de três linhas
   * a um cartão com atributos e caminho de melhoria. Aqui ela é medida para
   * prender o cartão dentro da janela; sem isso um cartão alto aberto para
   * cima perde o título acima da borda. Escrito direto no estilo para não
   * provocar um segundo render a cada hover.
   */
  useLayoutEffect(() => {
    const el = cartao.current;
    if (!el) return;
    const alto = el.offsetHeight;
    const topo = pos.acima ? pos.top - alto : pos.top;
    el.style.top = `${Math.max(Math.min(topo, window.innerHeight - alto - FOLGA), FOLGA)}px`;
  }, [pos]);

  const innate = item.sections
    .filter((s) => s.kind === "innate")
    .flatMap((s) => [...s.important, ...s.details]);
  const efeitos = item.sections.filter((s) => s.kind !== "innate");

  return (
    <span
      ref={cartao}
      className="grao pointer-events-none fixed z-50 flex flex-col overflow-hidden rounded-md text-left shadow-2xl"
      style={{
        left: pos.left,
        top: pos.top,
        width: LARGURA,
        background: banda(cat.faixa, CORPO),
        // O jogo desenha todo o texto do cartão com sombra. É ela que dá o
        // peso das letras — a Quicksand para no 700 e sem a sombra os números
        // ficam finos demais perto do original.
        textShadow: "0 1px 2px rgba(0,0,0,.45)",
      }}
    >
      {/* Faixa de título: cor cheia da categoria, clareando para a direita */}
      <span
        className="flex flex-col gap-1.5 px-4 py-3"
        style={{
          background: `linear-gradient(100deg, ${cat.escuro}, ${cat.claro})`,
        }}
      >
        <span
          className="text-[26px] font-bold leading-none"
          // A sombra é o que dá peso ao nome no cartão do jogo: a Quicksand
          // para no peso 700 e sozinha ela fica leve sobre a faixa colorida.
          style={{ color: CREME, textShadow: "0 2px 3px rgba(0,0,0,.4)" }}
        >
          {item.name}
        </span>
        {temPreco && (
          <span
            className="flex items-center gap-1.5 text-[18px] font-bold leading-none tabular-nums"
            style={{ color: VERDE_ALMA }}
          >
            <SoulIcon className="h-5 w-auto" />
            {item.cost.toLocaleString(locale === "pt" ? "pt-BR" : "en-US")}
          </span>
        )}
      </span>

      {/* Bônus permanentes */}
      {innate.length > 0 && (
        <span
          className="flex flex-col gap-1.5 px-4 py-3"
          style={{ background: banda(cat.faixa, BONUS) }}
        >
          {innate.map((stat) => (
            <Linha key={stat.label} stat={stat} />
          ))}
        </span>
      )}

      {efeitos.map((section, i) => (
        <Efeito
          key={i}
          section={section}
          cat={cat}
          activation={item.activation}
          t={t}
        />
      ))}

      {/* Descrição solta, quando o item não tem seção de efeito */}
      {efeitos.length === 0 && item.description && (
        <span
          className="px-4 py-3 text-[15px] leading-relaxed"
          style={{ color: CINZA }}
        >
          <Rich text={item.description} />
        </span>
      )}

      <Caminho
        rotulo={t.item.upgradesFrom}
        itens={item.upgradesFrom}
        cat={cat}
      />
      <Caminho rotulo={t.item.upgradesTo} itens={item.upgradesTo} cat={cat} />
    </span>
  );
}

/**
 * Linha de atributo fora das caixas. O valor vai em creme e negrito, o rótulo
 * em cinza e peso normal: é esse contraste — não o tamanho — que o jogo usa
 * para separar o número do que ele significa.
 */
function Linha({ stat }: { stat: ItemStat }) {
  return (
    <span className="flex items-baseline gap-2 text-[16px] leading-tight">
      <span className="font-bold tabular-nums" style={{ color: CREME }}>
        {stat.value}
      </span>
      <span style={{ color: CINZA }}>{stat.label}</span>
    </span>
  );
}

/**
 * Um lado do caminho de melhoria: de quais itens este vem, ou em quais ele
 * vira. Em duas colunas como no jogo. A maioria dos itens não tem nenhum dos
 * dois lados e a faixa simplesmente não aparece.
 */
function Caminho({
  rotulo,
  itens,
  cat,
}: {
  rotulo: string;
  itens: ItemRef[];
  cat: Categoria;
}) {
  if (itens.length === 0) return null;

  // Rótulo e nomes são apagados sobre a faixa, não brancos: no cartão do jogo
  // esta parte é referência, não a informação principal.
  const fundo = banda(cat.faixa, CAMINHO);
  return (
    <span
      className="flex flex-col gap-2 px-4 py-3"
      style={{ background: fundo }}
    >
      <span
        className="text-[11px] font-bold uppercase leading-none tracking-wider"
        style={{ color: `color-mix(in srgb, #ffffff 26%, ${fundo})` }}
      >
        {rotulo}:
      </span>
      <span className="grid grid-cols-2 gap-x-3 gap-y-2">
        {itens.map((alvo) => (
          <span key={alvo.id} className="flex items-center gap-2">
            {alvo.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={alvo.image}
                alt=""
                loading="lazy"
                className="size-6 shrink-0 rounded-[3px] object-contain"
              />
            )}
            <span
              className="text-[14px] font-bold leading-tight"
              style={{ color: `color-mix(in srgb, ${CREME} 58%, ${fundo})` }}
            >
              {alvo.name}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

function Efeito({
  section,
  cat,
  activation,
  t,
}: {
  section: ItemSection;
  cat: Categoria;
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
        className="flex items-center justify-between gap-2 px-4 py-2"
        style={{ background: banda(cat.faixa, LINHA) }}
      >
        <span className="text-[15px] italic" style={{ color: CINZA_ESCURO }}>
          {ehPassivo ? t.item.passive : t.item.active}
        </span>
        {cooldown && (
          <span
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[14px] font-bold tabular-nums"
            style={{ background: banda(cat.faixa, CAIXA), color: CREME }}
          >
            {cooldown.icon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cooldown.icon} alt="" className="size-3.5 opacity-90" />
            )}
            {cooldown.value}
          </span>
        )}
      </span>

      <span className="flex flex-col gap-3 px-4 py-3">
        {section.text && (
          <span className="text-[15px] leading-relaxed" style={{ color: CINZA }}>
            <Rich text={section.text} />
          </span>
        )}

        {section.important.length > 0 && (
          // As caixas dividem a largura em partes iguais, como no cartão do
          // jogo — uma caixa sozinha ocupando um terço ficaria desamparada.
          <span className="flex gap-2">
            {section.important.map((stat) => (
              <span
                key={stat.label}
                className="flex flex-1 flex-col items-center gap-1 rounded px-1.5 py-2 text-center"
                style={{ background: banda(cat.faixa, CAIXA) }}
              >
                <span className="flex items-center gap-1">
                  {stat.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={stat.icon} alt="" className="size-4" />
                  )}
                  <span className="text-[20px] font-bold leading-none tabular-nums text-white">
                    {stat.value}
                  </span>
                </span>
                <span
                  className="text-[13px] font-semibold leading-tight"
                  style={{
                    color: stat.cssClass
                      ? (STAT_COLOR[stat.cssClass] ?? CREME)
                      : CREME,
                  }}
                >
                  {stat.label}
                </span>
                {stat.conditional && (
                  <span
                    className="text-[12px] italic leading-none"
                    style={{ color: CINZA_ESCURO }}
                  >
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
          className="flex flex-col gap-1.5 px-4 py-3"
          style={{ background: banda(cat.faixa, RODAPE) }}
        >
          {rodape.map((stat) => (
            <Linha key={stat.label} stat={stat} />
          ))}
        </span>
      )}
    </>
  );
}

/**
 * Texto do jogo com os termos que ele realça. O destaque é o que carrega a
 * leitura do cartão: o corpo fica em cinza e só as palavras-chave vão a branco
 * e negrito — sem esse contraste a descrição vira um bloco uniforme.
 */
function Rich({ text }: { text: RichText }) {
  return (
    <>
      {text.map((parte, i) => {
        if (parte.highlight) {
          return (
            <span key={i} className="font-bold" style={{ color: BRANCO }}>
              {parte.text}
            </span>
          );
        }
        if (parte.dim) {
          return (
            <span key={i} style={{ color: CINZA_ESCURO }}>
              {parte.text}
            </span>
          );
        }
        return <span key={i}>{parte.text}</span>;
      })}
    </>
  );
}
