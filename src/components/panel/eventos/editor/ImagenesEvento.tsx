
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type {
  RespuestaSubirImagenEvento,
  TipoImagenEvento,
} from "@tipos/EventoPanel";

// ======================================================
// TIPOS
// ======================================================

interface Propiedades {
  eventoId?: string | null;

  imagen: string;
  bannerNotificacion: string;

  alCambiarImagen: (
    url: string,
  ) => void;

  alCambiarBannerNotificacion: (
    url: string,
  ) => void;

  errores?: {
    imagen?: string;
    bannerNotificacion?: string;
  };

  deshabilitado?: boolean;
}

interface PropiedadesSelector {
  eventoId: string | null;

  tipo: TipoImagenEvento;

  titulo: string;
  descripcion: string;
  recomendacion: string;

  url: string;

  alCambiar: (
    url: string,
  ) => void;

  errorCampo?: string;
  deshabilitado: boolean;
}

// ======================================================
// CONFIGURACIÓN
// ======================================================

const TIPOS_VALIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

// Margen de seguridad para peticiones
// multipart en despliegues de Vercel.
const MAXIMO_SUBIDA =
  4 * 1024 * 1024;

const MAXIMO_ORIGINAL =
  20 * 1024 * 1024;

// ======================================================
// UTILIDADES
// ======================================================

function formatearTamano(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes < 1024 * 1024
  ) {
    return `${
      (
        bytes / 1024
      ).toFixed(1)
    } KB`;
  }

  return `${
    (
      bytes /
      (1024 * 1024)
    ).toFixed(1)
  } MB`;
}

// ======================================================
// VALIDAR ARCHIVO
// ======================================================

function validarArchivo(
  archivo: File,
): string | null {
  if (
    !TIPOS_VALIDOS.has(
      archivo.type.toLowerCase(),
    )
  ) {
    return (
      "El archivo debe ser una imagen " +
      "JPG, PNG o WebP."
    );
  }

  if (
    archivo.size <= 0
  ) {
    return (
      "El archivo seleccionado está vacío."
    );
  }

  if (
    archivo.size >
    MAXIMO_ORIGINAL
  ) {
    return (
      "La imagen original no puede " +
      "superar los 20 MB."
    );
  }

  return null;
}

// ======================================================
// CONVERSIÓN A WEBP
// ======================================================

function generarWebp(
  lienzo: HTMLCanvasElement,
  calidad: number,
): Promise<Blob | null> {
  return new Promise(
    (resolver) => {
      lienzo.toBlob(
        resolver,
        "image/webp",
        calidad,
      );
    },
  );
}

// ======================================================
// OPTIMIZAR IMAGEN
// ======================================================

async function prepararArchivo(
  archivo: File,
): Promise<File> {
  /**
   * Si la imagen es suficientemente
   * pequeña, se conserva exactamente
   * el archivo original.
   */

  if (
    archivo.size <=
    MAXIMO_SUBIDA
  ) {
    return archivo;
  }

  /**
   * Las imágenes grandes se reducen
   * automáticamente en el navegador.
   *
   * Esto evita enviar peticiones que
   * puedan superar el límite del
   * alojamiento.
   */

  let imagen: ImageBitmap;

  try {
    imagen =
      await createImageBitmap(
        archivo,
      );
  } catch {
    throw new Error(
      "No se ha podido abrir la imagen. " +
      "Prueba a guardarla como JPG, PNG o WebP.",
    );
  }

  try {
    const dimensiones = [
      2000,
      1600,
      1280,
    ];

    const calidades = [
      0.85,
      0.7,
      0.55,
    ];

    for (
      const dimensionMaxima
      of dimensiones
    ) {
      const escala =
        Math.min(
          1,
          dimensionMaxima /
            Math.max(
              imagen.width,
              imagen.height,
            ),
        );

      const lienzo =
        document.createElement(
          "canvas",
        );

      lienzo.width =
        Math.max(
          1,
          Math.round(
            imagen.width *
              escala,
          ),
        );

      lienzo.height =
        Math.max(
          1,
          Math.round(
            imagen.height *
              escala,
          ),
        );

      const contexto =
        lienzo.getContext(
          "2d",
        );

      if (!contexto) {
        throw new Error(
          "El navegador no permite procesar esta imagen.",
        );
      }

      contexto.drawImage(
        imagen,
        0,
        0,
        lienzo.width,
        lienzo.height,
      );

      for (
        const calidad
        of calidades
      ) {
        const resultado =
          await generarWebp(
            lienzo,
            calidad,
          );

        if (
          resultado &&
          resultado.type ===
            "image/webp" &&
          resultado.size > 0 &&
          resultado.size <=
            MAXIMO_SUBIDA
        ) {
          const nombre =
            archivo.name.replace(
              /\.[^.]+$/,
              "",
            );

          return new File(
            [resultado],
            `${
              nombre || "evento"
            }.webp`,
            {
              type:
                "image/webp",
            },
          );
        }
      }
    }
  } finally {
    imagen.close();
  }

  throw new Error(
    "No se ha podido reducir la imagen " +
    "para la subida. Utiliza una imagen " +
    "de menos de 4 MB.",
  );
}

