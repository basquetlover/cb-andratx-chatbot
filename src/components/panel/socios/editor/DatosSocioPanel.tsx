import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  SocioPanel,
} from "@tipos/SocioPanel";

interface Propiedades {
  socio: SocioPanel;
  puedeEditar: boolean;

  alActualizar: (
    socio: SocioPanel,
  ) => void;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaActualizacion {
  ok: boolean;

  data: {
    socio: SocioPanel;
  } | null;

  error: string | null;

  errores?:
    ErrorCampo[];
}

function obtenerTexto(
  valor: string | null,
): string {
  return valor ?? "";
}

export default function DatosSocioPanel({
  socio,
  puedeEditar,
  alActualizar,
}: Propiedades) {
  const [
    nombre,
    setNombre,
  ] = useState(
    socio.nombre,
  );

  const [
    apellidos,
    setApellidos,
  ] = useState(
    socio.apellidos,
  );

  const [
    email,
    setEmail,
  ] = useState(
    socio.email,
  );

  const [
    telefono,
    setTelefono,
  ] = useState(
    obtenerTexto(
      socio.telefono,
    ),
  );

  const [
    observaciones,
    setObservaciones,
  ] = useState(
    obtenerTexto(
      socio.observaciones,
    ),
  );

  const [
    activo,
    setActivo,
  ] = useState(
    socio.activo,
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    mensaje,
    setMensaje,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    erroresCampo,
    setErroresCampo,
  ] = useState<
    ErrorCampo[]
  >([]);

  useEffect(() => {
    setNombre(
      socio.nombre,
    );

    setApellidos(
      socio.apellidos,
    );

    setEmail(
      socio.email,
    );

    setTelefono(
      obtenerTexto(
        socio.telefono,
      ),
    );

    setObservaciones(
      obtenerTexto(
        socio.observaciones,
      ),
    );

    setActivo(
      socio.activo,
    );
  }, [socio]);

  function obtenerErrorCampo(
    campo: string,
  ): string | null {
    return (
      erroresCampo.find(
        (elemento) =>
          elemento.campo ===
          campo,
      )?.mensaje ?? null
    );
  }

  async function guardarCambios(
    evento:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      !puedeEditar ||
      guardando
    ) {
      return;
    }

    setGuardando(true);
    setMensaje(null);
    setError(null);
    setErroresCampo([]);

    try {
      const respuesta =
        await fetch(
          `/api/panel/socios/${encodeURIComponent(
            socio.id,
          )}`,
          {
            method: "PATCH",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                nombre,
                apellidos,
                email,

                telefono:
                  telefono.trim() ||
                  null,

                observaciones:
                  observaciones.trim() ||
                  null,

                activo,
              }),
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaActualizacion;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        setErroresCampo(
          Array.isArray(
            contenido.errores,
          )
            ? contenido.errores
            : [],
        );

        throw new Error(
          contenido.error ||
            "No se han podido guardar los cambios.",
        );
      }

      alActualizar(
        contenido.data.socio,
      );

      setMensaje(
        "Los datos del socio se han actualizado correctamente.",
      );
    } catch (error) {
      console.error(
        "Error actualizando los datos del socio:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se han podido guardar los cambios.",
      );
    } finally {
      setGuardando(false);
    }
  }

  const formularioModificado =
    nombre !== socio.nombre ||
    apellidos !==
      socio.apellidos ||
    email !== socio.email ||
    telefono !==
      obtenerTexto(
        socio.telefono,
      ) ||
    observaciones !==
      obtenerTexto(
        socio.observaciones,
      ) ||
    activo !== socio.activo;

  const carnetActual =
    socio.carnetActual;

  return (
    <form
      onSubmit={
        guardarCambios
      }
      className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
    >
      <header className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-on-surface">
              Datos del socio
            </h2>

            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Información personal y estado general del acceso.
            </p>
          </div>

          {carnetActual ? (
            <div className="flex w-fit flex-col items-start gap-1 rounded-xl border border-outline-variant bg-surface-container px-3 py-2">
              <span className="text-xs font-bold text-on-surface">
                Socio nº{" "}
                {
                  carnetActual.numeroSocio
                }
              </span>

              <span className="font-mono text-[0.7rem] font-semibold text-on-surface-variant">
                {
                  carnetActual.numeroCarnet
                }
              </span>
            </div>
          ) : (
            <span className="w-fit rounded-full border border-tertiary/30 bg-tertiary-container px-3 py-1.5 text-xs font-bold text-on-tertiary-container">
              Sin carnet en la temporada activa
            </span>
          )}
        </div>
      </header>

      <fieldset
        disabled={
          !puedeEditar ||
          guardando
        }
        className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 disabled:opacity-75"
      >
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Nombre
          </span>

          <input
            type="text"
            value={nombre}
            onChange={(evento) =>
              setNombre(
                evento.target.value,
              )
            }
            required
            maxLength={100}
            autoComplete="given-name"
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
          />

          {obtenerErrorCampo(
            "nombre",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "nombre",
              )}
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Apellidos
          </span>

          <input
            type="text"
            value={apellidos}
            onChange={(evento) =>
              setApellidos(
                evento.target.value,
              )
            }
            required
            maxLength={150}
            autoComplete="family-name"
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
          />

          {obtenerErrorCampo(
            "apellidos",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "apellidos",
              )}
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Correo electrónico
          </span>

          <input
            type="email"
            value={email}
            onChange={(evento) =>
              setEmail(
                evento.target.value,
              )
            }
            required
            maxLength={254}
            autoComplete="email"
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
          />

          {obtenerErrorCampo(
            "email",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "email",
              )}
            </span>
          )}
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-on-surface">
            Teléfono
          </span>

          <input
            type="tel"
            value={telefono}
            onChange={(evento) =>
              setTelefono(
                evento.target.value,
              )
            }
            maxLength={30}
            autoComplete="tel"
            className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
          />

          {obtenerErrorCampo(
            "telefono",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "telefono",
              )}
            </span>
          )}
        </label>

        <label className="grid gap-1.5 sm:col-span-2">
          <span className="text-sm font-bold text-on-surface">
            Observaciones internas
          </span>

          <textarea
            value={
              observaciones
            }
            onChange={(evento) =>
              setObservaciones(
                evento.target.value,
              )
            }
            maxLength={2000}
            rows={4}
            className="resize-y rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed"
          />

          {obtenerErrorCampo(
            "observaciones",
          ) && (
            <span className="text-xs text-error">
              {obtenerErrorCampo(
                "observaciones",
              )}
            </span>
          )}
        </label>

        <label
          className={`flex items-center justify-between gap-4 rounded-xl border p-4 sm:col-span-2 ${
            activo
              ? "border-success/30 bg-success/10"
              : "border-error/30 bg-error-container"
          }`}
        >
          <span>
            <span className="block text-sm font-bold text-on-surface">
              Socio activo
            </span>

            <span className="mt-1 block text-xs leading-5 text-on-surface-variant">
              Al desactivarlo se bloqueará el acceso público de todos sus carnets, aunque alguno figure como activo.
            </span>
          </span>

          <input
            type="checkbox"
            checked={activo}
            onChange={(evento) =>
              setActivo(
                evento.target.checked,
              )
            }
            className="h-5 w-5 shrink-0 accent-primary"
          />
        </label>
      </fieldset>

      {(mensaje || error) && (
        <div className="px-5 pb-5 sm:px-6">
          {mensaje && (
            <p
              className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success"
              role="status"
            >
              {mensaje}
            </p>
          )}

          {error && (
            <p
              className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm font-semibold text-on-error-container"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>
      )}

      <footer className="flex flex-col gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {!puedeEditar ? (
          <p className="text-xs text-on-surface-variant">
            Puedes consultar los datos, pero no modificarlos.
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant">
            La numeración se gestiona por separado desde los carnets de cada temporada.
          </p>
        )}

        {puedeEditar && (
          <button
            type="submit"
            disabled={
              guardando ||
              !formularioModificado
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
        )}
      </footer>
    </form>
  );
}