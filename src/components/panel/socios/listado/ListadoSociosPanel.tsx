import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

type EstadoCarnet =
  | "pendiente"
  | "activo"
  | "bloqueado"
  | "caducado";

interface CarnetListado {
  id: string;
  numeroCarnet: string;
  tipoSocio: string;
  estado: EstadoCarnet;
  fechaCaducidad: string | null;
  temporadaNombre: string;
}

interface SocioListado {
  id: string;
  numeroSocio: number;
  nombreCompleto: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  carnetActual: CarnetListado | null;
}

interface ResultadoListado {
  socios: SocioListado[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

interface TemporadaOpcion {
  id: string;
  nombre: string;
}

interface Propiedades {
  puedeCrear: boolean;
  puedeEditar: boolean;
}

interface RespuestaApi {
  ok: boolean;
  data: unknown;
  error: string | null;
}

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string {
  return typeof valor === "string"
    ? valor.trim()
    : "";
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function convertirNumero(
  valor: unknown,
  predeterminado = 0,
): number {
  if (
    typeof valor === "number" &&
    Number.isFinite(valor)
  ) {
    return valor;
  }

  if (
    typeof valor === "string"
  ) {
    const numero =
      Number(valor);

    if (
      Number.isFinite(numero)
    ) {
      return numero;
    }
  }

  return predeterminado;
}

function convertirEstado(
  valor: unknown,
): EstadoCarnet {
  switch (valor) {
    case "activo":
    case "bloqueado":
    case "caducado":
    case "pendiente":
      return valor;

    default:
      return "pendiente";
  }
}

function convertirCarnet(
  valor: unknown,
): CarnetListado | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(valor.id);

  if (!id) {
    return null;
  }

  const temporada =
    esObjeto(valor.temporada)
      ? valor.temporada
      : null;

  return {
    id,

    numeroCarnet:
      convertirTexto(
        valor.numeroCarnet,
      ),

    tipoSocio:
      convertirTexto(
        valor.tipoSocio,
      ) || "General",

    estado:
      convertirEstado(
        valor.estado,
      ),

    fechaCaducidad:
      convertirTextoNullable(
        valor.fechaCaducidad,
      ),

    temporadaNombre:
      convertirTexto(
        temporada?.nombre,
      ) ||
      convertirTexto(
        valor.temporadaNombre,
      ) ||
      "Temporada",
  };
}

function convertirSocio(
  valor: unknown,
): SocioListado | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(valor.id);

  if (!id) {
    return null;
  }

  const nombre =
    convertirTexto(valor.nombre);

  const apellidos =
    convertirTexto(
      valor.apellidos,
    );

  const nombreCompleto =
    convertirTexto(
      valor.nombreCompleto,
    ) ||
    [nombre, apellidos]
      .filter(Boolean)
      .join(" ") ||
    "Socio";

  const carnetActual =
    convertirCarnet(
      valor.carnetActual ??
        valor.carnetTemporadaActual,
    );

  return {
    id,

    numeroSocio:
      convertirNumero(
        valor.numeroSocio,
      ),

    nombreCompleto,

    email:
      convertirTexto(
        valor.email,
      ),

    telefono:
      convertirTextoNullable(
        valor.telefono,
      ),

    activo:
      valor.activo === true,

    carnetActual,
  };
}

function convertirResultado(
  valor: unknown,
): ResultadoListado {
  if (!esObjeto(valor)) {
    return {
      socios: [],
      total: 0,
      pagina: 1,
      limite: 20,
      totalPaginas: 1,
    };
  }

  const socios =
    Array.isArray(valor.socios)
      ? valor.socios.flatMap(
          (elemento) => {
            const socio =
              convertirSocio(
                elemento,
              );

            return socio
              ? [socio]
              : [];
          },
        )
      : [];

  const total =
    convertirNumero(
      valor.total,
      socios.length,
    );

  const pagina =
    Math.max(
      1,
      convertirNumero(
        valor.pagina,
        1,
      ),
    );

  const limite =
    Math.max(
      1,
      convertirNumero(
        valor.limite,
        20,
      ),
    );

  const totalPaginas =
    Math.max(
      1,
      convertirNumero(
        valor.totalPaginas,
        Math.ceil(
          total / limite,
        ) || 1,
      ),
    );

  return {
    socios,
    total,
    pagina,
    limite,
    totalPaginas,
  };
}

function convertirTemporadas(
  valor: unknown,
): TemporadaOpcion[] {
  if (!esObjeto(valor)) {
    return [];
  }

  const opciones =
    esObjeto(valor.opciones)
      ? valor.opciones
      : valor;

  if (
    !Array.isArray(
      opciones.temporadas,
    )
  ) {
    return [];
  }

  return opciones.temporadas.flatMap(
    (elemento) => {
      if (!esObjeto(elemento)) {
        return [];
      }

      const id =
        convertirTexto(elemento.id);

      const nombre =
        convertirTexto(
          elemento.nombre,
        );

      if (!id || !nombre) {
        return [];
      }

      return [
        {
          id,
          nombre,
        },
      ];
    },
  );
}

function formatearFecha(
  fecha: string | null,
): string {
  if (!fecha) {
    return "Sin definir";
  }

  const fechaConvertida =
    new Date(
      `${fecha}T12:00:00`,
    );

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
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        "Europe/Madrid",
    },
  ).format(
    fechaConvertida,
  );
}

