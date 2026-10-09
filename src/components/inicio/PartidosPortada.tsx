
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
  azul: "#009FE3",
  azulClaro: "#48B9F4",
  amarillo: "#FFD21E",
  amarilloClaro: "#FFF2A5",
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

function fechaReferencia(
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
      className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full p-[5px] shadow-lg"
      style={{
        background: `conic-gradient(
          ${COLORES.azul} 0deg,
          #0068CB 110deg,
          ${COLORES.amarillo} 155deg,
          ${COLORES.azul} 230deg,
          ${COLORES.amarillo} 300deg,
          ${COLORES.azul} 360deg
        )`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[3px] border-[#002F59] bg-white p-2">
        {equipo.escudo && !error ? (
          <img
            src={equipo.escudo}
            alt={`Escudo de ${equipo.nombre}`}
            width={52}
            height={52}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain"
            onError={() => setError(true)}
          />
        ) : (
          <span className="text-center text-[11px] font-black text-[#003650]">
            {iniciales(equipo.nombre)}
          </span>
        )}
      </div>
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
 * TARJETA HORIZONTAL
 *
 * Columna 1: Fecha, hora y casa/fuera
 * Columna 2: Equipo C.B. Andratx
 * Columna 3: Escudo rival + nombre + ubicación
 *
 * El resultado se muestra en el bloque central
 * cuando el partido ha comenzado o finalizado.
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
    <article
      className="relative isolate overflow-hidden rounded-[15px] border-[2px] border-white/90 text-white shadow-[0_5px_14px_rgba(0,28,55,0.19)]"
      style={{
        background: `linear-gradient(
          115deg,
          ${COLORES.azulProfundo},
          ${COLORES.azulOscuro} 60%,
          #002B48
        )`,
      }}
    >
      {/* Franja amarilla lateral */}
      <div
        className="absolute inset-y-0 right-0 w-[5px]"
        style={{ backgroundColor: COLORES.amarillo }}
        aria-hidden="true"
      />

      {/* Textura diagonal muy suave */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(125deg,transparent 0px,transparent 24px,white 25px,transparent 26px,transparent 50px)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 px-2.5 py-3 pr-4">
        {/* Información secundaria arriba */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-black"
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

        {/* TRES COLUMNAS HORIZONTALES */}
        <div className="grid grid-cols-[58px_minmax(0,1fr)_minmax(0,1.45fr)] items-center gap-2">
          {/* 1. FECHA Y HORA */}
          <div className="flex h-full flex-col items-center justify-center border-r border-white/20 pr-1.5 text-center">
            <span className="text-[15px] font-black leading-none tracking-tight">
              {numeroDia(partido.fecha)}
              <span className="text-[11px]">/</span>
              {mesNumero(partido.fecha)}
            </span>

            <span
              className="mt-2 text-[16px] font-black leading-none tabular-nums"
              style={{ color: COLORES.amarillo }}
            >
              {partido.hora ?? "--:--"}
            </span>
          </div>

          {/* 2. NOMBRE EQUIPO ANDRATX */}
          <div className="flex h-full min-w-0 flex-col items-center justify-center border-r border-white/20 pr-1 text-center">
            <p className="break-words text-[13px] font-black uppercase italic leading-[1.14] tracking-tight">
              {equipoClub.nombre}
            </p>

            <span
              className="mt-2 text-[17px] font-black italic leading-none"
              style={{ color: COLORES.amarillo }}
            >
              {tieneResultado
                ? `${puntosClub} - ${puntosRival}`
                : partido.estado === "aplazado"
                  ? "—"
                  : "VS"}
            </span>
          </div>

          {/* 3. ESCUDO + RIVAL + UBICACIÓN */}
          <div className="flex min-w-0 items-center gap-2">
            <EscudoRival equipo={rival} />

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
              <p className="break-words text-[12px] font-black uppercase italic leading-[1.1] tracking-tight">
                {rival.nombre}
              </p>

              {partido.ubicacion && (
                <p
                  className="flex items-start gap-1 text-[10px] font-bold uppercase leading-tight"
                  style={{ color: COLORES.amarilloClaro }}
                >
                  <IconoUbicacion size={12} />
                  <span className="min-w-0 break-words">
                    {partido.ubicacion}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pie secundario */}
        {(partido.jornada || partido.enlaceFbib) && (
          <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-2">
            <span className="text-[10px] font-semibold text-white/65">
              {partido.jornada ?? ""}
            </span>

            {partido.enlaceFbib && (
              <a
                href={partido.enlaceFbib}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-white/80 underline decoration-white/30 underline-offset-2 transition-colors hover:text-[#FFD21E]"
                aria-label={`Ver partido de ${equipoClub.nombre} contra ${rival.nombre} en la FBIB`}
              >
                Ver en FBIB ↗
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
        className="relative overflow-hidden rounded-xl border border-white/55 px-4 py-3 text-center shadow-sm"
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
    () => fechaReferencia(dias, datos.fechaActual),
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
        Math.max(300, contenedor.clientWidth * 0.75),
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
      centrarDia("instant");
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
  }, [actualizarScroll, centrarDia]);

  const totalPartidos = datos.partidos.length;

  return (
    <section
      className="relative overflow-hidden py-7 sm:py-10"
      aria-labelledby={tituloId}
      style={{
        background:
          "linear-gradient(118deg,#37AAF0 0%,#65C4F4 35%,#32A9EF 75%,#68C7F5 100%)",
      }}
    >
      {/* Fondo inspirado en las publicaciones */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(120deg,transparent 0px,transparent 90px,rgba(255,255,255,.24) 92px,transparent 100px,transparent 195px)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1600px]">
        {mostrarCabecera && (
          <header className="mb-7 flex flex-col items-center gap-4 px-5 text-center sm:mb-9">
            <img
              src="/favicon.svg"
              alt="Escudo del Club Bàsquet Andratx"
              className="h-20 w-20 object-contain sm:h-24 sm:w-24"
            />

            <h2
              id={tituloId}
              className="text-4xl font-black uppercase italic leading-[0.96] tracking-tighter text-[#002B45] sm:text-6xl"
            >
              PARTIDOS
              <span
                className="block text-[#FFD21E]"
                style={{
                  textShadow: "2px 3px 0 rgba(0,43,69,.3)",
                }}
              >
                DE LA SEMANA
              </span>
            </h2>
          </header>
        )}

        {dias.length === 0 ? (
          <div className="mx-4 rounded-2xl border border-white/70 bg-[#003650] px-6 py-12 text-center text-white sm:mx-8">
            <p className="text-xl font-black uppercase">
              No hay partidos programados
            </p>
            <p className="mt-2 text-sm text-white/75">
              No encontramos partidos para el periodo actual.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8">
              <p className="text-xs font-black uppercase tracking-widest text-[#002B45] sm:text-sm">
                {totalPartidos}{" "}
                {totalPartidos === 1 ? "PARTIDO" : "PARTIDOS"}
                {" · "}
                {dias.length}{" "}
                {dias.length === 1 ? "DÍA" : "DÍAS"}
              </p>

              {hayDesbordamiento && (
                <p className="text-xs font-bold text-[#003650]/80">
                  Desliza para ver más días ↔
                </p>
              )}
            </div>

            <div className="relative">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 z-20 w-14 transition-opacity duration-200 sm:w-24"
                style={{
                  opacity: puedeIzquierda ? 1 : 0,
                  background:
                    "linear-gradient(to right,#48B9F4 0%,rgba(72,185,244,.8) 35%,transparent 100%)",
                }}
                aria-hidden="true"
              />

              <div
                className="pointer-events-none absolute inset-y-0 right-0 z-20 w-14 transition-opacity duration-200 sm:w-24"
                style={{
                  opacity: puedeDerecha ? 1 : 0,
                  background:
                    "linear-gradient(to left,#48B9F4 0%,rgba(72,185,244,.8) 35%,transparent 100%)",
                }}
                aria-hidden="true"
              />

              {puedeIzquierda && (
                <button
                  type="button"
                  onClick={() => desplazar(-1)}
                  aria-label="Ver días anteriores"
                  className="absolute left-2 top-11 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-[#003650] text-white shadow-lg transition-transform hover:scale-110 sm:left-4"
                >
                  <IconoFlecha direccion="izquierda" />
                </button>
              )}

              {puedeDerecha && (
                <button
                  type="button"
                  onClick={() => desplazar(1)}
                  aria-label="Ver días posteriores"
                  className="absolute right-2 top-11 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-[#003650] text-white shadow-lg transition-transform hover:scale-110 sm:right-4"
                >
                  <IconoFlecha direccion="derecha" />
                </button>
              )}

              <div
                ref={contenedorRef}
                className="overflow-x-auto overscroll-x-contain px-4 pb-5 sm:px-8 [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: "none",
                  WebkitOverflowScrolling: "touch",
                }}
                role="region"
                aria-label="Partidos de la semana organizados por días"
                tabIndex={0}
              >
                <div className="flex min-w-full w-max items-start justify-center gap-4">
                  {dias.map((dia) => (
                    <div
                      key={dia.fecha}
                      ref={
                        dia.fecha === referencia
                          ? columnaReferenciaRef
                          : undefined
                      }
                      className="flex w-[360px] shrink-0 max-sm:w-[330px]"
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
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#003650] bg-[#003650] px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-md transition-all hover:bg-[#FFD21E] hover:text-[#003650]"
          >
            Ver calendario completo ↗
          </a>
        </div>
      </div>
    </section>
  );
}
