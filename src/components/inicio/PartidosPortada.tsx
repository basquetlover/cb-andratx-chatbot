
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  DiaPartidosPortada,
  EquipoPartidoPortada,
  PartidoPortada,
  PeriodoPartidosPortada,
} from "@tipos/PartidoPortada";

interface Propiedades {
  datos: PeriodoPartidosPortada;
  mostrarCabecera?: boolean;
  tituloId?: string;
}

const COLORES = {
  azulOscuro: "#003650",
  azulProfundo: "#002B45",
  amarillo: "#FFD21E",
  amarilloClaro: "#FFF4A3",
};

const IMAGENES = {
  marcoEscudo: "/img/marco-escudo.png",
  fondoPartido: "/img/fondo-partido.png",
  escudoClub: "/favicon.svg",
};

function convertirFecha(fecha: string): Date {
  return new Date(`${fecha}T12:00:00`);
}

function formatearFecha(
  fecha: string,
  opciones: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    ...opciones,
  }).format(convertirFecha(fecha));
}

function numeroDia(fecha: string): string {
  return formatearFecha(fecha, { day: "2-digit" });
}

function mesNumero(fecha: string): string {
  return formatearFecha(fecha, { month: "2-digit" });
}

function mesCorto(fecha: string): string {
  return formatearFecha(fecha, { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function diaSemana(fecha: string): string {
  return formatearFecha(fecha, { weekday: "long" })
    .toUpperCase();
}

function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);

  if (palabras.length === 0) return "—";
  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase();
  }

  return (
    palabras[0][0] +
    palabras[palabras.length - 1][0]
  ).toUpperCase();
}

function construirDias(
  datos: PeriodoPartidosPortada,
): DiaPartidosPortada[] {
  const grupos = new Map<string, PartidoPortada[]>();

  for (const partido of datos.partidos) {
    const lista = grupos.get(partido.fecha) ?? [];
    lista.push(partido);
    grupos.set(partido.fecha, lista);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, partidos]) => ({
      fecha,
      esHoy: fecha === datos.fechaActual,
      partidos: [...partidos].sort((a, b) =>
        (a.hora ?? "23:59").localeCompare(
          b.hora ?? "23:59",
        ),
      ),
    }));
}

function obtenerFechaReferencia(
  dias: DiaPartidosPortada[],
  fechaActual: string,
): string | null {
  if (dias.length === 0) return null;

  const hoy = dias.find((dia) => dia.fecha === fechaActual);
  if (hoy) return hoy.fecha;

  const siguiente = dias.find(
    (dia) => dia.fecha > fechaActual,
  );

  return siguiente?.fecha ?? dias[dias.length - 1].fecha;
}

function IconoUbicacion({
  size = 15,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconoCasa({ fuera }: { fuera: boolean }) {
  if (fuera) return <IconoUbicacion size={14} />;

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3Z" />
    </svg>
  );
}

function IconoFlecha({
  direccion,
}: {
  direccion: "izquierda" | "derecha";
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direccion === "derecha" ? (
        <path d="m9 18 6-6-6-6" />
      ) : (
        <path d="m15 18-6-6 6-6" />
      )}
    </svg>
  );
}

/*
 * Escudo idéntico en estructura al generador:
 * logo del rival detrás + marco PNG original encima.
 */
function EscudoRival({
  equipo,
}: {
  equipo: EquipoPartidoPortada;
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [equipo.escudo]);

  return (
    <div
      className="relative flex h-[78px] w-[78px] shrink-0 items-center justify-center"
      aria-label={`Escudo de ${equipo.nombre}`}
    >
      <div className="absolute inset-[10%] flex items-center justify-center overflow-hidden rounded-full bg-white">
        {equipo.escudo && !error ? (
          <img
            src={equipo.escudo}
            alt={equipo.nombre}
            width={65}
            height={65}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain p-[5px]"
            onError={() => setError(true)}
          />
        ) : (
          <span className="text-center text-xs font-black text-[#003650]">
            {iniciales(equipo.nombre)}
          </span>
        )}
      </div>

      <img
        src={IMAGENES.marcoEscudo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full select-none object-contain"
      />
    </div>
  );
}

function EtiquetaEstado({
  partido,
}: {
  partido: PartidoPortada;
}) {
  const estados = {
    "en-juego": {
      texto: "EN JUEGO",
      fondo: "#EF233C",
      color: "#FFFFFF",
    },
    finalizado: {
      texto: "FINALIZADO",
      fondo: "#E2E7ED",
      color: "#003650",
    },
    aplazado: {
      texto: "APLAZADO",
      fondo: "#EF233C",
      color: "#FFFFFF",
    },
    programado: {
      texto: "PROGRAMADO",
      fondo: "#A7DDFC",
      color: "#003650",
    },
  };

  const estado = estados[partido.estado];

  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-[9px] font-black tracking-wide"
      style={{
        backgroundColor: estado.fondo,
        color: estado.color,
      }}
    >
      {estado.texto}
    </span>
  );
}