function obtenerEtiquetaEstado(
  estado: EstadoCarnet,
): string {
  switch (estado) {
    case "activo":
      return "Activo";

    case "bloqueado":
      return "Bloqueado";

    case "caducado":
      return "Caducado";

    case "pendiente":
      return "Pendiente";
  }
}

function obtenerClasesEstado(
  estado: EstadoCarnet,
): string {
  switch (estado) {
    case "activo":
      return "border-success/30 bg-success/10 text-success";

    case "bloqueado":
      return "border-error/30 bg-error-container text-on-error-container";

    case "caducado":
      return "border-outline-variant bg-surface-container text-on-surface-variant";

    case "pendiente":
      return "border-primary/30 bg-primary-fixed text-on-primary-fixed";
  }
}

export default function ListadoSociosPanel({
  puedeCrear,
  puedeEditar,
}: Propiedades) {
  const [
    busquedaEscrita,
    setBusquedaEscrita,
  ] = useState("");

  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    filtroActivo,
    setFiltroActivo,
  ] = useState<
    | "todos"
    | "activos"
    | "inactivos"
  >("todos");

  const [
    filtroEstado,
    setFiltroEstado,
  ] = useState<
    EstadoCarnet | "todos"
  >("todos");

  const [
    temporadaId,
    setTemporadaId,
  ] = useState("");

  const [
    pagina,
    setPagina,
  ] = useState(1);

  const [
    resultado,
    setResultado,
  ] =
    useState<ResultadoListado>({
      socios: [],
      total: 0,
      pagina: 1,
      limite: 20,
      totalPaginas: 1,
    });

  const [
    temporadas,
    setTemporadas,
  ] = useState<
    TemporadaOpcion[]
  >([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    intento,
    setIntento,
  ] = useState(0);

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargarOpciones() {
      try {
        const respuesta =
          await fetch(
            "/api/panel/socios/opciones",
            {
              method: "GET",
              credentials:
                "same-origin",
              headers: {
                Accept:
                  "application/json",
              },
              signal:
                controlador.signal,
            },
          );

        const contenido =
          (await respuesta.json()) as
            RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ||
              "No se han podido obtener las temporadas.",
          );
        }

        setTemporadas(
          convertirTemporadas(
            contenido.data,
          ),
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Error cargando las opciones de socios:",
          error,
        );
      }
    }

    void cargarOpciones();

    return () => {
      controlador.abort();
    };
  }, []);

  useEffect(() => {
    const controlador =
      new AbortController();

    async function cargarSocios() {
      setCargando(true);
      setError(null);

      const parametros =
        new URLSearchParams({
          pagina:
            String(pagina),
          limite: "20",
          activo:
            filtroActivo,
          estado:
            filtroEstado,
        });

      if (busqueda) {
        parametros.set(
          "busqueda",
          busqueda,
        );
      }

      if (temporadaId) {
        parametros.set(
          "temporadaId",
          temporadaId,
        );
      }

      try {
        const respuesta =
          await fetch(
            `/api/panel/socios?${parametros.toString()}`,
            {
              method: "GET",
              credentials:
                "same-origin",
              headers: {
                Accept:
                  "application/json",
              },
              signal:
                controlador.signal,
            },
          );

        const contenido =
          (await respuesta.json()) as
            RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ||
              "No se ha podido obtener el listado de socios.",
          );
        }

        setResultado(
          convertirResultado(
            contenido.data,
          ),
        );
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Error cargando el listado de socios:",
          error,
        );

        setError(
          error instanceof Error
            ? error.message
            : "No se ha podido obtener el listado de socios.",
        );
      } finally {
        if (
          !controlador.signal
            .aborted
        ) {
          setCargando(false);
        }
      }
    }

    void cargarSocios();

    return () => {
      controlador.abort();
    };
  }, [
    busqueda,
    filtroActivo,
    filtroEstado,
    temporadaId,
    pagina,
    intento,
  ]);

  function aplicarBusqueda(
    evento:
      FormEvent<HTMLFormElement>,
  ): void {
    evento.preventDefault();

    setPagina(1);
    setBusqueda(
      busquedaEscrita.trim(),
    );
  }

  function limpiarFiltros(): void {
    setBusquedaEscrita("");
    setBusqueda("");
    setFiltroActivo("todos");
    setFiltroEstado("todos");
    setTemporadaId("");
    setPagina(1);
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-on-surface">
            Socios
          </h2>

          <p className="mt-1 text-sm text-on-surface-variant">
            Gestiona los datos, carnets y
            accesos de los socios del club.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/panel/socios/escaner"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
          >
            Escanear carnet
          </a>

          {puedeCrear && (
            <a
              href="/panel/socios/nuevo"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim"
            >
              Nuevo socio
            </a>
          )}
        </div>
      </div>

      <form
        onSubmit={aplicarBusqueda}
        className="grid gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">
              Buscar socios
            </span>

            <input
              type="search"
              value={
                busquedaEscrita
              }
              onChange={(evento) =>
                setBusquedaEscrita(
                  evento.target.value,
                )
              }
              maxLength={150}
              placeholder="Buscar por nombre, correo o número de carnet"
              className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <button
            type="submit"
            className="h-11 rounded-xl bg-secondary px-5 text-sm font-bold text-on-secondary transition-opacity hover:opacity-90"
          >
            Buscar
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant">
              Estado del socio
            </span>

            <select
              value={
                filtroActivo
              }
              onChange={(evento) => {
                setFiltroActivo(
                  evento.target
                    .value as
                    | "todos"
                    | "activos"
                    | "inactivos",
                );

                setPagina(1);
              }}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="todos">
                Todos
              </option>

              <option value="activos">
                Socios activos
              </option>

              <option value="inactivos">
                Socios desactivados
              </option>
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant">
              Estado del carnet
            </span>

            <select
              value={
                filtroEstado
              }
              onChange={(evento) => {
                setFiltroEstado(
                  evento.target
                    .value as
                    | EstadoCarnet
                    | "todos",
                );

                setPagina(1);
              }}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="todos">
                Todos
              </option>

              <option value="activo">
                Activo
              </option>

              <option value="pendiente">
                Pendiente
              </option>

              <option value="bloqueado">
                Bloqueado
              </option>

              <option value="caducado">
                Caducado
              </option>
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs font-bold text-on-surface-variant">
              Temporada
            </span>

            <select
              value={
                temporadaId
              }
              onChange={(evento) => {
                setTemporadaId(
                  evento.target.value,
                );

                setPagina(1);
              }}
              className="h-11 rounded-xl border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:border-primary"
            >
              <option value="">
                Todas las temporadas
              </option>

              {temporadas.map(
                (temporada) => (
                  <option
                    key={
                      temporada.id
                    }
                    value={
                      temporada.id
                    }
                  >
                    {
                      temporada.nombre
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={
                limpiarFiltros
              }
              className="h-11 w-full rounded-xl border border-outline-variant px-4 text-sm font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div
          className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container"
          role="alert"
        >
          <h3 className="font-bold">
            No se han podido cargar los
            socios
          </h3>

          <p className="mt-1 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setIntento(
                (valor) =>
                  valor + 1,
              )
            }
            className="mt-4 rounded-xl border border-error px-4 py-2 text-sm font-bold"
          >
            Volver a intentarlo
          </button>
        </div>
      )}

      {!error && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/60 px-5 py-4">
            <p className="text-sm font-bold text-on-surface">
              {cargando
                ? "Cargando socios..."
                : `${resultado.total} ${
                    resultado.total === 1
                      ? "socio"
                      : "socios"
                  }`}
            </p>

            {!cargando && (
              <p className="text-xs text-on-surface-variant">
                Página{" "}
                {resultado.pagina} de{" "}
                {
                  resultado.totalPaginas
                }
              </p>
            )}
          </div>

          {cargando ? (
            <div
              className="flex min-h-64 items-center justify-center"
              role="status"
            >
              <span
                className="h-9 w-9 animate-spin rounded-full border-4 border-outline-variant border-t-primary"
                aria-hidden="true"
              />
            </div>
          ) : resultado.socios
              .length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
              <h3 className="font-bold text-on-surface">
                No se han encontrado
                socios
              </h3>

              <p className="mt-1 max-w-sm text-sm text-on-surface-variant">
                Prueba con otros filtros o
                crea el primer socio del
                club.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/60">
              {resultado.socios.map(
                (socio) => (
                  <article
                    key={socio.id}
                    className="grid gap-4 px-5 py-5 transition-colors hover:bg-surface-container-low sm:grid-cols-[minmax(0,1.4fr)_minmax(180px,0.8fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-bold text-on-surface">
                          {
                            socio.nombreCompleto
                          }
                        </h3>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                            socio.activo
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-error/30 bg-error-container text-on-error-container"
                          }`}
                        >
                          {socio.activo
                            ? "Socio activo"
                            : "Desactivado"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-on-surface-variant">
                        {socio.email ||
                          "Sin correo"}
                      </p>

                      <p className="mt-1 text-xs text-on-surface-variant">
                        Número de socio:{" "}
                        <strong className="text-on-surface">
                          {
                            socio.numeroSocio
                          }
                        </strong>
                      </p>
                    </div>

                    <div>
                      {socio.carnetActual ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${obtenerClasesEstado(
                                socio
                                  .carnetActual
                                  .estado,
                              )}`}
                            >
                              {obtenerEtiquetaEstado(
                                socio
                                  .carnetActual
                                  .estado,
                              )}
                            </span>

                            <span className="text-xs font-semibold text-on-surface-variant">
                              {
                                socio
                                  .carnetActual
                                  .temporadaNombre
                              }
                            </span>
                          </div>

                          <p className="mt-2 font-mono text-sm font-bold text-primary">
                            {
                              socio
                                .carnetActual
                                .numeroCarnet
                            }
                          </p>

                          <p className="mt-1 text-xs text-on-surface-variant">
                            Hasta{" "}
                            {formatearFecha(
                              socio
                                .carnetActual
                                .fechaCaducidad,
                            )}
                          </p>
                        </>
                      ) : (
                        <span className="rounded-full border border-outline-variant bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant">
                          Sin carnet
                        </span>
                      )}
                    </div>

                    <a
                      href={`/panel/socios/${encodeURIComponent(
                        socio.id,
                      )}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
                    >
                      {puedeEditar
                        ? "Gestionar"
                        : "Consultar"}
                    </a>
                  </article>
                ),
              )}
            </div>
          )}

          {!cargando &&
            resultado.totalPaginas >
              1 && (
              <nav
                className="flex items-center justify-between border-t border-outline-variant/60 px-5 py-4"
                aria-label="Paginación de socios"
              >
                <button
                  type="button"
                  onClick={() =>
                    setPagina(
                      (valor) =>
                        Math.max(
                          1,
                          valor - 1,
                        ),
                    )
                  }
                  disabled={
                    resultado.pagina <=
                    1
                  }
                  className="min-h-10 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>

                <span className="text-sm font-semibold text-on-surface-variant">
                  {resultado.pagina} /{" "}
                  {
                    resultado.totalPaginas
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPagina(
                      (valor) =>
                        Math.min(
                          resultado.totalPaginas,
                          valor + 1,
                        ),
                    )
                  }
                  disabled={
                    resultado.pagina >=
                    resultado.totalPaginas
                  }
                  className="min-h-10 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </nav>
            )}
        </div>
      )}
    </section>
  );
}