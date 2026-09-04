import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  CarnetTemporadaSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

interface Propiedades {
  socio: SocioPanel;

  alActualizar: (
    socio: SocioPanel,
  ) => void;

  puedeEditar?: boolean;
}

interface ResultadoDesbloqueo {
  socioId: string;
  carnetId: string;

  desbloqueado: boolean;

  intentosFallidos: number;

  bloqueadoHasta:
    | string
    | null;

  accesoBloqueado: boolean;
}

interface RespuestaDesbloqueo {
  ok: boolean;

  data:
    | ResultadoDesbloqueo
    | null;

  error: string | null;
}

function formatearFechaHora(
  fecha:
    | string
    | null,
): string {
  if (!fecha) {
    return "Nunca";
  }

  const fechaConvertida =
    new Date(fecha);

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
      dateStyle: "medium",
      timeStyle: "short",

      timeZone:
        "Europe/Madrid",
    },
  ).format(
    fechaConvertida,
  );
}

function actualizarCarnetEnSocio(
  socio: SocioPanel,
  resultado:
    ResultadoDesbloqueo,
): SocioPanel {
  const carnetActual =
    socio.carnetActual;

  if (
    !carnetActual ||
    carnetActual.id !==
      resultado.carnetId
  ) {
    return socio;
  }

  const carnetActualizado:
    CarnetTemporadaSocio = {
      ...carnetActual,

      intentosFallidos:
        resultado.intentosFallidos,

      bloqueadoHasta:
        resultado.bloqueadoHasta,

      accesoBloqueado:
        resultado.accesoBloqueado,

      updatedAt:
        new Date().toISOString(),
    };

  return {
    ...socio,

    carnetActual:
      carnetActualizado,

    carnets:
      socio.carnets.map(
        (carnet) =>
          carnet.id ===
          resultado.carnetId
            ? carnetActualizado
            : carnet,
      ),
  };
}

