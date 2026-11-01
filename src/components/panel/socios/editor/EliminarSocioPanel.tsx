
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

interface Propiedades {
  socioId: string;
  nombreSocio: string;
}

interface RespuestaEliminarSocio {
  ok: boolean;
  data: {
    eliminado: true;
    socioId: string;
    carnetsEliminados: number;
  } | null;
  error: string | null;
}

export default function EliminarSocioPanel({
  socioId,
  nombreSocio,
}: Propiedades) {
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  const dialogo = useRef<HTMLDialogElement>(null);
  const campoPassword = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const elemento = dialogo.current;

    if (elemento && !elemento.open) {
      elemento.showModal();
    }

    campoPassword.current?.focus();

    return () => {
      if (elemento?.open) {
        elemento.close();
      }
    };
  }, [abierto]);

  function abrir() {
    setPassword("");
    setError(null);
    setVisible(false);
    setAbierto(true);
  }

  function cerrar() {
    if (eliminando) {
      return;
    }

    setPassword("");
    setError(null);
    setAbierto(false);
  }

  async function confirmar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (eliminando || !password) {
      return;
    }

    setEliminando(true);
    setError(null);

    try {
      const respuesta = await fetch(
        `/api/panel/socios/${encodeURIComponent(
          socioId,
        )}/eliminar`,
        {
          method: "DELETE",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmar: true,
            password,
          }),
        },
      );

      const contenido =
        (await respuesta.json()) as RespuestaEliminarSocio;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        contenido.data?.eliminado !== true
      ) {
        throw new Error(
          contenido.error ??
            "No se ha podido eliminar el socio.",
        );
      }

      setPassword("");

      window.location.assign("/panel/socios");
    } catch (errorCapturado) {
      console.error(
        "Error solicitando la eliminación del socio:",
        errorCapturado,
      );

      setError(
        errorCapturado instanceof Error
          ? errorCapturado.message
          : "No se ha podido eliminar el socio.",
      );
    } finally {
      setEliminando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-error/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wide text-error">
            Zona de eliminación
          </p>

          <h2 className="mt-1 text-lg font-bold text-on-surface">
            Eliminar socio definitivamente
          </h2>

          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Elimina la ficha completa del socio y todos
            sus carnets. Esta operación requiere
            introducir la contraseña del administrador
            que ha iniciado sesión.
          </p>
        </div>

        <button
          type="button"
          onClick={abrir}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-error px-5 py-3 text-sm font-bold text-on-error transition-colors hover:bg-error/90"
        >
          Eliminar socio
        </button>
      </div>

      <dialog
        ref={dialogo}
        onCancel={(evento) => {
          evento.preventDefault();
          cerrar();
        }}
        onClick={(evento) => {
          if (evento.target === evento.currentTarget) {
            cerrar();
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-0 text-on-surface shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
        aria-labelledby="titulo-eliminar-socio"
        aria-describedby="descripcion-eliminar-socio"
      >
        {abierto && (
          <form
            onSubmit={confirmar}
            className="overflow-hidden"
          >
            <header className="border-b border-outline-variant/60 bg-error-container/40 p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-error">
                Confirmación de seguridad
              </p>

              <h2
                id="titulo-eliminar-socio"
                className="mt-2 text-xl font-black"
              >
                ¿Eliminar este socio?
              </h2>

              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Estás a punto de eliminar
                definitivamente el registro de:
              </p>

              <p className="mt-3 break-words text-lg font-bold">
                {nombreSocio}
              </p>
            </header>

            <div className="space-y-5 p-5 sm:p-6">
              <div
                id="descripcion-eliminar-socio"
                className="rounded-xl border border-error/30 bg-error-container/25 p-4"
              >
                <p className="text-sm font-bold">
                  Esta acción no se puede deshacer.
                </p>

                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Se eliminarán los datos del socio
                  y todos sus carnets de temporada.
                  No podrás recuperarlos desde el panel.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password-eliminar-socio"
                  className="block text-sm font-bold text-on-surface"
                >
                  Contraseña del administrador
                </label>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Introduce la contraseña de tu propia
                  cuenta para autorizar la eliminación.
                </p>

                <div className="mt-2 flex overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
                  <input
                    ref={campoPassword}
                    id="password-eliminar-socio"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={1}
                    maxLength={128}
                    value={password}
                    disabled={eliminando}
                    onChange={(evento) =>
                      setPassword(evento.target.value)
                    }
                    placeholder="Tu contraseña"
                    className="min-h-12 min-w-0 flex-1 bg-transparent px-4 text-sm text-on-surface outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setVisible(!visible)}
                    disabled={eliminando}
                    className="px-4 text-xs font-bold text-primary disabled:opacity-50"
                  >
                    {visible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
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
                  type="button"
                  onClick={cerrar}
                  disabled={eliminando}
                  className="min-h-11 rounded-xl border border-outline-variant bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={eliminando || !password}
                  className="min-h-11 rounded-xl bg-error px-5 py-3 text-sm font-bold text-on-error hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {eliminando
                    ? "Eliminando..."
                    : "Eliminar definitivamente"}
                </button>
              </div>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}