// ======================================================
// INTERPRETAR RESPUESTA DEL SERVIDOR
// ======================================================

async function obtenerRespuestaSubida(
  respuesta: Response,
): Promise<RespuestaSubirImagenEvento> {
  let contenido:
    RespuestaSubirImagenEvento | null =
      null;

  try {
    contenido =
      (
        await respuesta.json()
      ) as RespuestaSubirImagenEvento;
  } catch {
    /**
     * Algunas respuestas de error
     * del alojamiento pueden llegar
     * como HTML, no como JSON.
     */
  }

  /**
   * FORMATO REAL DE LA API:
   *
   * {
   *   ok: true,
   *   data: {
   *     imagen: {
   *       url: "...",
   *       ruta: "...",
   *       mimeType: "...",
   *       tamano: 123
   *     }
   *   }
   * }
   */

  if (
    !respuesta.ok ||
    !contenido?.ok ||
    !contenido.data
      ?.imagen?.url
  ) {
    const mensaje =
      contenido?.error?.trim();

    if (mensaje) {
      throw new Error(
        mensaje,
      );
    }

    if (
      respuesta.status ===
      413
    ) {
      throw new Error(
        "La imagen supera el tamaño permitido por el servidor.",
      );
    }

    if (
      respuesta.status ===
      401
    ) {
      throw new Error(
        "La sesión ha caducado. Inicia sesión de nuevo.",
      );
    }

    if (
      respuesta.status ===
      403
    ) {
      throw new Error(
        "No tienes permiso para subir esta imagen.",
      );
    }

    throw new Error(
      `No se ha podido subir la imagen (HTTP ${respuesta.status}).`,
    );
  }

  return contenido;
}

// ======================================================
// SELECTOR DE IMAGEN
// ======================================================

