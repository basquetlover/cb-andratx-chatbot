import {
  useMemo,
  useRef,
  useState,
} from "react";

import { toPng } from "html-to-image";

// ======================================================
// TIPOS
// ======================================================

export type FuncionDesignacion =
  | "AP"
  | "AX"
  | "AN"
  | "CR"
  | "OP"
  | "AY";

export interface FilaDesignacionImagen {
  funcion: FuncionDesignacion;
  nombreCompleto: string;
}

export interface DatosImagenDesignacion {
  grupo: string | null;
  jornada: string | number | null;

  fecha: string | null;
  hora: string | null;

  lugar: string | null;

  equipoLocal: string | null;
  equipoVisitante: string | null;

  numeroPartido: string | null;

  fechaGeneracion?: string | Date | null;

  modificado?: boolean;
  estadoModificacionTexto?: string | null;
}

interface Props {
  datos: DatosImagenDesignacion;
  designaciones: FilaDesignacionImagen[];

  mostrarBotonDescarga?: boolean;

  nombreClub?: string;
  escudoSrc?: string;
}

// ======================================================
// CONFIGURACIÓN VISUAL
// ======================================================

const COLOR_FONDO = "#F2F2F2";
const COLOR_AZUL = "#0E4A8A";
const COLOR_AZUL_OSCURO = "#153F7B";
const COLOR_AMARILLO = "#E2B625";
const COLOR_GRIS_CAJA = "#E7E7E7";
const COLOR_BORDE = "#0E4A8A";

const LEYENDA: {
  codigo: FuncionDesignacion;
  texto: string;
}[] = [
  {
    codigo: "AP",
    texto: "ÁRBITRO PRINCIPAL",
  },
  {
    codigo: "AX",
    texto: "ÁRBITRO AUXILIAR",
  },
  {
    codigo: "AN",
    texto: "ANOTADOR",
  },
  {
    codigo: "CR",
    texto: "CRONOMETRADOR",
  },
  {
    codigo: "OP",
    texto: "OPERADOR RLL",
  },
  {
    codigo: "AY",
    texto: "AYUDANTE ANOTADOR",
  },
];

// ======================================================
// UTILIDADES
// ======================================================

function texto(valor: unknown): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function obtenerTexto(
  valor: string | number | null | undefined,
  fallback = "—",
): string {
  if (typeof valor === "number") {
    return String(valor);
  }

  const normalizado = texto(valor);

  return normalizado || fallback;
}

function formatearFechaVisual(
  valor: string | null | undefined,
): string {
  const fecha = texto(valor);

  if (!fecha) {
    return "—";
  }

  // Acepta YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [yyyy, mm, dd] = fecha.split("-");
    return `${dd} / ${mm} / ${yyyy}`;
  }

  return fecha;
}

function formatearFechaGeneracion(
  valor?: string | Date | null,
): string {
  if (!valor) {
    const ahora = new Date();
    return [
      String(ahora.getDate()).padStart(2, "0"),
      String(ahora.getMonth() + 1).padStart(2, "0"),
      String(ahora.getFullYear()),
    ].join("/");
  }

  if (valor instanceof Date) {
    return [
      String(valor.getDate()).padStart(2, "0"),
      String(valor.getMonth() + 1).padStart(2, "0"),
      String(valor.getFullYear()),
    ].join("/");
  }

  const textoValor = texto(valor);

  if (/^\d{4}-\d{2}-\d{2}/.test(textoValor)) {
    const fecha = textoValor.slice(0, 10);
    const [yyyy, mm, dd] = fecha.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }

  return textoValor;
}

function obtenerEstadoModificacion(
  datos: DatosImagenDesignacion,
): string {
  const personalizado = texto(
    datos.estadoModificacionTexto,
  );

  if (personalizado) {
    return personalizado.toUpperCase();
  }

  return datos.modificado
    ? "MODIFICADO"
    : "SIN MODIFICACIONES";
}

