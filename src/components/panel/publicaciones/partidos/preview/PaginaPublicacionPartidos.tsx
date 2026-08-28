import {
  forwardRef,
  useState,
} from "react";

import type {
  IdiomaPublicacionPartidos,
  PartidoPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  titulo: string;

  idioma:
    IdiomaPublicacionPartidos;

  partidos:
    PartidoPublicacion[];

  partidosPorImagen: number;

  paginaActual: number;
  totalPaginas: number;

  fondo: string | null;
}

const TEXTOS = {
  es: {
    fecha: "FECHA",
    equipo: "EQUIPO",
    rival: "RIVAL",
    campo: "CAMPO",
    descansa: "DESCANSA",
    aplazado: "APLAZADO",
  },

  ca: {
    fecha: "DATA",
    equipo: "EQUIP",
    rival: "RIVAL",
    campo: "CAMP",
    descansa: "DESCANSA",
    aplazado: "APLAÇAT",
  },
} as const;

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "";
  }

  const partes =
    fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}`;
}

function formatearHora(
  hora: string | null,
): string {
  if (!hora) {
    return "";
  }

  return hora.slice(0, 5);
}

function obtenerInicial(
  nombre: string,
): string {
  return (
    nombre
      .trim()
      .charAt(0)
      .toUpperCase() || "?"
  );
}

const PaginaPublicacionPartidos =
  forwardRef<
    HTMLDivElement,
    Propiedades
  >(function PaginaPublicacionPartidos(
    {
      titulo,
      idioma,
      partidos,
      partidosPorImagen,
      paginaActual,
      totalPaginas,
      fondo,
    },
    ref,
  ) {
    const textos =
      TEXTOS[idioma];

    const [
      escudosConError,
      setEscudosConError,
    ] = useState<
      Set<string>
    >(() => new Set());

    const registrarErrorEscudo = (
      partidoId: string,
    ) => {
      setEscudosConError(
        (idsActuales) => {
          const siguientesIds =
            new Set(idsActuales);

          siguientesIds.add(
            partidoId,
          );

          return siguientesIds;
        },
      );
    };

    const alturaZonaPartidos =
      956;

    const alturaFila =
      Math.floor(
        alturaZonaPartidos /
          Math.max(
            1,
            partidosPorImagen,
          ),
      );

    const estiloFondo =
      fondo
        ? {
            backgroundImage: `
              linear-gradient(
                rgba(84, 197, 248, 0.76),
                rgba(3, 42, 85, 0.70)
              ),
              url("${fondo}")
            `,
          }
        : {
            backgroundImage: `
              radial-gradient(
                circle at 15% 8%,
                rgba(255, 255, 255, 0.48),
                transparent 24%
              ),
              radial-gradient(
                circle at 88% 72%,
                rgba(0, 173, 239, 0.34),
                transparent 28%
              ),
              linear-gradient(
                145deg,
                #8ddcff 0%,
                #54c5f8 36%,
                #0b87ca 72%,
                #032a55 100%
              )
            `,
          };

    return (
      <div
        ref={ref}
        data-pagina-publicacion={
          paginaActual
        }
        style={{
          width: "1080px",
          height: "1350px",
          minWidth: "1080px",
          minHeight: "1350px",
          fontFamily:
            "Arial, Helvetica, sans-serif",
          ...estiloFondo,
          backgroundPosition:
            "center",
          backgroundSize: "cover",
        }}
        className="relative overflow-hidden bg-brand-blue text-brand-blue-deep"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                125deg,
                transparent 0,
                transparent 36px,
                rgba(255,255,255,0.25) 38px,
                transparent 41px
              )
            `,
          }}
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -left-32 top-36 h-96 w-96 rounded-full border-[5px] border-white/20"
          aria-hidden="true"
        />

        <div
          className="pointer-events-none absolute -right-44 bottom-24 h-130 w-130 rounded-full border-[6px] border-primary/20"
          aria-hidden="true"
        />

        <div className="relative flex h-full flex-col p-8">
          <header className="relative flex h-47.5 shrink-0 items-center justify-center">
            <div className="absolute left-0 top-1/2 flex h-31.5 w-31.5 -translate-y-1/2 items-center justify-center rounded-[28px] bg-white/90 p-3 shadow-xl">
              <img
                src="/favicon.png"
                alt=""
                crossOrigin="anonymous"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="max-w-190 px-8 text-center">
              <p
                className="text-[60px] font-black uppercase leading-[0.95] tracking-tight text-primary"
                style={{
                  WebkitTextStroke:
                    "3px #032a55",
                  paintOrder:
                    "stroke fill",
                  textShadow:
                    "0 5px 0 rgba(3,42,85,0.28)",
                }}
              >
                {titulo}
              </p>
            </div>

            {totalPaginas > 1 && (
              <span className="absolute right-0 top-2 rounded-full bg-brand-blue-deep/85 px-5 py-2 text-[27px] font-black text-white shadow-lg">
                {paginaActual}/
                {totalPaginas}
              </span>
            )}
          </header>

          <div className="grid h-15 shrink-0 grid-cols-[170px_350px_290px_1fr] items-center rounded-[22px] bg-white/90 px-2 text-center text-[30px] font-black uppercase text-brand-cyan shadow-lg">
            <div>
              {textos.fecha}
            </div>

            <div>
              {textos.equipo}
            </div>

            <div>
              {textos.rival}
            </div>

            <div>
              {textos.campo}
            </div>
          </div>

          <div
            className="h-239 shrink-0 overflow-hidden"
            aria-label="Partidos de la publicación"
          >
            {partidos.map(
              (partido) => {
                const mostrarEscudo =
                  Boolean(
                    partido.logoRival,
                  ) &&
                  !escudosConError.has(
                    partido.id,
                  );

                const esDescanso =
                  partido.estado ===
                  "descansa";

                const esAplazado =
                  partido.estado ===
                  "aplazado";

                return (
                  <article
                    key={partido.id}
                    style={{
                      height:
                        `${alturaFila}px`,
                    }}
                    className="grid grid-cols-[170px_350px_290px_1fr] items-center border-b-[3px] border-white/90 bg-white/12 px-2 text-center"
                  >
                    <div className="flex h-full flex-col items-center justify-center px-2">
                      {esDescanso ? (
                        <span
                          className="text-[27px] font-black uppercase leading-none text-[#e32636]"
                          style={{
                            textShadow:
                              "0 2px 0 rgba(255,255,255,0.65)",
                          }}
                        >
                          {
                            textos.descansa
                          }
                        </span>
                      ) : esAplazado ? (
                        <>
                          <span
                            className="text-[26px] font-black uppercase leading-none text-[#e32636]"
                            style={{
                              textShadow:
                                "0 2px 0 rgba(255,255,255,0.65)",
                            }}
                          >
                            {
                              textos.aplazado
                            }
                          </span>

                          {partido.fecha && (
                            <span className="mt-2 text-[23px] font-black text-brand-blue-deep">
                              {formatearFecha(
                                partido.fecha,
                              )}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-[30px] font-black leading-none text-brand-blue-deep">
                            {formatearFecha(
                              partido.fecha,
                            )}
                          </span>

                          <span className="mt-2 text-[28px] font-black leading-none text-brand-blue-deep">
                            {formatearHora(
                              partido.hora,
                            )}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex h-full items-center justify-center px-4">
                      <p
                        className="whitespace-pre-line text-[27px] font-black uppercase leading-[1.06] text-brand-blue-deep"
                        style={{
                          display:
                            "-webkit-box",
                          WebkitBoxOrient:
                            "vertical",
                          WebkitLineClamp: 3,
                          overflow:
                            "hidden",
                        }}
                      >
                        {
                          partido.nombreEquipo
                        }
                      </p>
                    </div>

                    <div className="flex h-full items-center justify-center gap-3 overflow-hidden px-3">
                      {!esDescanso && (
                        <>
                          <span className="relative flex h-17 w-17 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/85 text-[24px] font-black text-brand-blue-deep shadow-sm">
                            {obtenerInicial(
                              partido.nombreRival,
                            )}

                            {mostrarEscudo && (
                              <img
                                src={
                                  partido.logoRival ??
                                  undefined
                                }
                                alt=""
                                crossOrigin="anonymous"
                                onError={() =>
                                  registrarErrorEscudo(
                                    partido.id,
                                  )
                                }
                                className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                              />
                            )}
                          </span>

                          <p
                            className="min-w-0 text-[21px] font-black uppercase leading-[1.04] text-brand-blue-deep"
                            style={{
                              display:
                                "-webkit-box",
                              WebkitBoxOrient:
                                "vertical",
                              WebkitLineClamp: 3,
                              overflow:
                                "hidden",
                            }}
                          >
                            {
                              partido.nombreRival
                            }
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex h-full items-center justify-center overflow-hidden px-3">
                      {!esDescanso && (
                        <p
                          className="text-[23px] font-black uppercase leading-[1.05] text-brand-blue-deep"
                          style={{
                            display:
                              "-webkit-box",
                            WebkitBoxOrient:
                              "vertical",
                            WebkitLineClamp: 4,
                            overflow:
                              "hidden",
                          }}
                        >
                          {partido.campo ||
                            "—"}
                        </p>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>

          <footer className="flex h-20 shrink-0 items-end justify-between gap-5 border-t-[3px] border-white/80 pt-4 text-white">
            <div>
              <p className="text-[25px] font-black uppercase tracking-wide">
                C.B. Andratx
              </p>

              <p className="mt-1 text-[19px] font-bold text-white/85">
                @cbandratx1985
              </p>
            </div>

            {totalPaginas > 1 && (
              <p className="rounded-full bg-brand-blue-deep/70 px-5 py-2 text-[22px] font-black">
                {paginaActual}/
                {totalPaginas}
              </p>
            )}
          </footer>
        </div>
      </div>
    );
  });

PaginaPublicacionPartidos.displayName =
  "PaginaPublicacionPartidos";

export default PaginaPublicacionPartidos;