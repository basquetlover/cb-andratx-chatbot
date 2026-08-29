import {
  forwardRef,
  useState,
  type CSSProperties,
} from "react";

import type {
  IdiomaPublicacionPartidos,
  PartidoPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface Propiedades {
  titulo: string;
  idioma: IdiomaPublicacionPartidos;
  partidos: PartidoPublicacion[];
  partidosPorImagen: number;
  paginaActual: number;
  totalPaginas: number;
  fondo: string | null;
}

interface PropiedadesIcono {
  tamaño?: number;
  color?: string;
}

interface PropiedadesEscudo {
  partido: PartidoPublicacion;
  mostrar: boolean;
  alError: () => void;
}

const RUTAS_IMAGENES = {
  fondoPagina:
    "/img/fondo.png",

  fondoPartido:
    "/img/fondo-partido.png",

  marcoEscudo:
    "/img/marco-escudo.png",
} as const;

const COLORES = {
  azulOscuro: "#002b45",
  azulProfundo: "#001e30",
  amarillo: "#ffc801",
  amarilloClaro: "#fff100",
  blanco: "#ffffff",
  rojo: "#e32636",
} as const;

const TEXTOS = {
  es: {
    casa: "CASA",
    fuera: "FUERA",
    descansa: "DESCANSA",
    aplazado: "APLAZADO",
  },

  ca: {
    casa: "CASA",
    fuera: "FORA",
    descansa: "DESCANSA",
    aplazado: "APLAÇAT",
  },
} as const;

const estiloTextoRecortado = (
  lineas: number,
): CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lineas,
  overflow: "hidden",
});

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
  return hora
    ? hora.slice(0, 5)
    : "";
}

function normalizarTexto(
  valor:
    | string
    | null
    | undefined,
): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function extraerPartesCampo(
  campo: string,
): string[] {
  return campo
    .split(",")
    .map(
      (parte) =>
        parte.trim(),
    )
    .filter(Boolean);
}

function limpiarMunicipio(
  valor: string,
): string {
  return valor
    .replace(
      /^\d{5}\s*/,
      "",
    )
    .trim();
}

function obtenerLugarPartido(
  partido: PartidoPublicacion,
): string {
  const campo =
    partido.campo?.trim() ??
    "";

  const municipio =
    partido.municipio?.trim() ??
    "";

  const pabellon =
    partido.pabellon?.trim() ??
    "";

  const municipioNormalizado =
    normalizarTexto(
      municipio,
    );

  const campoNormalizado =
    normalizarTexto(
      campo,
    );

  const seJuegaEnAndratx =
    municipioNormalizado.includes(
      "andratx",
    ) ||
    campoNormalizado.includes(
      "andratx",
    ) ||
    partido.local === true;

  if (seJuegaEnAndratx) {
    if (pabellon) {
      return pabellon;
    }

    if (campo) {
      return (
        extraerPartesCampo(
          campo,
        )[0] ??
        campo
      );
    }

    return "Andratx";
  }

  if (municipio) {
    return municipio;
  }

  if (campo) {
    const partes =
      extraerPartesCampo(
        campo,
      );

    if (
      partido.local === false &&
      partes.length > 1
    ) {
      return (
        limpiarMunicipio(
          partes[
            partes.length - 1
          ],
        ) ||
        campo
      );
    }

    return campo;
  }

  return "—";
}

function IconoCasa({
  tamaño = 18,
  color = "currentColor",
}: PropiedadesIcono) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        width: `${tamaño}px`,
        height: `${tamaño}px`,
        minWidth: `${tamaño}px`,
        fill: color,
        display: "block",
      }}
    >
      <path d="M12 3 2.5 11h2.3v9h5.3v-5.5h3.8V20h5.3v-9h2.3L12 3Z" />
    </svg>
  );
}

