
import {
  useState,
} from "react";

import {
  formatearImporte,
} from "@servicios/backend/designaciones/tarifasLiquidaciones";

import {
  puedeExportarLiquidaciones,
  formatearFechaLiquidacion,
  formatearPeriodoLiquidacion,
  obtenerNombrePdfLiquidaciones,
  type ResultadoLiquidaciones,
  type LiquidacionPersona,
  type LineaLiquidacion,
} from "@servicios/backend/designaciones/calcularLiquidaciones";

// ======================================================
// TIPOS
// ======================================================

interface Props {
  resultado: ResultadoLiquidaciones;

  disabled?: boolean;

  motivoDeshabilitado?: string | null;
}

type NombreIcono =
  | "pdf"
  | "informacion"
  | "error";

// ======================================================
// CONFIGURACIÓN DEL DOCUMENTO
// ======================================================

const CLUB = {
  nombre: "Club Bàsquet Andratx",

  nombreCorto: "C.B. Andratx",

  web: "www.cbandratx.es",

  escudo: "/favicon.svg",

  colorPrincipal: "#032a55",

  colorSecundario: "#0b87ca",

  colorAcento: "#ffc801",
};

const ZONA_HORARIA =
  "Europe/Madrid";

// ======================================================
// UTILIDADES
// ======================================================

function escaparHtml(
  valor: unknown,
): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mostrarImporte(
  importe: number | null,
): string {
  if (importe === null) {
    return "Pendiente";
  }

  return formatearImporte(
    importe,
  );
}