function obtenerNombreDescarga(
  fecha: string | null | undefined,
  hora: string | null | undefined,
): string {
  // El usuario pidió el formato:
  // dd/mm/aaaa-hh:mm.png
  //
  // Como / y : no son válidos como nombre de archivo
  // en Windows, se sanitiza a:
  // dd-mm-aaaa-hh-mm.png

  const fechaTexto = texto(fecha);
  const horaTexto = texto(hora);

  let dd = "00";
  let mm = "00";
  let yyyy = "0000";

  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
    const partes = fechaTexto.split("-");
    yyyy = partes[0];
    mm = partes[1];
    dd = partes[2];
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaTexto)) {
    const partes = fechaTexto.split("/");
    dd = partes[0];
    mm = partes[1];
    yyyy = partes[2];
  }

  let hh = "00";
  let min = "00";

  if (/^\d{2}:\d{2}$/.test(horaTexto)) {
    const partesHora = horaTexto.split(":");
    hh = partesHora[0];
    min = partesHora[1];
  }

  return `${dd}-${mm}-${yyyy}-${hh}-${min}.png`;
}

function normalizarFilas(
  designaciones: FilaDesignacionImagen[],
): FilaDesignacionImagen[] {
  const limpias = designaciones
    .map((fila) => ({
      funcion: fila.funcion,
      nombreCompleto: texto(fila.nombreCompleto),
    }))
    .filter((fila) => fila.nombreCompleto);

  if (limpias.length > 0) {
    return limpias;
  }

  return [
    {
      funcion: "AP",
      nombreCompleto: "—",
    },
  ];
}

// ======================================================
// COMPONENTES DE APOYO
// ======================================================

function SubtituloSeccion({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        style={{
          color: COLOR_AZUL_OSCURO,
          fontSize: "31px",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          margin: 0,
          textTransform: "uppercase",
          fontFamily:
            '"Arial", "Helvetica", sans-serif',
        }}
      >
        {children}
      </h3>

      <div
        style={{
          width: "250px",
          height: "4px",
          background: COLOR_AMARILLO,
          marginTop: "18px",
        }}
      />
    </div>
  );
}