function IconoUbicacion({
  tamaño = 18,
  color = "currentColor",
}: PropiedadesIcono) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        width: `${tamaño}px`,
        height: `${tamaño}px`,
        minWidth: `${tamaño}px`,
        fill: color,
        display: "block",
      }}
    >
      <path
        fillRule="evenodd"
        d="M12 2a8 8 0 0 0-8 8c0 5.8 8 12 8 12s8-6.2 8-12a8 8 0 0 0-8-8Zm0 11.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FondoTarjeta() {
  return (
    <>
      <img
        src={
          RUTAS_IMAGENES
            .fondoPartido
        }
        alt=""
        crossOrigin="anonymous"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(100deg, rgba(0,43,69,0.88) 0%, rgba(0,77,103,0.78) 52%, rgba(0,43,69,0.84) 100%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function EscudoRival({
  partido,
  mostrar,
  alError,
}: PropiedadesEscudo) {
  return (
    <div
      style={{
        position: "relative",
        width: "122px",
        height: "122px",
        minWidth: "122px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "15px",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: "50%",
          backgroundColor:
            "rgba(255,255,255,0.96)",
        }}
      >
        {mostrar ? (
          <img
            src={
              partido.logoRival ??
              undefined
            }
            alt=""
            crossOrigin="anonymous"
            onError={alError}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "7px",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              color:
                "rgba(0,43,69,0.35)",
              fontSize: "34px",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            —
          </span>
        )}
      </div>

      <img
        src={
          RUTAS_IMAGENES
            .marcoEscudo
        }
        alt=""
        crossOrigin="anonymous"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}

const PaginaPublicacionPartidos =
  forwardRef<
    HTMLDivElement,
    Propiedades
  >(
    function PaginaPublicacionPartidos(
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
      ] = useState<Set<string>>(
        () => new Set(),
      );

      const alturaCabecera =
        236;

      const alturaZonaPartidos =
        1050;

      const separacionTarjetas =
        10;

      const numeroFilas =
        Math.max(
          1,
          partidosPorImagen,
        );

      const alturaTarjeta =
        Math.floor(
          (
            alturaZonaPartidos -
            separacionTarjetas *
              Math.max(
                0,
                numeroFilas - 1,
              )
          ) /
            numeroFilas,
        );

      const palabrasTitulo =
        titulo
          .trim()
          .split(/\s+/);

      const tituloPrincipal =
        palabrasTitulo[0] ??
        titulo;

      const tituloSecundario =
        palabrasTitulo
          .slice(1)
          .join(" ");

      const registrarErrorEscudo = (
        partidoId: string,
      ) => {
        setEscudosConError(
          (idsActuales) => {
            const siguientesIds =
              new Set(
                idsActuales,
              );

            siguientesIds.add(
              partidoId,
            );

            return siguientesIds;
          },
        );
      };

      return (
        <div
          ref={ref}
          data-pagina-publicacion={
            paginaActual
          }
          style={{
            position: "relative",
            width: "1080px",
            height: "1350px",
            minWidth: "1080px",
            minHeight: "1350px",
            overflow: "hidden",
            color:
              COLORES.azulProfundo,
            backgroundColor:
              "#54c5f8",
            fontFamily:
              "Inter, Arial, Helvetica, sans-serif",
          }}
        >
          <img
            src={
              fondo ||
              RUTAS_IMAGENES
                .fondoPagina
            }
            alt=""
            crossOrigin="anonymous"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition:
                "center",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor:
                "rgba(84,197,248,0.04)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              padding: "32px",
              boxSizing: "border-box",
            }}
          >
            <header
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                height:
                  `${alturaCabecera}px`,
                minHeight:
                  `${alturaCabecera}px`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "8px",
                  top: "50%",
                  width: "165px",
                  height: "165px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  transform:
                    "translateY(-50%)",
                }}
              >
                <img
                  src="/favicon.png"
                  alt=""
                  crossOrigin="anonymous"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "contain",
                  }}
                />
              </div>

              <div
                style={{
                  width: "700px",
                  marginLeft: "150px",
                  textAlign: "center",
                  textTransform:
                    "uppercase",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color:
                      COLORES.azulOscuro,
                    fontSize: "85px",
                    fontWeight: 900,
                    fontStyle: "italic",
                    lineHeight: 0.82,
                    letterSpacing:
                      "-3px",
                    textShadow:
                      "0 5px 0 rgba(0,80,107,0.35), 0 8px 14px rgba(0,30,43,0.22)",
                  }}
                >
                  {tituloPrincipal}
                </p>

                {tituloSecundario && (
                  <p
                    style={{
                      margin:
                        "16px 0 0",
                      color:
                        COLORES.amarillo,
                      fontSize: "70px",
                      fontWeight: 900,
                      fontStyle:
                        "italic",
                      lineHeight: 0.86,
                      letterSpacing:
                        "-2px",
                      textShadow:
                        "0 4px 0 rgba(92,71,0,0.22), 0 7px 12px rgba(0,30,43,0.2)",
                    }}
                  >
                    {
                      tituloSecundario
                    }
                  </p>
                )}

                {/* <div
                  aria-hidden="true"
                  style={{
                    width: "410px",
                    height: "7px",
                    margin:
                      "16px auto 0",
                    backgroundColor:
                      COLORES.amarillo,
                    transform:
                      "skewX(-12deg)",
                    boxShadow:
                      "28px 7px 0 rgba(244,191,0,0.45)",
                  }}
                /> */}
              </div>

              {/* {totalPaginas > 1 && (
                <span
                  style={{
                    position:
                      "absolute",
                    top: "8px",
                    right: 0,
                    padding:
                      "12px 20px",
                    borderRadius:
                      "22px",
                    color:
                      COLORES.azulOscuro,
                    backgroundColor:
                      "rgba(255,200,1,0.92)",
                    fontSize: "27px",
                    fontWeight: 900,
                    lineHeight: 1,
                    boxShadow:
                      "0 5px 12px rgba(0,30,43,0.22)",
                  }}
                >
                  {paginaActual}/
                  {totalPaginas}
                </span>
              )} */}
            </header>

            <div
              aria-label="Partidos de la publicación"
              style={{
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height:
                  `${alturaZonaPartidos}px`,
                gap:
                  `${separacionTarjetas}px`,
                overflow: "hidden",
              }}
            >
              {partidos.map(
                (partido) => {
                  const esDescanso =
                    partido.estado ===
                    "descansa";

                  const esAplazado =
                    partido.estado ===
                    "aplazado";

                  const esLocal =
                    partido.local ===
                    true;

                  const esVisitante =
                    partido.local ===
                    false;

                  const mostrarEscudo =
                    Boolean(
                      partido.logoRival,
                    ) &&
                    !escudosConError.has(
                      partido.id,
                    );

                  const lugar =
                    obtenerLugarPartido(
                      partido,
                    );

                  if (esDescanso) {
                    return (
                      <article
                        key={partido.id}
                        style={{
                          position:
                            "relative",
                          display: "flex",
                          alignItems:
                            "center",
                          flexShrink: 0,
                          height:
                            `${alturaTarjeta}px`,
                          padding:
                            "0 28px",
                          boxSizing:
                            "border-box",
                          overflow:
                            "hidden",
                          border:
                            "2px solid rgba(255,255,255,0.88)",
                          borderRadius:
                            "22px",
                          boxShadow:
                            "0 6px 12px rgba(0,80,107,0.22)",
                        }}
                      >
                        <img
                          src={
                            RUTAS_IMAGENES
                              .fondoPartido
                          }
                          alt=""
                          crossOrigin="anonymous"
                          aria-hidden="true"
                          style={{
                            position:
                              "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit:
                              "cover",
                            pointerEvents:
                              "none",
                          }}
                        />

                        <div
                          aria-hidden="true"
                          style={{
                            position:
                              "absolute",
                            inset: 0,
                            backgroundColor:
                              "rgba(255,255,255,0.86)",
                          }}
                        />

                        <span
                          style={{
                            position:
                              "relative",
                            zIndex: 1,
                            display: "flex",
                            alignItems:
                              "center",
                            height: "48px",
                            padding:
                              "0 20px",
                            borderRadius:
                              "12px",
                            color:
                              COLORES.blanco,
                            backgroundColor:
                              COLORES.rojo,
                            fontSize:
                              "24px",
                            fontWeight: 900,
                            lineHeight: 1,
                            textTransform:
                              "uppercase",
                            boxShadow:
                              "0 3px 6px rgba(0,0,0,0.16)",
                          }}
                        >
                          {
                            textos.descansa
                          }
                        </span>

                        <p
                          style={{
                            position:
                              "relative",
                            zIndex: 1,
                            margin:
                              "0 0 0 40px",
                            color:
                              COLORES.azulOscuro,
                            fontSize:
                              "30px",
                            fontWeight: 900,
                            lineHeight: 1,
                            textTransform:
                              "uppercase",
                            ...estiloTextoRecortado(
                              2,
                            ),
                          }}
                        >
                          {
                            partido.nombreEquipo
                          }
                        </p>

                        <div
                          aria-hidden="true"
                          style={{
                            position:
                              "absolute",
                            top: 0,
                            right: 0,
                            width: "8px",
                            height: "100%",
                            backgroundColor:
                              COLORES.rojo,
                          }}
                        />
                      </article>
                    );
                  }

                  return (
                    <article
                      key={partido.id}
                      style={{
                        position:
                          "relative",
                        display: "grid",
                        gridTemplateColumns:
                          "180px 280px 55px 135px 1fr",
                        alignItems:
                          "center",
                        flexShrink: 0,
                        height:
                          `${alturaTarjeta}px`,
                        overflow:
                          "hidden",
                        border:
                          "2px solid rgba(255,255,255,0.9)",
                        borderRadius:
                          "24px",
                        boxShadow:
                          "0 7px 14px rgba(0,30,43,0.3)",
                        boxSizing:
                          "border-box",
                      }}
                    >
                      <FondoTarjeta />

                      <div
                        style={{
                          position:
                            "relative",
                          zIndex: 1,
                          display: "flex",
                          flexDirection:
                            "column",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          height: "100%",
                          padding: "0 8px",
                          borderRight:
                            "1px solid rgba(255,244,163,0.3)",
                          boxSizing:
                            "border-box",
                        }}
                      >
                        {!esAplazado &&
                          esLocal && (
                            <span
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "6px",
                                marginBottom:
                                  "8px",
                                padding:
                                  "4px 12px",
                                borderRadius:
                                  "9px",
                                color:
                                  COLORES.azulProfundo,
                                backgroundColor:
                                  COLORES.amarillo,
                                fontSize:
                                  "16px",
                                fontWeight:
                                  900,
                                lineHeight: 1,
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              <IconoCasa />

                              {
                                textos.casa
                              }
                            </span>
                          )}

                        {!esAplazado &&
                          esVisitante && (
                            <span
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: "6px",
                                marginBottom:
                                  "8px",
                                padding:
                                  "4px 12px",
                                borderRadius:
                                  "9px",
                                color:
                                  COLORES.azulProfundo,
                                backgroundColor:
                                  "#fff4a3",
                                fontSize:
                                  "16px",
                                fontWeight:
                                  900,
                                lineHeight: 1,
                                textTransform:
                                  "uppercase",
                              }}
                            >
                              <IconoUbicacion />

                              {
                                textos.fuera
                              }
                            </span>
                          )}

                        {esAplazado && (
                          <span
                            style={{
                              marginBottom:
                                "8px",
                              padding:
                                "6px 12px",
                              borderRadius:
                                "9px",
                              color:
                                COLORES.blanco,
                              backgroundColor:
                                COLORES.rojo,
                              fontSize:
                                "16px",
                              fontWeight: 900,
                              lineHeight: 1,
                              textTransform:
                                "uppercase",
                            }}
                          >
                            {
                              textos.aplazado
                            }
                          </span>
                        )}

                        {partido.fecha && (
                          <span
                            style={{
                              color:
                                COLORES.blanco,
                              fontSize:
                                "31px",
                              fontWeight: 900,
                              fontStyle:
                                "italic",
                              lineHeight: 1,
                            }}
                          >
                            {formatearFecha(
                              partido.fecha,
                            )}
                          </span>
                        )}

                        {!esAplazado &&
                          partido.hora && (
                            <span
                              style={{
                                marginTop:
                                  "4px",
                                color:
                                  COLORES.amarillo,
                                fontSize:
                                  "29px",
                                fontWeight:
                                  900,
                                fontStyle:
                                  "italic",
                                lineHeight: 1,
                              }}
                            >
                              {formatearHora(
                                partido.hora,
                              )}
                            </span>
                          )}
                      </div>

                      <div
                        style={{
                          position:
                            "relative",
                          zIndex: 1,
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          height: "100%",
                          padding:
                            "0 20px",
                          overflow:
                            "hidden",
                          textAlign:
                            "center",
                          boxSizing:
                            "border-box",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color:
                              COLORES.blanco,
                            fontSize:
                              "28px",
                            fontWeight: 900,
                            fontStyle:
                              "italic",
                            lineHeight: 0.96,
                            textTransform:
                              "uppercase",
                            ...estiloTextoRecortado(
                              3,
                            ),
                          }}
                        >
                          {
                            partido.nombreEquipo
                          }
                        </p>
                      </div>

                      <div
                        style={{
                          position:
                            "relative",
                          zIndex: 1,
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          height: "100%",
                        }}
                      >
                        <span
                          style={{
                            color:
                              "#fff4a3",
                            fontSize:
                              "26px",
                            fontWeight: 900,
                            fontStyle:
                              "italic",
                            lineHeight: 1,
                          }}
                        >
                          VS
                        </span>
                      </div>

                      <div
                        style={{
                          position:
                            "relative",
                          zIndex: 1,
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          height: "100%",
                        }}
                      >
                        <EscudoRival
                          partido={
                            partido
                          }
                          mostrar={
                            mostrarEscudo
                          }
                          alError={() =>
                            registrarErrorEscudo(
                              partido.id,
                            )
                          }
                        />
                      </div>

                      <div
                        style={{
                          position:
                            "relative",
                          zIndex: 1,
                          display: "flex",
                          flexDirection:
                            "column",
                          justifyContent:
                            "center",
                          minWidth: 0,
                          height: "100%",
                          padding:
                            "0 28px 0 16px",
                          overflow:
                            "hidden",
                          boxSizing:
                            "border-box",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            color:
                              COLORES.blanco,
                            fontSize:
                              "26px",
                            fontWeight: 900,
                            fontStyle:
                              "italic",
                            lineHeight: 0.96,
                            textTransform:
                              "uppercase",
                            ...estiloTextoRecortado(
                              2,
                            ),
                          }}
                        >
                          {
                            partido.nombreRival ??
                            "—"
                          }
                        </p>

                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "flex-start",
                            gap: "8px",
                            minWidth: 0,
                            marginTop:
                              "10px",
                            color:
                              COLORES.amarillo,
                          }}
                        >
                          <IconoUbicacion
                            tamaño={18}
                            color={
                              COLORES.amarillo
                            }
                          />

                          <p
                            style={{
                              minWidth: 0,
                              margin: 0,
                              color:
                                "#fff4a3",
                              fontSize:
                                "18px",
                              fontWeight:
                                700,
                              lineHeight: 1,
                              textTransform:
                                "uppercase",
                              ...estiloTextoRecortado(
                                2,
                              ),
                            }}
                          >
                            {lugar}
                          </p>
                        </div>
                      </div>

                      <div
                        aria-hidden="true"
                        style={{
                          position:
                            "absolute",
                          zIndex: 2,
                          top: 0,
                          right: 0,
                          width: "7px",
                          height: "100%",
                          backgroundColor:
                            COLORES.amarillo,
                        }}
                      />
                    </article>
                  );
                },
              )}
            </div>
          </div>
        </div>
      );
    },
  );

PaginaPublicacionPartidos.displayName =
  "PaginaPublicacionPartidos";

export default PaginaPublicacionPartidos;