/*
 * TARJETA DE PARTIDO
 *
 * [ FECHA ] [ EQUIPO CBA ] [ ESCUDO + RIVAL ]
 *                              [ UBICACIÓN ]
 *
 * Mantiene siempre la distribución horizontal.
 */
function PartidoTarjeta({
  partido,
}: {
  partido: PartidoPortada;
}) {
  const esLocal = partido.equipoLocal.esClub;
  const esVisitante = partido.equipoVisitante.esClub;

  const equipoClub = esLocal
    ? partido.equipoLocal
    : esVisitante
      ? partido.equipoVisitante
      : partido.equipoLocal;

  const rival = esLocal
    ? partido.equipoVisitante
    : esVisitante
      ? partido.equipoLocal
      : partido.equipoVisitante;

  const fuera = !esLocal && esVisitante;

  const tieneResultado =
    partido.puntosLocal !== null &&
    partido.puntosVisitante !== null &&
    (partido.estado === "finalizado" ||
      partido.estado === "en-juego");

  const puntosClub = esLocal
    ? partido.puntosLocal
    : partido.puntosVisitante;

  const puntosRival = esLocal
    ? partido.puntosVisitante
    : partido.puntosLocal;

  return (
    <article className="relative isolate overflow-hidden rounded-[18px] border-2 border-white/90 text-white shadow-[0_5px_14px_rgba(0,28,55,0.19)]">
      {/* Fondo original del generador */}
      <img
        src={IMAGENES.fondoPartido}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Franja amarilla derecha */}
      <div
        className="absolute inset-y-0 right-0 z-20 w-[5px]"
        style={{ backgroundColor: COLORES.amarillo }}
        aria-hidden="true"
      />

      <div className="relative z-10 px-3.5 py-3.5 pr-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black"
            style={{
              backgroundColor: COLORES.amarillo,
              color: COLORES.azulProfundo,
            }}
          >
            <IconoCasa fuera={fuera} />
            {fuera ? "FUERA" : "CASA"}
          </span>

          <EtiquetaEstado partido={partido} />
        </div>

        
{/* CUATRO COLUMNAS HORIZONTALES */}
<div className="grid grid-cols-[82px_minmax(0,1fr)_60px_minmax(0,1.35fr)] items-center gap-2.5">
  {/* COLUMNA 1: FECHA Y HORA */}
  <div className="flex h-full flex-col items-center justify-center border-r border-white/25 pr-2 text-center">
    <span className="text-[19px] font-black italic leading-none">
      {numeroDia(partido.fecha)}
      <span className="text-sm">/</span>
      {mesNumero(partido.fecha)}
    </span>

    <span
      className="mt-2 text-[19px] font-black italic leading-none tabular-nums"
      style={{ color: COLORES.amarillo }}
    >
      {partido.hora ?? "--:--"}
    </span>
  </div>

  {/* COLUMNA 2: EQUIPO ANDRATX */}
  <div className="flex h-full min-w-0 items-center justify-center px-1 text-center">
    <p className="break-words text-[16px] font-black uppercase italic leading-[1.08] tracking-tight">
      {equipoClub.nombre}
    </p>
  </div>

  {/* COLUMNA 3: VS / RESULTADO */}
  <div className="flex h-full items-center justify-center text-center">
    <span
      className={`font-black italic leading-none ${
        tieneResultado ? "text-[15px]" : "text-[21px]"
      }`}
      style={{ color: COLORES.amarilloClaro }}
    >
      {tieneResultado
        ? `${puntosClub} - ${puntosRival}`
        : partido.estado === "aplazado"
          ? "—"
          : "VS"}
    </span>
  </div>

  {/* COLUMNA 4: ESCUDO, RIVAL Y UBICACIÓN */}
  <div className="flex min-w-0 items-center gap-2.5">
    <EscudoRival equipo={rival} />

    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
      <p className="break-words text-[15px] font-black uppercase italic leading-[1.08] tracking-tight">
        {rival.nombre}
      </p>

      
    </div>
  </div>
</div>


        {(partido.jornada || partido.enlaceFbib) && (
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/20 pt-2.5">
            <span className="text-[10px] font-semibold text-white/70">
              {partido.jornada ?? ""}
            </span>

            {partido.ubicacion && (
        <p
          className="flex items-start gap-1.5 text-[11px] font-bold uppercase leading-tight"
          style={{ color: COLORES.amarilloClaro }}
        >
          <IconoUbicacion size={13} />

          <span className="min-w-0 break-words">
            {partido.ubicacion}
          </span>
        </p>
      )}

            {partido.enlaceFbib && (
              <a
                href={partido.enlaceFbib}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-white/85 underline decoration-white/30 underline-offset-2 transition-colors hover:text-[#FFD21E]"
              >
                Ver en FBIB
              </a>
            )}
          </footer>
        )}
      </div>
    </article>
  );
}

