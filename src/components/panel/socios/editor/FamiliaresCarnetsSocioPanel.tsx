
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import type {
  CarnetTemporadaSocio,
  SocioPanel,
} from "@tipos/SocioPanel";

import type {
  FamiliarCarnetSocio,
  RespuestaFamiliaresCarnetSocio,
} from "@tipos/FamiliaresCarnetSocio";

interface Propiedades {
  socio: SocioPanel;
  puedeEditar: boolean;
}

interface PropiedadesCarnet {
  socioId: string;
  nombreTitular: string;
  carnet: CarnetTemporadaSocio;
  carnetsOrigen: CarnetTemporadaSocio[];
  puedeEditar: boolean;
}

const MAX_FAMILIARES = 30;

function esFamiliar(
  carnet: CarnetTemporadaSocio,
): boolean {
  return (
    carnet.tipoSocio?.trim().toLowerCase() ===
    "familiar"
  );
}

function rutaFamiliares(
  socioId: string,
  carnetId: string,
): string {
  return `/api/panel/socios/${encodeURIComponent(
    socioId,
  )}/carnets/${encodeURIComponent(
    carnetId,
  )}/familiares`;
}

async function interpretarRespuesta(
  respuesta: Response,
): Promise<{
  familiares: FamiliarCarnetSocio[];
  copiados?: number;
}> {
  let contenido:
    RespuestaFamiliaresCarnetSocio | null = null;

  try {
    contenido =
      (await respuesta.json()) as
        RespuestaFamiliaresCarnetSocio;
  } catch {
    throw new Error(
      "La API no ha devuelto una respuesta JSON válida.",
    );
  }

  if (
    !respuesta.ok ||
    contenido?.ok !== true ||
    !Array.isArray(contenido.data?.familiares)
  ) {
    throw new Error(
      contenido?.error ||
        "No se ha podido gestionar los familiares.",
    );
  }

  return contenido.data;
}

