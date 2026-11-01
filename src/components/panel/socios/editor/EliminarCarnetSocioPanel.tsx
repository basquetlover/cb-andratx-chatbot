
import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  CarnetTemporadaSocio,
  RespuestaSocioPanel,
  SocioPanel,
} from "@tipos/SocioPanel";

interface Propiedades {
  socioId: string;
  carnet: CarnetTemporadaSocio;

  alActualizar: (socio: SocioPanel) => void;
}

export default function EliminarCarnetSocioPanel({
  socioId,
  carnet,
  alActualizar,
}: Propiedades) {
  const [mostrarPopup, setMostrarPopup] =
    useState(false);

  const [eliminando, setEliminando] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const botonCancelar =
    useRef<HTMLButtonElement>(null);

  const botonAbrir =
    useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mostrarPopup) {
      return;
    }

    botonCancelar.current?.focus();

    function manejarTeclado(evento: KeyboardEvent) {
      if (
        evento.key === "Escape" &&
        !eliminando
      ) {
        setMostrarPopup(false);
        setError(null);
        botonAbrir.current?.focus();
      }
    }

    window.addEventListener(
      "keydown",
      manejarTeclado,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        manejarTeclado,
      );
    };
  }, [mostrarPopup, eliminando]);

  function abrirPopup() {
    if (eliminando) {
      return;
    }

    setError(null);
    setMostrarPopup(true);
  }

  function cerrarPopup() {
    if (eliminando) {
      return;
    }

    setMostrarPopup(false);
    setError(null);

    botonAbrir.current?.focus();
  }

  async function confirmarEliminacion() {
    if (eliminando) {
      return;
    }

    setEliminando(true);
    setError(null);

    try {
      const respuesta = await fetch(
        `/api/panel/socios/${encodeURIComponent(
          socioId,
        )}/carnets/${encodeURIComponent(carnet.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",

          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            confirmar: true,
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaSocioPanel;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data?.socio
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido eliminar el carnet.",
        );
      }

      setMostrarPopup(false);

      alActualizar(contenido.data.socio);
    } catch (errorCapturado) {
      console.error(
        "Error eliminando el carnet:",
        errorCapturado,
      );

      setError(
        errorCapturado instanceof Error
          ? errorCapturado.message
          : "No se ha podido eliminar el carnet.",
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <>
      <button
        ref={botonAbrir}
        type="button"
        onClick={abrirPopup}
        disabled={eliminando}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-error/40 bg-error-container px-4 py-2.5 text-sm font-bold text-on-error-container transition-colors hover:bg-error/15 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={`Eliminar carnet ${carnet.numeroCarnet}`}
      >
        <span
          className="text-lg leading-none"
          aria-hidden="true"
        >
          ×
        </span>

        Eliminar carnet
      </button>

      {mostrarPopup && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`titulo-eliminar-${carnet.id}`}
            aria-describedby={`descripcion-eliminar-${carnet.id}`}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl"
          >
            <div className="border-b border-outline-variant/60 bg-error-container/50 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error-container text-2xl font-black text-on-error-container"
                  aria-hidden="true"
                >
                  !
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-error">
                    Confirmación necesaria
                  </p>

                  <h2
                    id={`titulo-eliminar-${carnet.id}`}
                    className="mt-1 text-xl font-black text-on-surface"
                  >
                    Eliminar carnet
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Estás a punto de eliminar
                    definitivamente este carnet
                    del sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  Carnet seleccionado
                </p>

                <p className="mt-2 break-all font-mono text-xl font-black text-on-surface">
                  {carnet.numeroCarnet}
                </p>

                <div className="mt-3 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-on-surface">
                      Temporada:
                    </span>{" "}
                    {carnet.temporada.nombre}
                  </p>

                  <p>
                    <span className="font-semibold text-on-surface">
                      Socio nº:
                    </span>{" "}
                    {carnet.numeroSocio}
                  </p>
                </div>
              </div>

              <div
                id={`descripcion-eliminar-${carnet.id}`}
                className="rounded-xl border border-error/25 bg-error-container/30 p-4"
              >
                <p className="text-sm font-bold text-on-surface">
                  Esta acción no se puede deshacer.
                </p>

                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Se eliminará exclusivamente
                  este carnet y sus datos de la
                  temporada. El socio continuará
                  existiendo y conservará los
                  demás carnets que tenga.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
                >
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  ref={botonCancelar}
                  type="button"
                  onClick={cerrarPopup}
                  disabled={eliminando}
                  className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmarEliminacion}
                  disabled={eliminando}
                  className="min-h-11 rounded-xl bg-error px-5 py-3 text-sm font-bold text-on-error transition-colors hover:bg-error/90 disabled:cursor-wait disabled:opacity-60"
                >
                  {eliminando
                    ? "Eliminando..."
                    : "Sí, eliminar carnet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
