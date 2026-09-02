import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import type {
  TipoImagenEvento,
} from "@tipos/EventoPanel";

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

interface RespuestaSubida {
  ok: boolean;

  data: {
    url: string;
    ruta: string;
    mimeType: string;
    tamano: number;
  } | null;

  error: string | null;
}

interface EstadoCarga {
  subiendo: boolean;
  eliminando: boolean;
  error: string | null;
}

interface PropiedadesSelectorImagen {
  tipo: TipoImagenEvento;
  titulo: string;
  descripcion: string;
  recomendacion: string;

  url: string;

  estado: EstadoCarga;

  errorCampo?: string;

  deshabilitado: boolean;

  alSeleccionarArchivo: (
    archivo: File,
  ) => Promise<void>;

  alEliminar: () => Promise<void>;
}

function obtenerRutaStorage(
  url: string,
): string | null {
  const marcador =
    "/storage/v1/object/public/eventos/";

  const posicion =
    url.indexOf(marcador);

  if (posicion === -1) {
    return null;
  }

  const rutaCodificada =
    url.slice(
      posicion +
        marcador.length,
    );

  if (!rutaCodificada) {
    return null;
  }

  try {
    return decodeURIComponent(
      rutaCodificada,
    );
  } catch {
    return rutaCodificada;
  }
}