function ColumnaDia({
  dia,
  referencia,
}: {
  dia: DiaPartidosPortada;
  referencia: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <header
        className="relative overflow-hidden rounded-xl border border-white/50 px-4 py-3 text-center shadow-sm"
        style={{
          background: referencia
            ? "linear-gradient(110deg,#003650,#0069A5)"
            : "linear-gradient(110deg,#002D49,#00476B)",
        }}
      >
        {referencia && (
          <div className="absolute inset-x-0 top-0 h-1 bg-[#FFD21E]" />
        )}

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-black tracking-wider text-[#FFD21E]">
            {diaSemana(dia.fecha)}
          </span>

          {dia.esHoy && (
            <span className="rounded bg-[#FFD21E] px-1.5 py-0.5 text-[9px] font-black text-[#003650]">
              HOY
            </span>
          )}
        </div>

        <div className="mt-1 flex items-baseline justify-center gap-1.5 text-white">
          <span className="text-3xl font-black leading-none">
            {numeroDia(dia.fecha)}
          </span>
          <span className="text-sm font-bold">
            {mesCorto(dia.fecha)}
          </span>
        </div>

        <p className="mt-1 text-[11px] font-semibold text-white/75">
          {dia.partidos.length}{" "}
          {dia.partidos.length === 1 ? "partido" : "partidos"}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {dia.partidos.map((partido) => (
          <PartidoTarjeta
            key={partido.id}
            partido={partido}
          />
        ))}
      </div>
    </div>
  );
}

export default function PartidosPortada({
  datos,
  mostrarCabecera = true,
  tituloId = "partidos-portada-titulo",
}: Propiedades) {
  const dias = useMemo(() => construirDias(datos), [datos]);

  const referencia = useMemo(
    () => obtenerFechaReferencia(dias, datos.fechaActual),
    [dias, datos.fechaActual],
  );

  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const columnaReferenciaRef = useRef<HTMLDivElement | null>(null);

  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(false);
  const [hayDesbordamiento, setHayDesbordamiento] =
    useState(false);

  const actualizarScroll = useCallback(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const maximo = Math.max(
      0,
      contenedor.scrollWidth - contenedor.clientWidth,
    );

    setHayDesbordamiento(maximo > 2);
    setPuedeIzquierda(contenedor.scrollLeft > 2);
    setPuedeDerecha(contenedor.scrollLeft < maximo - 2);
  }, []);

  const centrarDia = useCallback(
    (behavior: ScrollBehavior = "instant") => {
      const contenedor = contenedorRef.current;
      const columna = columnaReferenciaRef.current;

      if (!contenedor || !columna) return;

      const maximo = Math.max(
        0,
        contenedor.scrollWidth - contenedor.clientWidth,
      );

      if (maximo <= 2) {
        contenedor.scrollLeft = 0;
        actualizarScroll();
        return;
      }

      const rectContenedor =
        contenedor.getBoundingClientRect();
      const rectColumna =
        columna.getBoundingClientRect();

      const centroColumna =
        rectColumna.left +
        rectColumna.width / 2 -
        rectContenedor.left +
        contenedor.scrollLeft;

      const destino = Math.max(
        0,
        Math.min(
          maximo,
          centroColumna - contenedor.clientWidth / 2,
        ),
      );

      contenedor.scrollTo({
        left: destino,
        behavior,
      });

      actualizarScroll();
    },
    [actualizarScroll],
  );

  const desplazar = (direccion: -1 | 1) => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    contenedor.scrollBy({
      left:
        direccion *
        Math.max(400, contenedor.clientWidth * 0.75),
      behavior: "smooth",
    });
  };

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      centrarDia("instant");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [centrarDia, referencia]);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const observer = new ResizeObserver(() => {
      actualizarScroll();
    });

    observer.observe(contenedor);

    const contenido = contenedor.firstElementChild;
    if (contenido) observer.observe(contenido);

    contenedor.addEventListener("scroll", actualizarScroll, {
      passive: true,
    });

    actualizarScroll();

    return () => {
      observer.disconnect();
      contenedor.removeEventListener(
        "scroll",
        actualizarScroll,
      );
    };
  }, [actualizarScroll]);

  const totalPartidos = datos.partidos.length;

  return (
    <section
      className="relative w-full py-7 sm:py-10"
      aria-labelledby={tituloId}
    >
      <div className="mx-auto w-full">
        {mostrarCabecera && (
          <header className="mb-7 flex flex-col items-center gap-4 px-5 text-center sm:mb-9">
            <img
              src={IMAGENES.escudoClub}
              alt="Escudo del Club Bàsquet Andratx"
              className="h-20 w-20 object-contain sm:h-24 sm:w-24"
            />

            <h2
              id={tituloId}
              className="text-4xl font-black uppercase italic leading-[0.96] tracking-tighter text-[#002B45] sm:text-6xl"
            >
              PARTIDOS
              <span className="block text-[#009FE3]">
                DE LA SEMANA
              </span>
            </h2>
          </header>
        )}

        {dias.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-6 py-12 text-center shadow-sm">
            <p className="text-xl font-black text-on-surface">
              No hay partidos programados
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              No encontramos partidos para el periodo actual.
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-4 flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-4 sm:px-8">
              <p className="text-xs font-black uppercase tracking-widest text-on-secondary-fixed sm:text-sm">
                {totalPartidos}{" "}
                {totalPartidos === 1 ? "PARTIDO" : "PARTIDOS"}
                {" · "}
                {dias.length}{" "}
                {dias.length === 1 ? "DÍA" : "DÍAS"}
              </p>

              {hayDesbordamiento && (
                <p className="text-xs font-semibold text-on-surface-variant">
                  Desliza para ver más días ↔
                </p>
              )}
            </div>

            <div className="relative w-full">
              {/* Desvanecimiento hacia el color de la web */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 transition-opacity duration-200 sm:w-24"
                style={{
                  opacity: puedeIzquierda ? 1 : 0,
                  background:
                    "linear-gradient(to right,var(--md-sys-color-surface,#fff),transparent)",
                }}
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 transition-opacity duration-200 sm:w-24"
                style={{
                  opacity: puedeDerecha ? 1 : 0,
                  background:
                    "linear-gradient(to left,var(--md-sys-color-surface,#fff),transparent)",
                }}
                aria-hidden="true"
              />

              {puedeIzquierda && (
                <button
                  type="button"
                  onClick={() => desplazar(-1)}
                  aria-label="Ver días anteriores"
                  className="absolute left-2 top-11 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md transition-colors hover:bg-surface-container-high sm:left-4"
                >
                  <IconoFlecha direccion="izquierda" />
                </button>
              )}

              {puedeDerecha && (
                <button
                  type="button"
                  onClick={() => desplazar(1)}
                  aria-label="Ver días posteriores"
                  className="absolute right-2 top-11 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface shadow-md transition-colors hover:bg-surface-container-high sm:right-4"
                >
                  <IconoFlecha direccion="derecha" />
                </button>
              )}

              <div
                ref={contenedorRef}
                className="w-full overflow-x-auto overscroll-x-contain px-4 pb-5 sm:px-8 [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                }}
                role="region"
                aria-label="Partidos de la semana organizados por días"
                tabIndex={0}
              >
                <div className="flex min-w-full w-max items-start justify-center gap-5">
                  {dias.map((dia) => (
                    <div
                      key={dia.fecha}
                      ref={
                        dia.fecha === referencia
                          ? columnaReferenciaRef
                          : undefined
                      }
                      className="w-[520px] shrink-0 max-sm:w-[470px]"
                    >
                      <ColumnaDia
                        dia={dia}
                        referencia={dia.fecha === referencia}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-5 flex justify-center px-4">
          <a
            href="/calendario"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-secondary/60 bg-transparent px-6 py-2.5 text-sm font-bold text-secondary transition-colors duration-200 hover:border-secondary hover:bg-secondary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Ver calendario completo
          </a>
        </div>
      </div>
    </section>
  );
}
