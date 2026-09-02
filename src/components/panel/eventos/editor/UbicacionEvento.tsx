import {
  useMemo,
} from "react";

import type {
  InstalacionEventoPanel,
} from "@tipos/EventoPanel";

interface ErroresUbicacionEvento {
  instalacionId?: string;
  ubicacion?: string;
  direccion?: string;
}

interface Propiedades {
  instalacionId: string;
  ubicacion: string;
  direccion: string;

  instalaciones:
    InstalacionEventoPanel[];

  alCambiarInstalacionId: (
    instalacionId: string,
  ) => void;

  alCambiarUbicacion: (
    ubicacion: string,
  ) => void;

  alCambiarDireccion: (
    direccion: string,
  ) => void;

  errores?: ErroresUbicacionEvento;
  deshabilitado?: boolean;
  cargandoInstalaciones?: boolean;
}

function obtenerNombreInstalacion(
  instalacion:
    InstalacionEventoPanel,
): string {
  return (
    instalacion.nombre?.trim() ||
    instalacion.nombreCorto?.trim() ||
    "Instalación sin nombre"
  );
}

export default function UbicacionEvento({
  instalacionId,
  ubicacion,
  direccion,
  instalaciones,
  alCambiarInstalacionId,
  alCambiarUbicacion,
  alCambiarDireccion,
  errores = {},
  deshabilitado = false,
  cargandoInstalaciones = false,
}: Propiedades) {
  const instalacionSeleccionada =
    useMemo(
      () =>
        instalaciones.find(
          (instalacion) =>
            instalacion.id ===
            instalacionId,
        ) ?? null,
      [
        instalacionId,
        instalaciones,
      ],
    );

  const seleccionarInstalacion = (
    siguienteInstalacionId:
      string,
  ) => {
    alCambiarInstalacionId(
      siguienteInstalacionId,
    );

    if (
      !siguienteInstalacionId
    ) {
      return;
    }

    const instalacion =
      instalaciones.find(
        (elemento) =>
          elemento.id ===
          siguienteInstalacionId,
      );

    if (!instalacion) {
      return;
    }

    alCambiarUbicacion(
      obtenerNombreInstalacion(
        instalacion,
      ),
    );

    alCambiarDireccion(
      [
        instalacion.direccion,
        instalacion.localidad,
      ]
        .filter(Boolean)
        .join(", "),
    );
  };

  const usarUbicacionPersonalizada =
    instalacionId === "";

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Ubicación
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Selecciona una instalación
          registrada o escribe una
          ubicación diferente.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Instalación del club
          </span>

          <select
            value={instalacionId}
            onChange={(evento) =>
              seleccionarInstalacion(
                evento.target.value,
              )
            }
            disabled={
              deshabilitado ||
              cargandoInstalaciones
            }
            aria-invalid={
              Boolean(
                errores.instalacionId,
              )
            }
            className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              errores.instalacionId
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant focus:border-primary focus:ring-primary/20"
            }`}
          >
            <option value="">
              {cargandoInstalaciones
                ? "Cargando instalaciones..."
                : "Ubicación personalizada o sin ubicación"}
            </option>

            {instalaciones.map(
              (instalacion) => (
                <option
                  key={
                    instalacion.id
                  }
                  value={
                    instalacion.id
                  }
                >
                  {obtenerNombreInstalacion(
                    instalacion,
                  )}

                  {instalacion.localidad
                    ? ` · ${instalacion.localidad}`
                    : ""}
                </option>
              ),
            )}
          </select>

          <span
            className={`text-xs leading-5 ${
              errores.instalacionId
                ? "font-semibold text-error"
                : "text-on-surface-variant"
            }`}
          >
            {errores.instalacionId ??
              "Al seleccionar una instalación se completarán automáticamente el nombre y la dirección."}
          </span>
        </label>

        {instalacionSeleccionada && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-container/30 px-4 py-3">
            <span
              className="mt-0.5 inline-block h-5 w-5 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/ubicacion.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/ubicacion.svg')",
              }}
              aria-hidden="true"
            />

            <div className="min-w-0">
              <p className="font-bold text-on-surface">
                {obtenerNombreInstalacion(
                  instalacionSeleccionada,
                )}
              </p>

              {[
                instalacionSeleccionada
                  .direccion,
                instalacionSeleccionada
                  .localidad,
              ]
                .filter(Boolean)
                .join(", ") && (
                <p className="mt-1 text-sm text-on-surface-variant">
                  {[
                    instalacionSeleccionada
                      .direccion,
                    instalacionSeleccionada
                      .localidad,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {usarUbicacionPersonalizada && (
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
            <p className="text-sm font-bold text-on-surface">
              Ubicación personalizada
            </p>

            <p className="mt-1 text-xs leading-5 text-on-surface-variant">
              Utiliza estos campos si el
              evento se celebra fuera de
              las instalaciones
              registradas o si todavía no
              tiene una ubicación
              definitiva.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Nombre del lugar
            </span>

            <input
              type="text"
              value={ubicacion}
              onChange={(evento) =>
                alCambiarUbicacion(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              maxLength={250}
              aria-invalid={
                Boolean(
                  errores.ubicacion,
                )
              }
              placeholder="Ej. Palau Municipal d'Esports d'Andratx"
              className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.ubicacion
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />

            <span className="flex justify-between gap-3 text-xs">
              <span
                className={
                  errores.ubicacion
                    ? "font-semibold text-error"
                    : "text-on-surface-variant"
                }
              >
                {errores.ubicacion ??
                  "Nombre que se mostrará públicamente."}
              </span>

              <span className="shrink-0 text-outline">
                {ubicacion.length}
                /250
              </span>
            </span>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-on-surface">
              Dirección
            </span>

            <input
              type="text"
              value={direccion}
              onChange={(evento) =>
                alCambiarDireccion(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              maxLength={500}
              aria-invalid={
                Boolean(
                  errores.direccion,
                )
              }
              placeholder="Ej. Carrer de Son Prim, Andratx"
              className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.direccion
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />

            <span className="flex justify-between gap-3 text-xs">
              <span
                className={
                  errores.direccion
                    ? "font-semibold text-error"
                    : "text-on-surface-variant"
                }
              >
                {errores.direccion ??
                  "Puede dejarse vacía si no es necesaria."}
              </span>

              <span className="shrink-0 text-outline">
                {direccion.length}
                /500
              </span>
            </span>
          </label>
        </div>

        {instalacionSeleccionada && (
          <p className="text-xs leading-5 text-on-surface-variant">
            Puedes modificar manualmente
            el nombre o la dirección
            completados por la
            instalación sin cambiar sus
            datos originales.
          </p>
        )}
      </div>
    </section>
  );
}