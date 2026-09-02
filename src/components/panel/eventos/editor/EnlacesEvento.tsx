interface ErroresEnlacesEvento {
  urlInformacion?: string;
  urlInscripcion?: string;
  requiereInscripcion?: string;
}

interface Propiedades {
  urlInformacion: string;
  urlInscripcion: string;

  requiereInscripcion: boolean;

  alCambiarUrlInformacion: (
    url: string,
  ) => void;

  alCambiarUrlInscripcion: (
    url: string,
  ) => void;

  alCambiarRequiereInscripcion: (
    requiereInscripcion: boolean,
  ) => void;

  errores?: ErroresEnlacesEvento;
  deshabilitado?: boolean;
}

function obtenerUrlPrevisualizacion(
  valor: string,
): string | null {
  const url = valor.trim();

  if (!url) {
    return null;
  }

  try {
    const resultado =
      new URL(url);

    if (
      resultado.protocol !==
        "http:" &&
      resultado.protocol !==
        "https:"
    ) {
      return null;
    }

    return resultado.toString();
  } catch {
    return null;
  }
}

export default function EnlacesEvento({
  urlInformacion,
  urlInscripcion,
  requiereInscripcion,
  alCambiarUrlInformacion,
  alCambiarUrlInscripcion,
  alCambiarRequiereInscripcion,
  errores = {},
  deshabilitado = false,
}: Propiedades) {
  const enlaceInformacion =
    obtenerUrlPrevisualizacion(
      urlInformacion,
    );

  const enlaceInscripcion =
    obtenerUrlPrevisualizacion(
      urlInscripcion,
    );

  const cambiarRequiereInscripcion = (
    activo: boolean,
  ) => {
    alCambiarRequiereInscripcion(
      activo,
    );

    if (!activo) {
      alCambiarUrlInscripcion(
        "",
      );
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">
          Enlaces e inscripción
        </h2>

        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Añade una página con más
          información o un formulario
          externo para apuntarse.
        </p>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">
            Enlace de información
          </span>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              value={urlInformacion}
              onChange={(evento) =>
                alCambiarUrlInformacion(
                  evento.target.value,
                )
              }
              disabled={deshabilitado}
              maxLength={2000}
              aria-invalid={
                Boolean(
                  errores.urlInformacion,
                )
              }
              placeholder="https://..."
              className={`h-11 min-w-0 flex-1 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                errores.urlInformacion
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant focus:border-primary focus:ring-primary/20"
              }`}
            />

            {enlaceInformacion && (
              <a
                href={
                  enlaceInformacion
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-container"
              >
                Abrir enlace

                <span
                  className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                  style={{
                    maskImage:
                      "url('/iconos/panel/enlace.svg')",

                    WebkitMaskImage:
                      "url('/iconos/panel/enlace.svg')",
                  }}
                  aria-hidden="true"
                />
              </a>
            )}
          </div>

          <span
            className={`text-xs leading-5 ${
              errores.urlInformacion
                ? "font-semibold text-error"
                : "text-on-surface-variant"
            }`}
          >
            {errores.urlInformacion ??
              "Puede enlazar a una noticia, documento o página externa con más información."}
          </span>
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={
            requiereInscripcion
          }
          disabled={deshabilitado}
          onClick={() =>
            cambiarRequiereInscripcion(
              !requiereInscripcion,
            )
          }
          className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            requiereInscripcion
              ? "border-primary/50 bg-primary-container/40"
              : "border-outline-variant/60 bg-surface-container-low"
          }`}
        >
          <span>
            <span className="block text-sm font-bold text-on-surface">
              Requiere inscripción
            </span>

            <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">
              Actívalo cuando los
              asistentes deban completar
              un formulario o solicitar
              una plaza.
            </span>
          </span>

          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              requiereInscripcion
                ? "bg-primary"
                : "bg-outline-variant"
            }`}
            aria-hidden="true"
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                requiereInscripcion
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </span>
        </button>

        {requiereInscripcion && (
          <label className="flex flex-col gap-1.5 rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
            <span className="text-sm font-semibold text-on-surface">
              Enlace de inscripción
              <span
                className="ml-1 text-error"
                aria-hidden="true"
              >
                *
              </span>
            </span>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                inputMode="url"
                value={urlInscripcion}
                onChange={(evento) =>
                  alCambiarUrlInscripcion(
                    evento.target.value,
                  )
                }
                disabled={deshabilitado}
                maxLength={2000}
                required
                aria-invalid={
                  Boolean(
                    errores.urlInscripcion,
                  )
                }
                placeholder="https://forms.gle/..."
                className={`h-11 min-w-0 flex-1 rounded-xl border bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  errores.urlInscripcion
                    ? "border-error focus:border-error focus:ring-error/20"
                    : "border-outline-variant focus:border-primary focus:ring-primary/20"
                }`}
              />

              {enlaceInscripcion && (
                <a
                  href={
                    enlaceInscripcion
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-container"
                >
                  Probar formulario

                  <span
                    className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat"
                    style={{
                      maskImage:
                        "url('/iconos/panel/enlace.svg')",

                      WebkitMaskImage:
                        "url('/iconos/panel/enlace.svg')",
                    }}
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>

            <span
              className={`text-xs leading-5 ${
                errores.urlInscripcion
                  ? "font-semibold text-error"
                  : "text-on-surface-variant"
              }`}
            >
              {errores.urlInscripcion ??
                "Este enlace se utilizará en el botón de inscripción del evento."}
            </span>
          </label>
        )}

        {errores.requiereInscripcion && (
          <p
            className="text-sm font-semibold text-error"
            role="alert"
          >
            {
              errores.requiereInscripcion
            }
          </p>
        )}

        <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3">
          <p className="text-xs leading-5 text-on-surface-variant">
            Los enlaces deben comenzar
            por{" "}
            <span className="font-bold">
              https://
            </span>{" "}
            o{" "}
            <span className="font-bold">
              http://
            </span>
            . Antes de publicar el
            evento, comprueba que el
            formulario permite el acceso
            a las personas destinatarias.
          </p>
        </div>
      </div>
    </section>
  );
}