export default function EstadoAccesoSocioPanel({
  socio,
  alActualizar,
  puedeEditar = true,
}: Propiedades) {
  const [
    desbloqueando,
    setDesbloqueando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    mensaje,
    setMensaje,
  ] = useState<
    string | null
  >(null);

  const carnetActual =
    socio.carnetActual;

  const intentosFallidos =
    carnetActual
      ?.intentosFallidos ??
    0;

  const bloqueadoHasta =
    carnetActual
      ?.bloqueadoHasta ??
    null;

  const ultimoAccesoAt =
    carnetActual
      ?.ultimoAccesoAt ??
    null;

  const accesoBloqueado =
    carnetActual
      ?.accesoBloqueado ??
    false;

  const tieneBloqueoRegistrado =
    Boolean(
      bloqueadoHasta,
    );

  const tieneIntentosFallidos =
    intentosFallidos > 0;

  const permiteRestablecer =
    Boolean(
      carnetActual,
    ) &&
    puedeEditar &&
    (
      tieneIntentosFallidos ||
      tieneBloqueoRegistrado
    );

  const descripcionCarnet =
    useMemo(
      () => {
        if (!carnetActual) {
          return null;
        }

        return [
          carnetActual.numeroCarnet,
          carnetActual
            .temporada.nombre,
        ]
          .filter(Boolean)
          .join(" · ");
      },
      [
        carnetActual,
      ],
    );

  useEffect(() => {
    setError(null);
    setMensaje(null);
    setDesbloqueando(false);
  }, [
    socio.id,
    carnetActual?.id,
    intentosFallidos,
    bloqueadoHasta,
  ]);

  async function desbloquear() {
    if (
      desbloqueando ||
      !permiteRestablecer ||
      !carnetActual
    ) {
      return;
    }

    setDesbloqueando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta =
        await fetch(
          `/api/panel/socios/${encodeURIComponent(
            socio.id,
          )}/desbloquear-acceso`,
          {
            method: "POST",

            credentials:
              "same-origin",

            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const contenido =
        (await respuesta.json()) as
          RespuestaDesbloqueo;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido desbloquear el acceso.",
        );
      }

      const socioActualizado =
        actualizarCarnetEnSocio(
          socio,
          contenido.data,
        );

      alActualizar(
        socioActualizado,
      );

      setMensaje(
        contenido.data.desbloqueado
          ? "El acceso al carnet se ha desbloqueado correctamente."
          : "El carnet no tenía ningún bloqueo de acceso.",
      );
    } catch (error) {
      console.error(
        "Error desbloqueando el acceso al carnet:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se ha podido desbloquear el acceso.",
      );
    } finally {
      setDesbloqueando(
        false,
      );
    }
  }

  if (!carnetActual) {
    return (
      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
              <span
                className="inline-block h-6 w-6 bg-current mask-center mask-contain mask-no-repeat"
                style={{
                  maskImage:
                    "url('/iconos/panel/seguridad.svg')",

                  WebkitMaskImage:
                    "url('/iconos/panel/seguridad.svg')",
                }}
                aria-hidden="true"
              />
            </span>

            <div className="min-w-0">
              <h2 className="text-xl font-bold text-on-surface">
                Acceso del socio
              </h2>

              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                No existe un carnet para la
                temporada activa.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
            <p className="font-bold text-on-surface">
              Sin acceso disponible
            </p>

            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              El socio necesita un carnet
              para la temporada activa antes
              de poder iniciar sesión en su
              área privada.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              accesoBloqueado
                ? "bg-error-container text-on-error-container"
                : tieneIntentosFallidos
                  ? "bg-tertiary-container text-on-tertiary-container"
                  : "bg-primary-container text-on-primary-container"
            }`}
          >
            <span
              className="inline-block h-6 w-6 bg-current mask-center mask-contain mask-no-repeat"
              style={{
                maskImage:
                  "url('/iconos/panel/seguridad.svg')",

                WebkitMaskImage:
                  "url('/iconos/panel/seguridad.svg')",
              }}
              aria-hidden="true"
            />
          </span>

          <div className="min-w-0">
            <h2 className="text-xl font-bold text-on-surface">
              Acceso del carnet
            </h2>

            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              Consulta los intentos de inicio
              de sesión y desbloquea
              manualmente el acceso cuando
              sea necesario.
            </p>

            {descripcionCarnet && (
              <p className="mt-2 font-mono text-xs font-bold text-primary">
                {descripcionCarnet}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6">
        <div
          className={`rounded-2xl border p-4 ${
            accesoBloqueado
              ? "border-error/30 bg-error-container text-on-error-container"
              : tieneIntentosFallidos
                ? "border-tertiary/30 bg-tertiary-container text-on-tertiary-container"
                : "border-primary/20 bg-primary-container text-on-primary-container"
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                accesoBloqueado
                  ? "bg-error"
                  : tieneIntentosFallidos
                    ? "bg-tertiary"
                    : "bg-success"
              }`}
              aria-hidden="true"
            />

            <div>
              <p className="font-bold">
                {accesoBloqueado
                  ? "Acceso bloqueado temporalmente"
                  : tieneIntentosFallidos
                    ? "Hay intentos fallidos registrados"
                    : "Acceso disponible"}
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {accesoBloqueado
                  ? `El socio no podrá iniciar sesión con este carnet hasta el ${formatearFechaHora(
                      bloqueadoHasta,
                    )}, salvo que un administrador lo desbloquee.`
                  : tieneIntentosFallidos
                    ? "El socio todavía puede acceder, pero existen intentos de inicio de sesión incorrectos."
                    : "No existen bloqueos ni intentos fallidos pendientes para este carnet."}
              </p>
            </div>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Intentos fallidos
            </dt>

            <dd
              className={`mt-1 text-xl font-bold ${
                tieneIntentosFallidos
                  ? "text-error"
                  : "text-on-surface"
              }`}
            >
              {
                intentosFallidos
              }
            </dd>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Bloqueado hasta
            </dt>

            <dd className="mt-1 text-sm font-bold text-on-surface">
              {bloqueadoHasta
                ? formatearFechaHora(
                    bloqueadoHasta,
                  )
                : "Sin bloqueo"}
            </dd>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Último acceso
            </dt>

            <dd className="mt-1 text-sm font-bold text-on-surface">
              {formatearFechaHora(
                ultimoAccesoAt,
              )}
            </dd>
          </div>
        </dl>

        {error && (
          <p
            className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
            role="alert"
          >
            {error}
          </p>
        )}

        {mensaje && (
          <p
            className="rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm text-on-success-container"
            role="status"
          >
            {mensaje}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-outline-variant/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-on-surface-variant">
            Esta acción elimina el bloqueo
            temporal y reinicia los intentos
            fallidos. No cambia la contraseña
            ni el estado administrativo del
            carnet.
          </p>

          {permiteRestablecer && (
            <button
              type="button"
              onClick={
                desbloquear
              }
              disabled={
                desbloqueando
              }
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {desbloqueando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  aria-hidden="true"
                />
              )}

              {desbloqueando
                ? "Desbloqueando..."
                : accesoBloqueado
                  ? "Desbloquear acceso"
                  : "Restablecer intentos"}
            </button>
          )}

          {!puedeEditar &&
            (
              tieneIntentosFallidos ||
              tieneBloqueoRegistrado
            ) && (
              <p className="text-sm font-semibold text-on-surface-variant">
                No tienes permiso para
                desbloquear este acceso.
              </p>
            )}
        </div>
      </div>
    </section>
  );
}