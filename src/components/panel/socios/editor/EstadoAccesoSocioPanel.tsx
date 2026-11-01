
import {
  useEffect,
  useState,
} from "react";

import type {
  CarnetTemporadaSocio,
  SocioPanel,
  ResultadoDesbloquearAccesoSocio,
  RespuestaDesbloquearAccesoSocio,
} from "@tipos/SocioPanel";

interface Propiedades {
  socio: SocioPanel;
  puedeEditar?: boolean;
  alActualizar: (socio: SocioPanel) => void;
}

function formatearFechaHora(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Nunca";
  }

  const fechaConvertida = new Date(fecha);

  if (!Number.isFinite(fechaConvertida.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(fechaConvertida);
}

function actualizarCarnetEnSocio(
  socio: SocioPanel,
  resultado: ResultadoDesbloquearAccesoSocio,
): SocioPanel {
  const actualizarCarnet = (
    carnet: CarnetTemporadaSocio,
  ): CarnetTemporadaSocio => {
    if (carnet.id !== resultado.carnetId) {
      return carnet;
    }

    return {
      ...carnet,
      intentosFallidos: resultado.intentosFallidos,
      bloqueadoHasta: resultado.bloqueadoHasta,
      accesoBloqueado: resultado.accesoBloqueado,
      updatedAt: new Date().toISOString(),
    };
  };

  return {
    ...socio,
    carnetActual: socio.carnetActual
      ? actualizarCarnet(socio.carnetActual)
      : null,
    carnets: socio.carnets.map(actualizarCarnet),
  };
}

export default function EstadoAccesoSocioPanel({
  socio,
  puedeEditar = false,
  alActualizar,
}: Propiedades) {
  const [desbloqueando, setDesbloqueando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  const carnetActual = socio.carnetActual;

  const intentosFallidos =
    carnetActual?.intentosFallidos ?? 0;

  const bloqueadoHasta =
    carnetActual?.bloqueadoHasta ?? null;

  const ultimoAccesoAt =
    carnetActual?.ultimoAccesoAt ?? null;

  const accesoBloqueado =
    carnetActual?.accesoBloqueado ?? false;

  const tieneIntentosFallidos =
    intentosFallidos > 0;

  const tieneBloqueoRegistrado =
    Boolean(bloqueadoHasta);

  const permiteRestablecer =
    puedeEditar &&
    carnetActual !== null &&
    (
      tieneIntentosFallidos ||
      tieneBloqueoRegistrado
    );

  useEffect(() => {
    setError(null);
    setMensaje(null);
  }, [socio.id, carnetActual?.id]);

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
      /*
       * RUTA CORRECTA:
       *
       * /api/panel/socios/[id]/
       * carnets/desbloquear-acceso
       */
      const respuesta = await fetch(
        `/api/panel/socios/${encodeURIComponent(
          socio.id,
        )}/carnets/desbloquear-acceso`,
        {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const contenido =
        (await respuesta.json()) as
          RespuestaDesbloquearAccesoSocio;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        throw new Error(
          contenido.error ||
            "No se ha podido desbloquear el acceso.",
        );
      }

      const resultado = contenido.data;

      if (
        resultado.socioId !== socio.id ||
        resultado.carnetId !== carnetActual.id
      ) {
        throw new Error(
          "La respuesta no corresponde al carnet seleccionado.",
        );
      }

      const socioActualizado =
        actualizarCarnetEnSocio(
          socio,
          resultado,
        );

      alActualizar(socioActualizado);

      setMensaje(
        "El bloqueo temporal y los intentos fallidos se han restablecido correctamente.",
      );
    } catch (errorCapturado) {
      console.error(
        "Error desbloqueando el acceso del socio:",
        errorCapturado,
      );

      setError(
        errorCapturado instanceof Error
          ? errorCapturado.message
          : "No se ha podido desbloquear el acceso.",
      );
    } finally {
      setDesbloqueando(false);
    }
  }

  if (!carnetActual) {
    return (
      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className="inline-block h-10 w-10 shrink-0 bg-outline mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/panel/seguridad.svg')",
              WebkitMaskImage:
                "url('/iconos/panel/seguridad.svg')",
            }}
            aria-hidden="true"
          />

          <div>
            <h2 className="text-xl font-bold text-on-surface">
              Acceso del socio
            </h2>

            <p className="mt-2 text-sm text-on-surface-variant">
              Este socio no tiene carnet para la
              temporada activa.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <header className="border-b border-outline-variant/60 p-5 sm:p-6">
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
              Consulta los intentos de acceso y
              restablece los bloqueos temporales
              del carnet.
            </p>

            <p className="mt-2 font-mono text-xs font-bold text-primary">
              {carnetActual.numeroCarnet}
              {" · "}
              {carnetActual.temporada.nombre}
            </p>
          </div>
        </div>
      </header>

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
                  ? "Acceso temporalmente bloqueado"
                  : tieneIntentosFallidos
                    ? "Hay intentos fallidos registrados"
                    : "Sin bloqueos temporales"}
              </p>

              <p className="mt-1 text-sm leading-6 opacity-85">
                {accesoBloqueado
                  ? `El carnet no podrá utilizarse hasta el ${formatearFechaHora(
                      bloqueadoHasta,
                    )}, salvo que un administrador restablezca el acceso.`
                  : tieneIntentosFallidos
                    ? "Existen intentos incorrectos, pero el acceso no está bloqueado temporalmente."
                    : "No existen intentos fallidos ni bloqueos temporales registrados."}
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
              {intentosFallidos}
            </dd>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Bloqueado hasta
            </dt>

            <dd className="mt-1 text-sm font-bold text-on-surface">
              {bloqueadoHasta
                ? formatearFechaHora(bloqueadoHasta)
                : "Sin bloqueo"}
            </dd>
          </div>

          <div className="rounded-xl bg-surface-container-low p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Último acceso
            </dt>

            <dd className="mt-1 text-sm font-bold text-on-surface">
              {formatearFechaHora(ultimoAccesoAt)}
            </dd>
          </div>
        </dl>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
          >
            {error}
          </p>
        )}

        {mensaje && (
          <p
            role="status"
            className="rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm text-on-success-container"
          >
            {mensaje}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-outline-variant/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-on-surface-variant">
            Esta acción reinicia los intentos
            fallidos y elimina el bloqueo temporal.
            No cambia la contraseña ni el estado
            administrativo del carnet.
          </p>

          {permiteRestablecer && (
            <button
              type="button"
              onClick={() => void desbloquear()}
              disabled={desbloqueando}
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
            (tieneIntentosFallidos ||
              tieneBloqueoRegistrado) && (
              <p className="text-sm font-semibold text-on-surface-variant">
                No tienes permiso para restablecer el acceso.
              </p>
            )}
        </div>
      </div>
    </section>
  );
}