function CajaDato({
  etiqueta,
  valor,
  anchoCompleto = false,
}: {
  etiqueta: string;
  valor: string;
  anchoCompleto?: boolean;
}) {
  return (
    <div
      style={{
        background: COLOR_GRIS_CAJA,
        minHeight: "50px",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gridColumn: anchoCompleto ? "1 / -1" : undefined,
      }}
    >
      <span
        style={{
          color: COLOR_AZUL_OSCURO,
          fontWeight: 800,
          fontSize: "25px",
          lineHeight: 1,
          fontFamily:
            '"Arial", "Helvetica", sans-serif',
          textTransform: "uppercase",
        }}
      >
        {etiqueta}:
      </span>

      <span
        style={{
          marginLeft: "10px",
          color: COLOR_AZUL_OSCURO,
          fontWeight: 500,
          fontSize: "25px",
          lineHeight: 1.15,
          fontFamily:
            '"Arial", "Helvetica", sans-serif',
        }}
      >
        {valor}
      </span>
    </div>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function GeneradorImagenDesignacion({
  datos,
  designaciones,
  mostrarBotonDescarga = true,
  nombreClub = "CLUB BÀSQUET ANDRATX",
  escudoSrc = "/favicon.svg",
}: Props) {
  const referenciaImagen =
    useRef<HTMLDivElement | null>(null);

  const [descargando, setDescargando] =
    useState(false);

  const filas = useMemo(
    () => normalizarFilas(designaciones),
    [designaciones],
  );

  const estadoModificacion = useMemo(
    () => obtenerEstadoModificacion(datos),
    [datos],
  );

  async function descargarImagen() {
    if (!referenciaImagen.current || descargando) {
      return;
    }

    setDescargando(true);

    try {
      const dataUrl = await toPng(
        referenciaImagen.current,
        {
          cacheBust: true,
          pixelRatio: 2.5,
          backgroundColor: COLOR_FONDO,
        },
      );

      const enlace =
        document.createElement("a");

      enlace.href = dataUrl;
      enlace.download =
        obtenerNombreDescarga(
          datos.fecha,
          datos.hora,
        );

      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
    } catch (error) {
      console.error(
        "[DESIGNACIONES] Error exportando PNG:",
        error,
      );

      window.alert(
        "No se ha podido generar la imagen PNG.",
      );
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="space-y-5">
      {mostrarBotonDescarga && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
          <div>
            <h3 className="text-lg font-extrabold text-on-surface">
              Imagen de designación
            </h3>

            <p className="mt-1 text-sm text-on-surface-variant">
              Vista previa preparada para descargar en PNG.
            </p>
          </div>

          <button
            type="button"
            onClick={descargarImagen}
            disabled={descargando}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {descargando
              ? "Generando PNG..."
              : "Descargar imagen"}
          </button>
        </div>
      )}

      <div className="overflow-auto rounded-2xl border border-outline-variant/60 bg-surface-container p-4 shadow-sm">
        <div
          ref={referenciaImagen}
          style={{
            width: "1000px",
            background: COLOR_FONDO,
            color: COLOR_AZUL_OSCURO,
            padding: "44px 48px 42px 48px",
            boxSizing: "border-box",
            fontFamily:
              '"Arial", "Helvetica", sans-serif',
          }}
        >
          {/* CABECERA */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  color: COLOR_AZUL_OSCURO,
                  fontSize: "28px",
                  lineHeight: 1.15,
                  fontWeight: 500,
                  fontFamily:
                    '"Arial", "Helvetica", sans-serif',
                  letterSpacing: "0.01em",
                }}
              >
                {nombreClub}
              </div>

              <div
                style={{
                  marginTop: "20px",
                  color: COLOR_AZUL_OSCURO,
                  fontSize: "88px",
                  lineHeight: 0.9,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  textTransform: "uppercase",
                  fontFamily:
                    '"Arial Narrow", "Roboto Condensed", "Oswald", sans-serif',
                }}
              >
                DESIGNACIONES
              </div>

              <div
                style={{
                  width: "330px",
                  height: "6px",
                  background: COLOR_AMARILLO,
                  marginTop: "30px",
                }}
              />
            </div>

            <div
              style={{
                width: "170px",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                flexShrink: 0,
              }}
            >
              <img
                src={escudoSrc}
                alt="Escudo C.B. Andratx"
                style={{
                  width: "150px",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* BANDA GRUPO / JORNADA */}
          <div
            style={{
              marginTop: "36px",
              background: COLOR_AZUL,
              minHeight: "56px",
              borderRadius: "4px",
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1fr 34px 0.9fr",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  color: COLOR_AMARILLO,
                  fontWeight: 800,
                  fontSize: "24px",
                  textTransform: "uppercase",
                }}
              >
                Grupo:
              </span>

              <span
                style={{
                  color: "#FFFFFF",
                  fontWeight: 500,
                  fontSize: "24px",
                }}
              >
                {obtenerTexto(datos.grupo)}
              </span>
            </div>

            <div
              style={{
                width: "22px",
                height: "100%",
                background: COLOR_AMARILLO,
                transform: "skewX(-24deg)",
                justifySelf: "center",
              }}
            />

            <div
              style={{
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  color: COLOR_AMARILLO,
                  fontWeight: 800,
                  fontSize: "24px",
                  textTransform: "uppercase",
                }}
              >
                Jornada:
              </span>

              <span
                style={{
                  color: "#FFFFFF",
                  fontWeight: 500,
                  fontSize: "24px",
                }}
              >
                {obtenerTexto(datos.jornada)}
              </span>
            </div>
          </div>

          {/* DATOS DEL PARTIDO */}
          <div style={{ marginTop: "42px" }}>
            <SubtituloSeccion>
              DATOS DEL PARTIDO
            </SubtituloSeccion>

            <div
              style={{
                marginTop: "30px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px 32px",
              }}
            >
              <CajaDato
                etiqueta="FECHA"
                valor={formatearFechaVisual(
                  datos.fecha,
                )}
              />

              <CajaDato
                etiqueta="HORA"
                valor={obtenerTexto(datos.hora)}
              />

              <CajaDato
                etiqueta="LUGAR"
                valor={obtenerTexto(datos.lugar)}
                anchoCompleto
              />

              <CajaDato
                etiqueta="LOCAL"
                valor={obtenerTexto(
                  datos.equipoLocal,
                )}
                anchoCompleto
              />

              <CajaDato
                etiqueta="VISITANTE"
                valor={obtenerTexto(
                  datos.equipoVisitante,
                )}
                anchoCompleto
              />
            </div>
          </div>

          {/* TABLA DE DESIGNACIONES */}
          <div style={{ marginTop: "38px" }}>
            <SubtituloSeccion>
              ÁRBITROS Y OFICIALES DE MESA
            </SubtituloSeccion>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "34px",
                tableLayout: "fixed",
                border: `3px solid ${COLOR_BORDE}`,
                background: COLOR_FONDO,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: COLOR_AZUL,
                    color: "#FFFFFF",
                  }}
                >
                  <th
                    style={{
                      width: "220px",
                      borderRight: `3px solid ${COLOR_FONDO}`,
                      padding: "14px 14px",
                      fontSize: "24px",
                      lineHeight: 1.1,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    FUNCIÓN
                  </th>

                  <th
                    style={{
                      padding: "14px 20px",
                      fontSize: "24px",
                      lineHeight: 1.1,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    NOMBRE COMPLETO
                  </th>
                </tr>
              </thead>

              <tbody>
                {filas.map((fila, indice) => (
                  <tr key={`${fila.funcion}-${indice}`}>
                    <td
                      style={{
                        borderTop:
                          indice === 0
                            ? "none"
                            : `3px solid ${COLOR_BORDE}`,
                        borderRight: `3px solid ${COLOR_BORDE}`,
                        padding: "14px 12px",
                        textAlign: "center",
                        color: COLOR_AZUL_OSCURO,
                        fontSize: "22px",
                        lineHeight: 1.1,
                        fontWeight: 800,
                        textTransform: "uppercase",
                      }}
                    >
                      {fila.funcion}
                    </td>

                    <td
                      style={{
                        borderTop:
                          indice === 0
                            ? "none"
                            : `3px solid ${COLOR_BORDE}`,
                        padding: "14px 18px 14px 48px",
                        color: COLOR_AZUL_OSCURO,
                        fontSize: "22px",
                        lineHeight: 1.15,
                        fontWeight: 500,
                      }}
                    >
                      {fila.nombreCompleto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* LEYENDA */}
          <div style={{ marginTop: "52px" }}>
            <SubtituloSeccion>
              LEYENDA
            </SubtituloSeccion>

            <div
              style={{
                marginTop: "28px",
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr 1fr",
                rowGap: "12px",
                columnGap: "34px",
              }}
            >
              {LEYENDA.map((item) => (
                <div
                  key={item.codigo}
                  style={{
                    color: COLOR_AZUL_OSCURO,
                    fontSize: "20px",
                    lineHeight: 1.15,
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 500,
                    }}
                  >
                    {item.codigo}
                  </span>

                  <span
                    style={{
                      fontWeight: 500,
                    }}
                  >
                    ·
                  </span>

                  <span
                    style={{
                      fontWeight: 500,
                    }}
                  >
                    {item.texto}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PIE */}
          <div
            style={{
              marginTop: "58px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              alignItems: "end",
              gap: "16px",
            }}
          >
            <div
              style={{
                color: COLOR_AZUL_OSCURO,
                fontSize: "16px",
                lineHeight: 1.2,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              NÚM PARTIDO:
              <span
                style={{
                  fontWeight: 500,
                  marginLeft: "6px",
                  textTransform: "none",
                }}
              >
                {obtenerTexto(datos.numeroPartido)}
              </span>
            </div>

            <div
              style={{
                color: COLOR_AZUL_OSCURO,
                fontSize: "16px",
                lineHeight: 1.2,
                fontWeight: 800,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              FECHA GENERACIÓN:
              <span
                style={{
                  fontWeight: 500,
                  marginLeft: "6px",
                  textTransform: "none",
                }}
              >
                {formatearFechaGeneracion(
                  datos.fechaGeneracion,
                )}
              </span>
            </div>

            <div
              style={{
                color: COLOR_AZUL_OSCURO,
                fontSize: "16px",
                lineHeight: 1.2,
                fontWeight: 800,
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              {estadoModificacion}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}