import type { PartidoEquipoFbib } from "@tipos/FbibEquipoPublico";

interface Propiedades {
  partido: PartidoEquipoFbib;
  compacto?: boolean;
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Fecha pendiente";
  }

  const fechaConvertida = new Date(
    `${fecha}T00:00:00Z`,
  );

  if (
    Number.isNaN(
      fechaConvertida.getTime(),
    )
  ) {
    return fecha;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    },
  ).format(fechaConvertida);
}

function obtenerIniciales(
  nombre: string,
): string {
  const palabras = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) {
    return "EQ";
  }

  return palabras
    .slice(0, 2)
    .map((palabra) =>
      palabra.charAt(0),
    )
    .join("")
    .toUpperCase();
}

function obtenerResultadoEquipo(
  partido: PartidoEquipoFbib,
): {
  texto: string;
  clases: string;
} | null {
  if (
    partido.estado !==
      "finalizado" ||
    !partido.resultado ||
    !partido.posicionEquipo
  ) {
    return null;
  }

  const puntosEquipo =
    partido.posicionEquipo ===
    "local"
      ? partido.resultado.local
      : partido.resultado
          .visitante;

  const puntosRival =
    partido.posicionEquipo ===
    "local"
      ? partido.resultado
          .visitante
      : partido.resultado.local;

  if (puntosEquipo > puntosRival) {
    return {
      texto: "Victoria",
      clases:
        "bg-success-container text-on-success-container",
    };
  }

  if (puntosEquipo < puntosRival) {
    return {
      texto: "Derrota",
      clases:
        "bg-error-container text-on-error-container",
    };
  }

  return {
    texto: "Empate",
    clases:
      "bg-surface-container-high text-on-surface-variant",
  };
}

function EscudoEquipo({
  nombre,
  escudo,
  pequeno,
}: {
  nombre: string;
  escudo: string | null;
  pequeno: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-lowest font-black text-primary ${
        pequeno
          ? "h-8 w-8 text-[10px]"
          : "h-10 w-10 text-xs"
      }`}
    >
      {escudo ? (
        <img
          src={escudo}
          alt={`Escudo de ${nombre}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-1"
        />
      ) : (
        obtenerIniciales(nombre)
      )}
    </span>
  );
}

export default function TarjetaPartidoEquipoPublico({
  partido,
  compacto = false,
}: Propiedades) {
  const resultadoEquipo =
    obtenerResultadoEquipo(partido);

  const contenido = (
    <div
      className={
        compacto
          ? "p-3"
          : "p-4 sm:p-5"
      }
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/50 pb-3">
        <div>
          <p className="text-xs font-black capitalize text-on-surface">
            {formatearFecha(
              partido.fecha,
            )}
          </p>

          <p className="mt-0.5 text-xs text-on-surface-variant">
            {partido.hora
              ? `${partido.hora} h`
              : "Hora pendiente"}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {resultadoEquipo && (
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${resultadoEquipo.clases}`}
            >
              {resultadoEquipo.texto}
            </span>
          )}

          {partido.jornada !== null && (
            <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-black text-on-primary-fixed">
              Jornada{" "}
              {partido.jornada}
            </span>
          )}
        </div>
      </header>

      <div className="mt-3 grid gap-2">
        <div
          className={`grid items-center gap-3 rounded-xl ${
            partido.posicionEquipo ===
            "local"
              ? "bg-primary-fixed/40"
              : "bg-surface-container-low"
          } ${
            compacto
              ? "grid-cols-[2rem_minmax(0,1fr)_2rem] p-2"
              : "grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] p-2.5"
          }`}
        >
          <EscudoEquipo
            nombre={
              partido.local.nombre
            }
            escudo={
              partido.local.escudo
            }
            pequeno={compacto}
          />

          <p className="min-w-0 truncate text-sm font-bold text-on-surface">
            {partido.local.nombre}
          </p>

          <p className="text-center text-lg font-black text-on-surface">
            {partido.resultado
              ? partido.resultado.local
              : "–"}
          </p>
        </div>

        <div
          className={`grid items-center gap-3 rounded-xl ${
            partido.posicionEquipo ===
            "visitante"
              ? "bg-primary-fixed/40"
              : "bg-surface-container-low"
          } ${
            compacto
              ? "grid-cols-[2rem_minmax(0,1fr)_2rem] p-2"
              : "grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] p-2.5"
          }`}
        >
          <EscudoEquipo
            nombre={
              partido.visitante.nombre
            }
            escudo={
              partido.visitante.escudo
            }
            pequeno={compacto}
          />

          <p className="min-w-0 truncate text-sm font-bold text-on-surface">
            {partido.visitante.nombre}
          </p>

          <p className="text-center text-lg font-black text-on-surface">
            {partido.resultado
              ? partido.resultado
                  .visitante
              : "–"}
          </p>
        </div>
      </div>

      {(partido.competicion ||
        partido.grupo ||
        partido.campo) && (
        <footer className="mt-3 grid gap-1 text-xs text-on-surface-variant">
          {(partido.competicion ||
            partido.grupo) && (
            <p className="truncate">
              {[
                partido.competicion,
                partido.grupo,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {partido.campo && (
            <p className="flex items-start gap-1.5">
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M12 21s6-5.15 6-11a6 6 0 1 0-12 0c0 5.85 6 11 6 11Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <circle
                  cx="12"
                  cy="10"
                  r="2"
                />
              </svg>

              <span>
                {partido.campo}
              </span>
            </p>
          )}
        </footer>
      )}
    </div>
  );

  return (
    <article className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      {partido.enlaceFbib ? (
        <a
          href={partido.enlaceFbib}
          target="_blank"
          rel="noopener noreferrer"
          className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label={`Ver partido entre ${partido.local.nombre} y ${partido.visitante.nombre} en la FBIB`}
        >
          {contenido}
        </a>
      ) : (
        contenido
      )}
    </article>
  );
}