function CarnetFamiliar({
  socioId,
  nombreTitular,
  carnet,
  carnetsOrigen,
  puedeEditar,
}: PropiedadesCarnet) {
  const [familiares, setFamiliares] =
    useState<FamiliarCarnetSocio[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [procesando, setProcesando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  const [nuevoNombre, setNuevoNombre] =
    useState("");

  const [editandoId, setEditandoId] =
    useState<string | null>(null);

  const [nombreEditado, setNombreEditado] =
    useState("");

  const [eliminandoId, setEliminandoId] =
    useState<string | null>(null);

  const [carnetOrigenId, setCarnetOrigenId] =
    useState(carnetsOrigen[0]?.id ?? "");

  const ruta = rutaFamiliares(
    socioId,
    carnet.id,
  );

  useEffect(() => {
    const controlador = new AbortController();
    let activo = true;

    setCargando(true);
    setError(null);
    setMensaje(null);

    void (async () => {
      try {
        const respuesta = await fetch(
          ruta,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controlador.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        const datos =
          await interpretarRespuesta(respuesta);

        if (activo) {
          setFamiliares(datos.familiares);
        }
      } catch (capturado) {
        if (activo) {
          setError(
            capturado instanceof Error
              ? capturado.message
              : "No se han podido cargar los familiares.",
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    })();

    return () => {
      activo = false;
      controlador.abort();
    };
  }, [ruta]);

  async function modificar(
    metodo: "POST" | "PATCH" | "DELETE",
    cuerpo: Record<string, unknown>,
    mensajeCorrecto: (
      copiados?: number,
    ) => string,
  ): Promise<boolean> {
    if (
      !puedeEditar ||
      procesando ||
      cargando
    ) {
      return false;
    }

    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(
        ruta,
        {
          method: metodo,
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cuerpo),
        },
      );

      const datos =
        await interpretarRespuesta(respuesta);

      setFamiliares(datos.familiares);
      setMensaje(
        mensajeCorrecto(datos.copiados),
      );

      return true;
    } catch (capturado) {
      setError(
        capturado instanceof Error
          ? capturado.message
          : "No se ha podido completar la operación.",
      );

      return false;
    } finally {
      setProcesando(false);
    }
  }

  async function anadir(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!nuevoNombre.trim()) {
      return;
    }

    const correcto = await modificar(
      "POST",
      {
        accion: "anadir",
        nombreCompleto: nuevoNombre,
      },
      () => "Familiar añadido correctamente.",
    );

    if (correcto) {
      setNuevoNombre("");
    }
  }

  async function guardarNombre(
    evento: FormEvent<HTMLFormElement>,
    familiarId: string,
  ) {
    evento.preventDefault();

    if (!nombreEditado.trim()) {
      return;
    }

    const correcto = await modificar(
      "PATCH",
      {
        familiarId,
        nombreCompleto: nombreEditado,
      },
      () => "Nombre actualizado correctamente.",
    );

    if (correcto) {
      setEditandoId(null);
    }
  }

  async function eliminar(
    familiarId: string,
  ) {
    const correcto = await modificar(
      "DELETE",
      {
        familiarId,
      },
      () =>
        "El familiar se ha quitado de este carnet.",
    );

    if (correcto) {
      setEliminandoId(null);
    }
  }

  async function copiar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!carnetOrigenId) {
      return;
    }

    await modificar(
      "POST",
      {
        accion: "copiar",
        origenCarnetId: carnetOrigenId,
      },
      (cantidad) => {
        const total = cantidad ?? 0;

        return total === 0
          ? "No había familiares nuevos para copiar."
          : `Se han copiado ${total} familiar${
              total === 1 ? "" : "es"
            } al nuevo carnet.`;
      },
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <header className="flex flex-col justify-between gap-3 border-b border-outline-variant/60 bg-surface-container-low p-5 sm:flex-row sm:items-center sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Carnet familiar
          </p>

          <h3 className="mt-1 text-lg font-bold text-on-surface">
            {carnet.temporada.nombre}
          </h3>

          <p className="mt-1 font-mono text-xs text-on-surface-variant">
            {carnet.numeroCarnet}
          </p>
        </div>

        <span className="w-fit rounded-full border border-primary/25 bg-primary-container px-3 py-1.5 text-xs font-bold text-on-primary-container">
          {cargando
            ? "Cargando..."
            : `${familiares.length + 1} persona${
                familiares.length + 1 === 1
                  ? ""
                  : "s"
              } incluida${
                familiares.length + 1 === 1
                  ? ""
                  : "s"
              }`}
        </span>
      </header>

      <div className="grid gap-5 p-5 sm:p-6">
        <div>
          <h4 className="text-sm font-bold text-on-surface">
            Personas incluidas
          </h4>

          <p className="mt-1 text-xs leading-5 text-on-surface-variant">
            El titular se incluye automáticamente.
            Las demás personas pertenecen solo a
            este carnet y su temporada.
          </p>

          <ul className="mt-3 grid gap-2">
            <li className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary-container/40 px-4 py-3">
              <span className="min-w-0 break-words text-sm font-bold text-on-surface">
                {nombreTitular}
              </span>

              <span className="shrink-0 text-xs font-bold text-primary">
                Titular
              </span>
            </li>

            {familiares.map((familiar) => (
              <li
                key={familiar.id}
                className="rounded-xl border border-outline-variant/60 bg-surface-container-low px-4 py-3"
              >
                {editandoId === familiar.id ? (
                  <form
                    onSubmit={(evento) =>
                      void guardarNombre(
                        evento,
                        familiar.id,
                      )
                    }
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <input
                      type="text"
                      aria-label="Nombre y apellidos del familiar"
                      value={nombreEditado}
                      onChange={(evento) =>
                        setNombreEditado(
                          evento.target.value,
                        )
                      }
                      maxLength={120}
                      required
                      disabled={procesando}
                      className="min-h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() =>
                          setEditandoId(null)
                        }
                        className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-bold text-on-surface"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={
                          procesando ||
                          !nombreEditado.trim()
                        }
                        className="min-h-10 rounded-lg bg-primary px-3 text-xs font-bold text-on-primary disabled:opacity-50"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : eliminandoId === familiar.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-error">
                      ¿Quitar a{" "}
                      {familiar.nombreCompleto} de
                      este carnet?
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() =>
                          setEliminandoId(null)
                        }
                        className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-bold text-on-surface"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() =>
                          void eliminar(familiar.id)
                        }
                        className="min-h-10 rounded-lg bg-error px-3 text-xs font-bold text-on-error disabled:opacity-50"
                      >
                        Confirmar eliminación
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="min-w-0 break-words text-sm font-medium text-on-surface">
                      {familiar.nombreCompleto}
                    </span>

                    {puedeEditar && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() => {
                            setEditandoId(familiar.id);
                            setEliminandoId(null);
                            setNombreEditado(
                              familiar.nombreCompleto,
                            );
                          }}
                          className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-bold text-primary disabled:opacity-50"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={procesando}
                          onClick={() => {
                            setEliminandoId(
                              familiar.id,
                            );
                            setEditandoId(null);
                          }}
                          className="rounded-lg border border-error/30 px-3 py-2 text-xs font-bold text-error disabled:opacity-50"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {cargando && (
            <p
              role="status"
              className="mt-3 text-sm text-on-surface-variant"
            >
              Cargando los familiares...
            </p>
          )}

          {!cargando &&
            familiares.length === 0 && (
              <p className="mt-3 text-xs text-on-surface-variant">
                No hay familiares adicionales
                registrados.
              </p>
            )}
        </div>

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

        {puedeEditar && (
          <>
            <form
              onSubmit={(evento) =>
                void anadir(evento)
              }
              className="grid gap-3 border-t border-outline-variant/60 pt-5"
            >
              <div>
                <h4 className="text-sm font-bold text-on-surface">
                  Añadir familiar
                </h4>

                <p className="mt-1 text-xs text-on-surface-variant">
                  Hasta {MAX_FAMILIARES} personas
                  adicionales por carnet.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(evento) =>
                    setNuevoNombre(
                      evento.target.value,
                    )
                  }
                  placeholder="Nombre y apellidos"
                  aria-label="Nombre y apellidos del nuevo familiar"
                  maxLength={120}
                  required
                  disabled={
                    procesando ||
                    cargando ||
                    familiares.length >=
                      MAX_FAMILIARES
                  }
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm text-on-surface outline-none focus:border-primary"
                />

                <button
                  type="submit"
                  disabled={
                    procesando ||
                    cargando ||
                    familiares.length >=
                      MAX_FAMILIARES ||
                    !nuevoNombre.trim()
                  }
                  className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {procesando
                    ? "Guardando..."
                    : "Añadir familiar"}
                </button>
              </div>
            </form>

            {carnetsOrigen.length > 0 && (
              <form
                onSubmit={(evento) =>
                  void copiar(evento)
                }
                className="grid gap-3 rounded-xl border border-primary/20 bg-primary-fixed/40 p-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-on-surface">
                    Copiar familiares de otra
                    temporada
                  </h4>

                  <p className="mt-1 text-xs leading-5 text-on-surface-variant">
                    Copia los nombres del carnet
                    anterior a este. El historial
                    original no se modifica y se
                    omiten los nombres repetidos.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={carnetOrigenId}
                    onChange={(evento) =>
                      setCarnetOrigenId(
                        evento.target.value,
                      )
                    }
                    aria-label="Carnet familiar de origen"
                    disabled={
                      cargando || procesando
                    }
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface"
                  >
                    {carnetsOrigen.map((origen) => (
                      <option
                        key={origen.id}
                        value={origen.id}
                      >
                        {origen.temporada.nombre}{" "}
                        · {origen.numeroCarnet}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={
                      cargando ||
                      procesando ||
                      !carnetOrigenId
                    }
                    className="min-h-11 rounded-xl border border-primary px-5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:opacity-50"
                  >
                    Copiar familiares
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </article>
  );
}

export default function FamiliaresCarnetsSocioPanel({
  socio,
  puedeEditar,
}: Propiedades) {
  const carnetsFamiliares =
    socio.carnets.filter(esFamiliar);

  if (carnetsFamiliares.length === 0) {
    return null;
  }

  return (
    <section
      className="grid gap-5"
      aria-labelledby="titulo-familiares-carnets"
    >
      <header className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">
          Modalidad familiar
        </p>

        <h2
          id="titulo-familiares-carnets"
          className="mt-1 text-xl font-bold text-on-surface"
        >
          Familiares incluidos en los carnets
        </h2>

        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Gestiona las personas incluidas en
          cada temporada. Puedes copiar los
          familiares desde otro carnet familiar
          del mismo socio.
        </p>
      </header>

      {carnetsFamiliares.map((carnet) => (
        <CarnetFamiliar
          key={carnet.id}
          socioId={socio.id}
          nombreTitular={socio.nombreCompleto}
          carnet={carnet}
          carnetsOrigen={carnetsFamiliares.filter(
            (otro) => otro.id !== carnet.id,
          )}
          puedeEditar={puedeEditar}
        />
      ))}
    </section>
  );
}