function obtenerFechaEmision(): string {
  return new Intl.DateTimeFormat(
    "es-ES",
    {
      timeZone: ZONA_HORARIA,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(new Date());
}

// ======================================================
// ICONOS
// ======================================================

function Icono({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: NombreIcono;
  className?: string;
}) {
  const propiedades = {
    className,

    width: 24,
    height: 24,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",
    strokeWidth: 1.8,

    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,

    "aria-hidden": true as const,
  };

  switch (nombre) {
    case "pdf":
      return (
        <svg {...propiedades}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M12 11v7M9 15l3 3 3-3" />
        </svg>
      );

    case "informacion":
      return (
        <svg {...propiedades}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M12 11v5M12 8h.01" />
        </svg>
      );

    case "error":
      return (
        <svg {...propiedades}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M12 8v5M12 16h.01" />
        </svg>
      );

    default:
      return null;
  }
}

// ======================================================
// FILA DE ACTUACIÓN
// ======================================================

function generarFilaActuacion(
  actuacion: LineaLiquidacion,
): string {
  return `
    <tr>
      <td class="categoria">
        ${escaparHtml(
          actuacion.categoria,
        )}
      </td>

      <td class="numero-partido">
        ${escaparHtml(
          actuacion.numeroPartido,
        )}
      </td>

      <td class="fecha-hora">
        ${escaparHtml(
          formatearFechaLiquidacion(
            actuacion.fecha,
          ),
        )}

        <span class="hora">
          ${escaparHtml(
            actuacion.hora
              ? `${actuacion.hora} h`
              : "Sin hora",
          )}
        </span>
      </td>

      <td class="funcion">
        ${escaparHtml(
          actuacion.funcion,
        )}
      </td>

      <td class="importe">
        ${escaparHtml(
          mostrarImporte(
            actuacion.importe,
          ),
        )}
      </td>
    </tr>
  `;
}

// ======================================================
// LIQUIDACIÓN INDIVIDUAL
// ======================================================

function generarLiquidacionPersona(
  liquidacion: LiquidacionPersona,
): string {
  const filas =
    liquidacion.actuaciones
      .map(
        generarFilaActuacion,
      )
      .join("");

  return `
    <section class="liquidacion-persona">

      <table class="tabla-actuaciones">

        <colgroup>
          <col class="col-categoria" />
          <col class="col-partido" />
          <col class="col-fecha" />
          <col class="col-funcion" />
          <col class="col-importe" />
        </colgroup>

        <thead>

          <tr class="fila-persona">
            <td colspan="5">

              <div class="encabezado-persona">

                <div class="datos-persona">

                  <div class="identificacion-persona">

                    <span class="licencia-persona">
                      ${escaparHtml(
                        liquidacion.codigo,
                      )}
                    </span>

                    <span class="nombre-persona">
                      ${escaparHtml(
                        liquidacion.nombreCompleto,
                      )}
                    </span>

                  </div>

                  <div class="resumen-persona">
                    ${liquidacion.totalPartidos}
                    ${
                      liquidacion.totalPartidos === 1
                        ? "partido"
                        : "partidos"
                    }

                    ·

                    ${liquidacion.totalActuaciones}
                    ${
                      liquidacion.totalActuaciones === 1
                        ? "actuación"
                        : "actuaciones"
                    }
                  </div>

                </div>

                <div class="total-persona">

                  <span class="etiqueta-total">
                    TOTAL DEL PERIODO
                  </span>

                  <strong>
                    ${escaparHtml(
                      mostrarImporte(
                        liquidacion.totalImporte,
                      ),
                    )}
                  </strong>

                </div>

              </div>

            </td>
          </tr>

          <tr class="cabecera-columnas">
            <th scope="col">
              Categoría
            </th>

            <th scope="col">
              N.º partido
            </th>

            <th scope="col">
              Fecha y hora
            </th>

            <th scope="col" class="centrado">
              Función
            </th>

            <th scope="col" class="alineado-derecha">
              Importe
            </th>
          </tr>

        </thead>

        <tbody>
          ${filas}
        </tbody>

      </table>

    </section>
  `;
}

// ======================================================
// RESUMEN GENERAL
// ======================================================

function generarResumenGeneral(
  resultado: ResultadoLiquidaciones,
): string {
  const resumen =
    resultado.resumen;

  return `
    <section class="resumen-general">

      <div class="indicador">
        <span>PERSONAL</span>
        <strong>
          ${resumen.totalPersonas}
        </strong>
      </div>

      <div class="indicador">
        <span>PARTIDOS</span>
        <strong>
          ${resumen.totalPartidos}
        </strong>
      </div>

      <div class="indicador">
        <span>ACTUACIONES</span>
        <strong>
          ${resumen.totalActuaciones}
        </strong>
      </div>

      <div class="indicador indicador-principal">
        <span>IMPORTE TOTAL</span>
        <strong>
          ${escaparHtml(
            mostrarImporte(
              resumen.totalImporte,
            ),
          )}
        </strong>
      </div>

    </section>
  `;
}

// ======================================================
// TOTAL GENERAL FINAL
// ======================================================

function generarTotalFinal(
  resultado: ResultadoLiquidaciones,
): string {
  const resumen =
    resultado.resumen;

  return `
    <section class="total-general-final">

      <div>
        <h2>
          TOTAL GENERAL DE LA LIQUIDACIÓN
        </h2>

        <p>
          ${resumen.totalPersonas}
          personas

          ·

          ${resumen.totalPartidos}
          partidos

          ·

          ${resumen.totalActuaciones}
          actuaciones
        </p>
      </div>

      <strong>
        ${escaparHtml(
          mostrarImporte(
            resumen.totalImporte,
          ),
        )}
      </strong>

    </section>
  `;
}

// ======================================================
// ESTILOS DEL DOCUMENTO
// ======================================================

function generarEstilos(): string {
  return `
    :root {
      --color-principal:
        ${CLUB.colorPrincipal};

      --color-secundario:
        ${CLUB.colorSecundario};

      --color-acento:
        ${CLUB.colorAcento};

      --color-texto: #172536;

      --color-secundario-texto: #536174;

      --color-borde: #dce3e9;

      --color-fondo: #f2f5f8;
    }

    * {
      box-sizing: border-box;
    }

    html {
      font-family:
        Arial,
        Helvetica,
        sans-serif;

      color: var(--color-texto);

      font-size: 10pt;

      font-variant-numeric:
        tabular-nums;

      -webkit-print-color-adjust:
        exact;

      print-color-adjust:
        exact;
    }

    body {
      margin: 0;
      padding: 0;

      background: #e9edf1;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    /* DOCUMENTO */

    .documento {
      width: 210mm;

      min-height: 297mm;

      margin: 20px auto;

      padding: 12mm;

      background: #ffffff;

      box-shadow:
        0 4px 24px rgba(0, 0, 0, 0.1);
    }

    /* BARRA DE ACCIONES */

    .barra-acciones {
      position: sticky;
      top: 0;
      z-index: 10;

      display: flex;

      align-items: center;
      justify-content: space-between;

      gap: 16px;

      padding: 14px 24px;

      color: #ffffff;

      background:
        var(--color-principal);
    }

    .barra-acciones p {
      font-size: 13px;
      line-height: 1.5;
    }

    .barra-acciones-botones {
      display: flex;
      gap: 8px;

      flex-shrink: 0;
    }

    .boton {
      border: 0;

      border-radius: 6px;

      padding: 10px 16px;

      font-family: inherit;

      font-size: 13px;

      font-weight: bold;

      cursor: pointer;
    }

    .boton-imprimir {
      color: var(--color-principal);

      background: #ffffff;
    }

    .boton-cerrar {
      color: #ffffff;

      background: transparent;

      border:
        1px solid rgba(255, 255, 255, 0.5);
    }

    /* ENCABEZADO CORPORATIVO */

    .encabezado-documento {
      display: flex;

      align-items: center;
      justify-content: space-between;

      gap: 15px;

      padding-bottom: 14px;

      border-bottom:
        3px solid var(--color-principal);

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .identidad-club {
      display: flex;

      align-items: center;

      gap: 13px;
    }

    .escudo-club {
      width: 20mm;
      height: 20mm;

      object-fit: contain;

      flex-shrink: 0;
    }

    .nombre-club {
      color: var(--color-principal);

      font-weight: 800;
      font-size: 15pt;
    }

    .subtitulo-club {
      margin-top: 4px;

      color: var(--color-secundario-texto);

      font-size: 9pt;
    }

    .datos-documento {
      flex-shrink: 0;

      text-align: right;
    }

    .tipo-documento {
      color: var(--color-principal);

      font-weight: 800;
      font-size: 9pt;

      letter-spacing: 0.5px;
    }

    .fecha-emision {
      margin-top: 5px;

      color: var(--color-secundario-texto);

      font-size: 8pt;
    }

    /* TÍTULO Y PERIODO */

    .titulo-documento {
      margin-top: 18px;

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .titulo-documento h1 {
      color: var(--color-principal);

      font-size: 19pt;

      font-weight: 800;
    }

    .periodo-documento {
      display: inline-block;

      margin-top: 7px;

      padding: 6px 10px;

      border-left:
        3px solid var(--color-secundario);

      background: var(--color-fondo);

      color: var(--color-texto);

      font-size: 10pt;
      font-weight: 700;
    }

    /* RESUMEN GENERAL */

    .resumen-general {
      display: grid;

      grid-template-columns:
        repeat(4, minmax(0, 1fr));

      gap: 8px;

      margin-top: 18px;
      margin-bottom: 23px;

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .indicador {
      display: flex;

      flex-direction: column;

      gap: 6px;

      padding: 10px;

      border:
        1px solid var(--color-borde);

      border-radius: 5px;
    }

    .indicador span {
      color: var(--color-secundario-texto);

      font-weight: 700;
      font-size: 7pt;

      letter-spacing: 0.4px;
    }

    .indicador strong {
      color: var(--color-principal);

      font-weight: 800;
      font-size: 16pt;
    }

    .indicador-principal {
      border-color:
        var(--color-principal);

      background:
        var(--color-principal);

      color: #ffffff;
    }

    .indicador-principal span,
    .indicador-principal strong {
      color: #ffffff;
    }

    .indicador-principal strong {
      font-size: 14pt;
    }

    /* LIQUIDACIONES INDIVIDUALES */

    .liquidacion-persona {
      margin-top: 17px;

      break-inside: auto;
      page-break-inside: auto;
    }

    .encabezado-persona {
      display: flex;

      align-items: center;
      justify-content: space-between;

      gap: 12px;

      padding: 11px 12px;

      border-left:
        4px solid var(--color-secundario);

      background:
        var(--color-fondo);
    }

    .datos-persona {
      flex: 1;

      min-width: 0;
    }

    .identificacion-persona {
      display: flex;

      flex-wrap: wrap;

      align-items: baseline;

      gap: 8px;
    }

    .licencia-persona {
      color:
        var(--color-secundario);

      font-weight: 800;
      font-size: 9pt;

      white-space: nowrap;
    }

    .nombre-persona {
      color:
        var(--color-principal);

      font-weight: 800;
      font-size: 11pt;

      overflow-wrap: anywhere;
    }

    .resumen-persona {
      margin-top: 5px;

      color:
        var(--color-secundario-texto);

      font-size: 8pt;
    }

    .total-persona {
      display: flex;

      flex-direction: column;

      gap: 4px;

      flex-shrink: 0;

      text-align: right;
    }

    .etiqueta-total {
      color:
        var(--color-secundario-texto);

      font-weight: 700;
      font-size: 7pt;
    }

    .total-persona strong {
      color:
        var(--color-principal);

      font-weight: 800;
      font-size: 15pt;

      white-space: nowrap;
    }

    /* TABLAS */

    .tabla-actuaciones {
      width: 100%;

      border-collapse: collapse;

      table-layout: fixed;

      border:
        1px solid var(--color-borde);

      font-size: 8.5pt;
    }

    .col-categoria {
      width: 29%;
    }

    .col-partido {
      width: 19%;
    }

    .col-fecha {
      width: 26%;
    }

    .col-funcion {
      width: 11%;
    }

    .col-importe {
      width: 15%;
    }

    .tabla-actuaciones thead {
      display: table-header-group;
    }

    .tabla-actuaciones tbody {
      display: table-row-group;
    }

    .tabla-actuaciones thead,
    .tabla-actuaciones tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .fila-persona td {
      padding: 0;

      border: 0;
    }

    .cabecera-columnas {
      color: #ffffff;

      background:
        var(--color-principal);
    }

    .cabecera-columnas th {
      padding: 7px 8px;

      text-align: left;

      font-weight: 700;
      font-size: 8pt;
    }

    .cabecera-columnas .centrado {
      text-align: center;
    }

    .cabecera-columnas .alineado-derecha {
      text-align: right;
    }

    .tabla-actuaciones tbody td {
      padding: 8px;

      border-bottom:
        1px solid var(--color-borde);

      vertical-align: middle;

      overflow-wrap: anywhere;
    }

    .tabla-actuaciones tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .tabla-actuaciones tbody tr:last-child td {
      border-bottom: 0;
    }

    .categoria {
      font-weight: 600;
    }

    .numero-partido {
      color: var(--color-secundario-texto);
    }

    .fecha-hora {
      font-size: 8pt;
    }

    .hora {
      display: inline-block;

      margin-left: 4px;

      color: var(--color-secundario-texto);

      white-space: nowrap;
    }

    .funcion {
      text-align: center;

      font-weight: 800;

      color: var(--color-principal);
    }

    .importe {
      text-align: right;

      font-weight: 700;
    }

    /* TOTAL GENERAL FINAL */

    .total-general-final {
      display: flex;

      align-items: center;
      justify-content: space-between;

      gap: 14px;

      margin-top: 22px;

      padding: 14px;

      color: #ffffff;

      background:
        var(--color-principal);

      border-left:
        5px solid var(--color-acento);

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .total-general-final h2 {
      font-size: 10pt;

      font-weight: 800;
    }

    .total-general-final p {
      margin-top: 5px;

      font-size: 8pt;

      color: #e1e4e7;
    }

    .total-general-final strong {
      font-size: 19pt;

      font-weight: 800;

      white-space: nowrap;
    }

    /* PIE DEL DOCUMENTO */

    .pie-documento {
      display: flex;

      justify-content: space-between;
      align-items: flex-start;

      gap: 12px;

      margin-top: 18px;

      padding-top: 10px;

      border-top:
        1px solid var(--color-borde);

      color:
        var(--color-secundario-texto);

      font-size: 7.5pt;

      line-height: 1.5;

      break-inside: avoid;
      page-break-inside: avoid;
    }

    .pie-documento .web {
      flex-shrink: 0;

      font-weight: 700;

      color:
        var(--color-principal);
    }

    /* CONFIGURACIÓN DIN A4 */

    @page {
      size: A4 portrait;

      margin: 12mm 12mm 15mm;

      @bottom-left {
        content: "C.B. Andratx · Liquidaciones";

        color: #536174;

        font-family: Arial, sans-serif;

        font-size: 7pt;
      }

      @bottom-right {
        content:
          "Página "
          counter(page)
          " de "
          counter(pages);

        color: #536174;

        font-family: Arial, sans-serif;

        font-size: 7pt;
      }
    }

    /* ESTILOS DE IMPRESIÓN */

    @media print {
      html,
      body {
        width: auto;

        min-height: auto;

        margin: 0;
        padding: 0;

        background: #ffffff;
      }

      .barra-acciones {
        display: none !important;
      }

      .documento {
        width: auto;

        min-height: auto;

        margin: 0;
        padding: 0;

        box-shadow: none;
      }

      .tabla-actuaciones thead {
        display: table-header-group;
      }

      .tabla-actuaciones tbody {
        display: table-row-group;
      }

      .tabla-actuaciones thead,
      .tabla-actuaciones tr,
      .encabezado-persona {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .liquidacion-persona {
        break-inside: auto;
        page-break-inside: auto;
      }
    }

    /* VISTA PREVIA EN PANTALLAS PEQUEÑAS */

    @media screen and (max-width: 850px) {
      .documento {
        margin: 12px auto;
      }

      .barra-acciones {
        position: static;

        min-width: 320px;

        flex-wrap: wrap;
      }
    }
  `;
}

// ======================================================
// GENERAR DOCUMENTO HTML
// ======================================================

function generarDocumentoHtml(
  resultado: ResultadoLiquidaciones,
  urlEscudo: string,
): string {
  const periodo =
    formatearPeriodoLiquidacion(
      resultado.periodo,
    );

  const nombreArchivo =
    obtenerNombrePdfLiquidaciones(
      resultado.periodo,
    ).replace(/\.pdf$/i, "");

  const fechaEmision =
    obtenerFechaEmision();

  const liquidaciones =
    resultado.liquidaciones
      .map(
        generarLiquidacionPersona,
      )
      .join("");

  return `
    <!DOCTYPE html>

    <html lang="es">

      <head>

        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>
          ${escaparHtml(nombreArchivo)}
        </title>

        <style>
          ${generarEstilos()}
        </style>

      </head>

      <body>

        <!-- ACCIONES DE VISTA PREVIA -->

        <div class="barra-acciones">

          <p>
            Vista previa de la liquidación.
            Selecciona «Guardar como PDF»
            en las opciones de impresión.
          </p>

          <div class="barra-acciones-botones">

            <button
              type="button"
              class="boton boton-imprimir"
              id="boton-imprimir"
              disabled
            >
              Guardar como PDF
            </button>

            <button
              type="button"
              class="boton boton-cerrar"
              id="boton-cerrar"
            >
              Cerrar
            </button>

          </div>

        </div>

        <!-- DOCUMENTO -->

        <main class="documento">

          <!-- ENCABEZADO CORPORATIVO -->

          <header class="encabezado-documento">

            <div class="identidad-club">

              <img
                class="escudo-club"
                src="${escaparHtml(urlEscudo)}"
                alt="Escudo del C.B. Andratx"
              />

              <div>

                <p class="nombre-club">
                  ${escaparHtml(CLUB.nombre)}
                </p>

                <p class="subtitulo-club">
                  Área de arbitraje y designaciones
                </p>

              </div>

            </div>

            <div class="datos-documento">

              <p class="tipo-documento">
                DOCUMENTO INTERNO
              </p>

              <p class="fecha-emision">
                Emisión:
                ${escaparHtml(fechaEmision)}
              </p>

            </div>

          </header>

          <!-- TÍTULO -->

          <section class="titulo-documento">

            <h1>
              Liquidaciones de arbitraje
            </h1>

            <p class="periodo-documento">
              Periodo:
              ${escaparHtml(periodo)}
            </p>

          </section>

          <!-- RESUMEN GENERAL -->

          ${generarResumenGeneral(resultado)}

          <!-- LIQUIDACIONES INDIVIDUALES -->

          ${liquidaciones}

          <!-- TOTAL FINAL -->

          ${generarTotalFinal(resultado)}

          <!-- PIE DEL DOCUMENTO -->

          <footer class="pie-documento">

           

            

          </footer>

        </main>

      </body>

    </html>
  `;
}

// ======================================================
// ESPERAR A QUE SE CARGUEN LAS IMÁGENES
// ======================================================

async function esperarImagenes(
  documento: Document,
): Promise<void> {
  const imagenes = Array.from(
    documento.images,
  );

  await Promise.all(
    imagenes.map(
      (imagen) =>
        new Promise<void>((resolve) => {
          if (imagen.complete) {
            if (imagen.naturalWidth === 0) {
              imagen.style.display = "none";
            }

            resolve();

            return;
          }

          let finalizado = false;

          const temporizador =
            window.setTimeout(
              finalizar,
              5000,
            );

          function finalizar() {
            if (finalizado) {
              return;
            }

            finalizado = true;

            window.clearTimeout(
              temporizador,
            );

            imagen.removeEventListener(
              "load",
              finalizar,
            );

            imagen.removeEventListener(
              "error",
              finalizar,
            );

            if (imagen.naturalWidth === 0) {
              imagen.style.display = "none";
            }

            resolve();
          }

          imagen.addEventListener(
            "load",
            finalizar,
            { once: true },
          );

          imagen.addEventListener(
            "error",
            finalizar,
            { once: true },
          );

          if (imagen.complete) {
            finalizar();
          }
        }),
    ),
  );
}

// ======================================================
// ABRIR DOCUMENTO PARA EXPORTAR
// ======================================================

export async function abrirPdfLiquidaciones(
  resultado: ResultadoLiquidaciones,
): Promise<void> {
  if (
    typeof window === "undefined"
  ) {
    throw new Error(
      "La exportación debe realizarse desde el navegador.",
    );
  }

  if (
    !puedeExportarLiquidaciones(
      resultado,
    )
  ) {
    throw new Error(
      "La liquidación contiene datos incompletos o no tiene actuaciones para exportar.",
    );
  }

  const ventana = window.open(
    "",
    "_blank",
  );

  if (!ventana) {
    throw new Error(
      "El navegador ha bloqueado la ventana de exportación. Permite las ventanas emergentes para continuar.",
    );
  }

  try {
    ventana.opener = null;

    const urlEscudo = new URL(
      CLUB.escudo,
      window.location.origin,
    ).href;

    const contenido =
      generarDocumentoHtml(
        resultado,
        urlEscudo,
      );

    ventana.document.open();

    ventana.document.write(
      contenido,
    );

    ventana.document.close();

    const botonImprimir =
      ventana.document.getElementById(
        "boton-imprimir",
      ) as HTMLButtonElement | null;

    const botonCerrar =
      ventana.document.getElementById(
        "boton-cerrar",
      );

    if (!botonImprimir || !botonCerrar) {
      throw new Error(
        "No se ha podido preparar la vista previa del documento.",
      );
    }

    // Eventos de los botones de la vista previa.

    botonImprimir.addEventListener(
      "click",
      () => {
        ventana.focus();

        ventana.print();
      },
    );

    botonCerrar.addEventListener(
      "click",
      () => {
        ventana.close();
      },
    );

    // Esperar a que se cargue el escudo.

    await esperarImagenes(
      ventana.document,
    );

    if (ventana.closed) {
      return;
    }

    // Esperar a que estén disponibles
    // las fuentes del documento.

    if (ventana.document.fonts) {
      await ventana.document.fonts.ready;
    }

    if (ventana.closed) {
      return;
    }

    botonImprimir.disabled = false;

    ventana.focus();

  } catch (error) {
    if (!ventana.closed) {
      ventana.close();
    }

    throw error;
  }
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function GeneradorPdfLiquidaciones({
  resultado,
  disabled = false,
  motivoDeshabilitado = null,
}: Props) {
  // ----------------------------------------------------
  // ESTADOS
  // ----------------------------------------------------

  const [generando, setGenerando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ----------------------------------------------------
  // INFORMACIÓN DERIVADA
  // ----------------------------------------------------

  const exportacionDisponible =
    !disabled &&
    !generando &&
    puedeExportarLiquidaciones(
      resultado,
    );

  const motivo =
    motivoDeshabilitado ??
    (
      resultado.resumen.totalActuaciones === 0

        ? "No hay actuaciones para exportar."

        : resultado.funcionesSinTarifa.length > 0

          ? "Configura todas las tarifas necesarias antes de exportar."

          : !resultado.completa

            ? "Revisa las incidencias de la liquidación antes de exportar."

            : disabled

              ? "La exportación no está disponible en este momento."

              : null
    );

  // ----------------------------------------------------
  // GENERAR DOCUMENTO
  // ----------------------------------------------------

  async function generarPdf():
    Promise<void> {
    if (!exportacionDisponible) {
      return;
    }

    setError(null);

    setGenerando(true);

    try {
      await abrirPdfLiquidaciones(
        resultado,
      );
    } catch (errorGeneracion) {
      console.error(
        "[LIQUIDACIONES PDF] Error generando el documento:",
        errorGeneracion,
      );

      setError(
        errorGeneracion instanceof Error

          ? errorGeneracion.message

          : "No se ha podido generar el documento de liquidaciones.",
      );

    } finally {
      setGenerando(false);
    }
  }

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <section
      aria-label="Exportación de liquidaciones"
      className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        {/* INFORMACIÓN DEL DOCUMENTO */}

        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-on-primary-fixed">
            <Icono
              nombre="pdf"
              className="h-6 w-6"
            />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-on-surface">
              Documento de liquidaciones
            </h2>

            <p className="mt-1 max-w-xl text-sm leading-relaxed text-on-surface-variant">
              Genera un único documento PDF con
              todas las liquidaciones individuales
              y el importe total del periodo.
            </p>
          </div>
        </div>

        {/* BOTÓN DE EXPORTACIÓN */}

        <button
          type="button"
          disabled={!exportacionDisponible}
          onClick={generarPdf}
          title={
            exportacionDisponible
              ? "Generar el documento de liquidaciones"
              : motivo ?? undefined
          }
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generando ? (
            <span
              aria-hidden="true"
              className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          ) : (
            <Icono
              nombre="pdf"
              className="h-5 w-5"
            />
          )}

          {generando
            ? "Preparando documento..."
            : "Generar PDF conjunto"}
        </button>
      </div>

      {/* INFORMACIÓN DE LA EXPORTACIÓN */}

      <div className="mt-4 border-t border-outline-variant/60 pt-4">
        <div className="flex items-start gap-2 text-sm text-on-surface-variant">
          <Icono
            nombre="informacion"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          />

          <div className="min-w-0 space-y-1">
            {generando ? (
              <p>
                Preparando la vista previa
                del documento.
              </p>
            ) : motivo ? (
              <p>
                {motivo}
              </p>
            ) : (
              <>
                <p>
                  Se abrirá una vista previa en
                  formato DIN A4 desde la que
                  podrás guardar el documento
                  completo como PDF.
                </p>

                <p className="break-all text-xs font-medium">
                  Nombre sugerido:{" "}

                  <span className="font-bold text-on-surface">
                    {obtenerNombrePdfLiquidaciones(
                      resultado.periodo,
                    )}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ERROR DE EXPORTACIÓN */}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 rounded-xl border border-error/30 bg-error-container p-4 text-sm font-medium text-on-error-container"
        >
          <Icono
            nombre="error"
            className="mt-0.5 h-5 w-5 shrink-0"
          />

          <p>
            {error}
          </p>
        </div>
      )}
    </section>
  );
}