function SelectorImagen({
  eventoId,
  tipo,
  titulo,
  descripcion,
  recomendacion,
  url,
  alCambiar,
  errorCampo,
  deshabilitado,
}: PropiedadesSelector) {
  // --------------------------------------------------
  // REFERENCIAS
  // --------------------------------------------------

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const urlTemporalRef =
    useRef<string | null>(
      null,
    );

  const peticionRef =
    useRef<AbortController | null>(
      null,
    );

  // --------------------------------------------------
  // ESTADOS
  // --------------------------------------------------

  const [
    previsualizacion,
    setPrevisualizacion,
  ] = useState<string | null>(
    null,
  );

  const [
    archivoPendiente,
    setArchivoPendiente,
  ] = useState<File | null>(
    null,
  );

  const [
    subiendo,
    setSubiendo,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    detalle,
    setDetalle,
  ] = useState<string | null>(
    null,
  );

  // --------------------------------------------------
  // LIMPIEZA AL DESMONTAR
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      peticionRef.current?.abort();

      if (
        urlTemporalRef.current
      ) {
        URL.revokeObjectURL(
          urlTemporalRef.current,
        );
      }
    };
  }, []);

  // --------------------------------------------------
  // ESTABLECER VISTA PREVIA
  // --------------------------------------------------

  function establecerArchivo(
    archivo: File | null,
  ) {
    if (
      urlTemporalRef.current
    ) {
      URL.revokeObjectURL(
        urlTemporalRef.current,
      );

      urlTemporalRef.current =
        null;
    }

    if (archivo) {
      const urlPrevia =
        URL.createObjectURL(
          archivo,
        );

      urlTemporalRef.current =
        urlPrevia;

      setPrevisualizacion(
        urlPrevia,
      );
    } else {
      setPrevisualizacion(
        null,
      );
    }

    setArchivoPendiente(
      archivo,
    );
  }

  // --------------------------------------------------
  // SUBIR ARCHIVO
  // --------------------------------------------------

  async function subirArchivo(
    archivo: File,
  ) {
    setSubiendo(true);
    setError(null);
    setDetalle(null);

    const controlador =
      new AbortController();

    peticionRef.current =
      controlador;

    try {
      // ----------------------------------------------
      // 1. OPTIMIZAR
      // ----------------------------------------------

      const archivoParaEnviar =
        await prepararArchivo(
          archivo,
        );

      if (
        controlador.signal.aborted
      ) {
        return;
      }

      // ----------------------------------------------
      // 2. PREPARAR FORMULARIO
      // ----------------------------------------------

      const formulario =
        new FormData();

      formulario.append(
        "archivo",
        archivoParaEnviar,
      );

      formulario.append(
        "tipo",
        tipo,
      );

      if (eventoId) {
        formulario.append(
          "eventoId",
          eventoId,
        );
      }

      // ----------------------------------------------
      // 3. ENVIAR AL BACKEND
      // ----------------------------------------------

      const respuesta =
        await fetch(
          "/api/panel/eventos/imagenes",
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",
            },

            body:
              formulario,

            signal:
              controlador.signal,
          },
        );

      // ----------------------------------------------
      // 4. LEER RESPUESTA CORRECTAMENTE
      // ----------------------------------------------

      const contenido =
        await obtenerRespuestaSubida(
          respuesta,
        );

      if (
        controlador.signal.aborted
      ) {
        return;
      }

      /**
       * CORRECCIÓN PRINCIPAL.
       *
       * La URL está en:
       *
       * contenido.data.imagen.url
       *
       * No en:
       *
       * contenido.data.url
       */

      const imagenSubida =
        contenido.data!.imagen;

      // ----------------------------------------------
      // 5. ACTUALIZAR FORMULARIO PADRE
      // ----------------------------------------------

      alCambiar(
        imagenSubida.url,
      );

      // ----------------------------------------------
      // 6. FINALIZAR PREVISUALIZACIÓN
      // ----------------------------------------------

      establecerArchivo(
        null,
      );

      setError(null);

      setDetalle(
        `Imagen subida correctamente (${formatearTamano(
          imagenSubida.tamano,
        )}). Guarda el evento para confirmar el cambio.`,
      );
    } catch (errorSubida) {
      if (
        controlador.signal.aborted
      ) {
        return;
      }

      console.error(
        `Error subiendo ${tipo} del evento:`,
        errorSubida,
      );

      setError(
        errorSubida instanceof Error
          ? errorSubida.message
          : "No se ha podido subir la imagen.",
      );

      /**
       * Si falla la subida:
       *
       * - Se conserva la vista previa.
       * - No se modifica la URL del evento.
       * - Se permite reintentar.
       */
    } finally {
      if (
        peticionRef.current ===
        controlador
      ) {
        peticionRef.current =
          null;

        setSubiendo(false);
      }
    }
  }

  // --------------------------------------------------
  // SELECCIONAR ARCHIVO
  // --------------------------------------------------

  async function seleccionarArchivo(
    evento: ChangeEvent<HTMLInputElement>,
  ) {
    const archivo =
      evento.target.files?.[0];

    evento.target.value =
      "";

    if (
      !archivo ||
      subiendo ||
      deshabilitado
    ) {
      return;
    }

    const errorValidacion =
      validarArchivo(
        archivo,
      );

    if (
      errorValidacion
    ) {
      setError(
        errorValidacion,
      );

      setDetalle(null);

      return;
    }

    /**
     * Se muestra la imagen local
     * INMEDIATAMENTE, antes de
     * iniciar la subida a Supabase.
     */

    establecerArchivo(
      archivo,
    );

    await subirArchivo(
      archivo,
    );
  }

  // --------------------------------------------------
  // QUITAR IMAGEN
  // --------------------------------------------------

  function eliminarSeleccion() {
    if (
      subiendo ||
      deshabilitado
    ) {
      return;
    }

    if (
      archivoPendiente
    ) {
      /**
       * Si aún no se ha subido,
       * solo descartamos la
       * selección local.
       */

      establecerArchivo(
        null,
      );
    } else if (url) {
      /**
       * Si ya existe una imagen,
       * se quita del formulario.
       *
       * NO se elimina inmediatamente
       * del Storage, porque todavía
       * podría estar asociada al
       * evento guardado.
       *
       * La desvinculación se hará
       * efectiva al guardar.
       */

      alCambiar("");
    }

    setError(null);
    setDetalle(null);
  }

  // --------------------------------------------------
  // ESTADO VISUAL
  // --------------------------------------------------

  const urlVisible =
    previsualizacion ??
    url;

  const ocupado =
    deshabilitado ||
    subiendo;

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-low">
      <div className="border-b border-outline-variant/60 px-4 py-4 sm:px-5">
        <h3 className="font-bold text-on-surface">
          {titulo}
        </h3>

        <p className="mt-1 text-xs leading-5 text-on-surface-variant">
          {descripcion}
        </p>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        {/* VISTA PREVIA */}

        <div
          className={`relative overflow-hidden rounded-xl border ${
            urlVisible
              ? "border-outline-variant bg-black"
              : "border-dashed border-outline bg-surface-container"
          } ${
            tipo === "banner-notificacion"
              ? "aspect-2/1"
              : "aspect-video"
          }`}
        >
          {urlVisible ? (
            <img
              src={urlVisible}
              alt={`Vista previa de ${titulo.toLowerCase()}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full min-h-44 flex-col items-center justify-center p-5 text-center">
              <span
                className="inline-block h-10 w-10 bg-outline mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/imagen.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/imagen.svg')",
                }}
                aria-hidden="true"
              />

              <p className="mt-3 text-sm font-bold text-on-surface">
                Ninguna imagen seleccionada
              </p>

              <p className="mt-1 max-w-xs text-xs leading-5 text-on-surface-variant">
                JPG, PNG o WebP. Los archivos grandes se
                optimizan automáticamente.
              </p>
            </div>
          )}

          {/* IMAGEN LOCAL PENDIENTE */}

          {previsualizacion &&
            !subiendo &&
            error && (
              <span className="absolute bottom-2 left-2 rounded-lg bg-error-container px-3 py-1.5 text-xs font-bold text-on-error-container">
                Vista previa local · Sin subir
              </span>
            )}

          {/* ESTADO DE SUBIDA */}

          {subiendo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-white">
              <div
                className="text-center"
                role="status"
              >
                <span
                  className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-white/40 border-t-white"
                  aria-hidden="true"
                />

                <p className="mt-3 text-sm font-bold">
                  Preparando y subiendo imagen...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RECOMENDACIONES */}

        <p className="text-xs leading-5 text-on-surface-variant">
          {recomendacion}
        </p>

        {/* INPUT */}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(evento) => {
            void seleccionarArchivo(evento);
          }}
          disabled={ocupado}
          className="hidden"
        />

        {/* ACCIONES */}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={ocupado}
            onClick={() =>
              inputRef.current?.click()
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/subir.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/subir.svg')",
              }}
              aria-hidden="true"
            />

            {urlVisible
              ? "Sustituir imagen"
              : "Seleccionar imagen"}
          </button>

          {/* REINTENTAR */}

          {archivoPendiente &&
            !subiendo &&
            error && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  void subirArchivo(
                    archivoPendiente,
                  );
                }}
                className="min-h-10 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary disabled:opacity-60"
              >
                Reintentar subida
              </button>
            )}

          {/* QUITAR */}

          {(archivoPendiente || url) && (
            <button
              type="button"
              disabled={ocupado}
              onClick={eliminarSeleccion}
              className="min-h-10 rounded-xl border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:opacity-60"
            >
              {archivoPendiente
                ? "Descartar selección"
                : "Quitar imagen"}
            </button>
          )}
        </div>

        {/* ERROR */}

        {error || errorCampo ? (
          <div
            className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            {error ?? errorCampo}
          </div>
        ) : detalle ? (
          <p
            className="text-xs font-semibold text-success"
            role="status"
          >
            {detalle}
          </p>
        ) : null}
      </div>
    </article>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function ImagenesEvento({
  eventoId = null,

  imagen,
  bannerNotificacion,

  alCambiarImagen,
  alCambiarBannerNotificacion,

  errores = {},
  deshabilitado = false,
}: Propiedades) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Imágenes
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Añade una imagen principal para el evento y un
          banner independiente para las notificaciones push.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
        <SelectorImagen
          eventoId={eventoId}
          tipo="imagen"
          titulo="Imagen principal"
          descripcion="Cartel o imagen utilizada en la página pública y las tarjetas del evento."
          recomendacion="Formato recomendado: horizontal, con una proporción aproximada de 16:9."
          url={imagen}
          alCambiar={alCambiarImagen}
          errorCampo={errores.imagen}
          deshabilitado={deshabilitado}
        />

        <SelectorImagen
          eventoId={eventoId}
          tipo="banner-notificacion"
          titulo="Banner para notificaciones"
          descripcion="Imagen independiente preparada para acompañar una futura notificación push."
          recomendacion="Formato recomendado: horizontal, evitando textos pequeños cerca de los bordes."
          url={bannerNotificacion}
          alCambiar={alCambiarBannerNotificacion}
          errorCampo={errores.bannerNotificacion}
          deshabilitado={deshabilitado}
        />
      </div>
    </section>
  );
}