function formatearTamano(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function SelectorImagen({
  tipo,
  titulo,
  descripcion,
  recomendacion,
  url,
  estado,
  errorCampo,
  deshabilitado,
  alSeleccionarArchivo,
  alEliminar,
}: PropiedadesSelectorImagen) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const procesarArchivo = async (
    evento:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo =
      evento.target.files?.[0];

    evento.target.value = "";

    if (!archivo) {
      return;
    }

    await alSeleccionarArchivo(
      archivo,
    );
  };

  const ocupado =
    estado.subiendo ||
    estado.eliminando;

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
        <div
          className={`relative overflow-hidden rounded-xl border ${
            url
              ? "border-outline-variant bg-black"
              : "border-dashed border-outline bg-surface-container"
          } ${
            tipo ===
            "banner-notificacion"
              ? "aspect-2/1"
              : "aspect-video"
          }`}
        >
          {url ? (
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
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
                Ninguna imagen
                seleccionada
              </p>

              <p className="mt-1 max-w-xs text-xs leading-5 text-on-surface-variant">
                Se admiten imágenes JPG,
                PNG y WebP de hasta 5 MB.
              </p>
            </div>
          )}

          {ocupado && (
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
                  {estado.eliminando
                    ? "Eliminando imagen..."
                    : "Subiendo imagen..."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs leading-5 text-on-surface-variant">
            {recomendacion}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              procesarArchivo
            }
            disabled={
              deshabilitado ||
              ocupado
            }
            className="hidden"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                deshabilitado ||
                ocupado
              }
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

              {url
                ? "Sustituir imagen"
                : "Subir imagen"}
            </button>

            {url && (
              <button
                type="button"
                disabled={
                  deshabilitado ||
                  ocupado
                }
                onClick={() => {
                  void alEliminar();
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>

        {(estado.error ||
          errorCampo) && (
          <div
            className="rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            {estado.error ??
              errorCampo}
          </div>
        )}
      </div>
    </article>
  );
}

const estadoInicial: EstadoCarga = {
  subiendo: false,
  eliminando: false,
  error: null,
};

export default function ImagenesEvento({
  eventoId = null,
  imagen,
  bannerNotificacion,
  alCambiarImagen,
  alCambiarBannerNotificacion,
  errores = {},
  deshabilitado = false,
}: Propiedades) {
  const [
    estadoImagen,
    setEstadoImagen,
  ] =
    useState<EstadoCarga>(
      estadoInicial,
    );

  const [
    estadoBanner,
    setEstadoBanner,
  ] =
    useState<EstadoCarga>(
      estadoInicial,
    );

  const obtenerConfiguracion = (
    tipo: TipoImagenEvento,
  ) => {
    if (
      tipo ===
      "banner-notificacion"
    ) {
      return {
        url:
          bannerNotificacion,

        cambiar:
          alCambiarBannerNotificacion,

        estado:
          estadoBanner,

        establecerEstado:
          setEstadoBanner,
      };
    }

    return {
      url: imagen,
      cambiar:
        alCambiarImagen,
      estado: estadoImagen,
      establecerEstado:
        setEstadoImagen,
    };
  };

  const subirArchivo = async (
    tipo: TipoImagenEvento,
    archivo: File,
  ) => {
    const configuracion =
      obtenerConfiguracion(tipo);

    const extensionesPermitidas =
      [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

    if (
      !extensionesPermitidas.includes(
        archivo.type,
      )
    ) {
      configuracion.establecerEstado(
        {
          subiendo: false,
          eliminando: false,
          error:
            "El archivo debe ser una imagen JPG, PNG o WebP.",
        },
      );

      return;
    }

    if (
      archivo.size >
      5 * 1024 * 1024
    ) {
      configuracion.establecerEstado(
        {
          subiendo: false,
          eliminando: false,
          error:
            "La imagen no puede superar los 5 MB.",
        },
      );

      return;
    }

    configuracion.establecerEstado(
      {
        subiendo: true,
        eliminando: false,
        error: null,
      },
    );

    try {
      const formulario =
        new FormData();

      formulario.append(
        "archivo",
        archivo,
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

            body: formulario,
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaSubida;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.url
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido subir la imagen.",
        );
      }

      const urlAnterior =
        configuracion.url;

      configuracion.cambiar(
        contenido.data.url,
      );

      configuracion.establecerEstado(
        {
          subiendo: false,
          eliminando: false,
          error: null,
        },
      );

      const rutaAnterior =
        obtenerRutaStorage(
          urlAnterior,
        );

      if (rutaAnterior) {
        fetch(
          "/api/panel/eventos/imagenes",
          {
            method: "DELETE",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              ruta: rutaAnterior,
            }),
          },
        ).catch((error) => {
          console.error(
            "No se ha podido eliminar la imagen anterior del evento:",
            error,
          );
        });
      }

      console.info(
        `Imagen del evento subida correctamente: ${formatearTamano(
          contenido.data.tamano,
        )}`,
      );
    } catch (error) {
      console.error(
        "Error subiendo una imagen del evento:",
        error,
      );

      configuracion.establecerEstado(
        {
          subiendo: false,
          eliminando: false,

          error:
            error instanceof Error
              ? error.message
              : "No se ha podido subir la imagen.",
        },
      );
    }
  };

  const eliminarImagen = async (
    tipo: TipoImagenEvento,
  ) => {
    const configuracion =
      obtenerConfiguracion(tipo);

    if (!configuracion.url) {
      return;
    }

    const ruta =
      obtenerRutaStorage(
        configuracion.url,
      );

    configuracion.establecerEstado(
      {
        subiendo: false,
        eliminando: true,
        error: null,
      },
    );

    try {
      if (ruta) {
        const respuesta =
          await fetch(
            "/api/panel/eventos/imagenes",
            {
              method: "DELETE",

              credentials:
                "same-origin",

              headers: {
                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                ruta,
              }),
            },
          );

        const contenido =
          (await respuesta.json()) as {
            ok: boolean;
            error: string | null;
          };

        if (
          !respuesta.ok ||
          !contenido.ok
        ) {
          throw new Error(
            contenido.error ??
              "No se ha podido eliminar la imagen.",
          );
        }
      }

      configuracion.cambiar("");

      configuracion.establecerEstado(
        {
          subiendo: false,
          eliminando: false,
          error: null,
        },
      );
    } catch (error) {
      console.error(
        "Error eliminando una imagen del evento:",
        error,
      );

      configuracion.establecerEstado(
        {
          subiendo: false,
          eliminando: false,

          error:
            error instanceof Error
              ? error.message
              : "No se ha podido eliminar la imagen.",
        },
      );
    }
  };

  const hayCargaActiva =
    estadoImagen.subiendo ||
    estadoImagen.eliminando ||
    estadoBanner.subiendo ||
    estadoBanner.eliminando;

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Imágenes
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Añade una imagen principal para
          el evento y un banner
          independiente para las
          notificaciones push.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
        <SelectorImagen
          tipo="imagen"
          titulo="Imagen principal"
          descripcion="Cartel o imagen utilizada en la página pública y las tarjetas del evento."
          recomendacion="Formato recomendado: horizontal, con una proporción aproximada de 16:9."
          url={imagen}
          estado={estadoImagen}
          errorCampo={
            errores.imagen
          }
          deshabilitado={
            deshabilitado ||
            hayCargaActiva
          }
          alSeleccionarArchivo={(
            archivo,
          ) =>
            subirArchivo(
              "imagen",
              archivo,
            )
          }
          alEliminar={() =>
            eliminarImagen(
              "imagen",
            )
          }
        />

        <SelectorImagen
          tipo="banner-notificacion"
          titulo="Banner para notificaciones"
          descripcion="Imagen independiente preparada para acompañar una futura notificación push."
          recomendacion="Formato recomendado: horizontal y sencillo, evitando textos pequeños cerca de los bordes."
          url={bannerNotificacion}
          estado={estadoBanner}
          errorCampo={
            errores.bannerNotificacion
          }
          deshabilitado={
            deshabilitado ||
            hayCargaActiva
          }
          alSeleccionarArchivo={(
            archivo,
          ) =>
            subirArchivo(
              "banner-notificacion",
              archivo,
            )
          }
          alEliminar={() =>
            eliminarImagen(
              "banner-notificacion",
            )
          }
        />
      </div>
    </section>
  );
}