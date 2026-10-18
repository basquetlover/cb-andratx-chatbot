import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  PersonalDesignacion,
  ResultadoListadoPersonalDesignaciones,
} from "@servicios/backend/designaciones/obtenerListadoPersonalDesignaciones";

import {
  compararPersonalPorCodigo,
} from "@servicios/backend/designaciones/ordenarPersonalPorCodigo";

const API = "/api/panel/designaciones/personal";

const NIVELES = [
  "Escuela",
  "Iniciación",
  "Auxiliar",
  "Entrenador",
  "Técnico",
  "Responsable",
] as const;

const GRUPOS_INICIALES = [
  "Iniciación",
  "Premini",
  "Mini",
  "Infantil",
  "Cadete",
  "Júnior",
  "Sénior",
  "+40",
];

const CAMPO =
  "min-h-11 w-full rounded-xl border border-outline-variant " +
  "bg-surface-container-lowest px-3 py-2 text-sm text-on-surface " +
  "outline-none focus:border-primary disabled:opacity-50";

type Habilitacion = "pista" | "mesa" | "ambos";
type EstadoFiltro = "todos" | "activos" | "inactivos";

interface Props {
  resultadoInicial: ResultadoListadoPersonalDesignaciones;
  puedeCrear: boolean;
  puedeEditar: boolean;
}

interface Ficha {
  id: string | null;
  nombreCompleto: string;
  habilitacion: Habilitacion;
  nivelPista: string;
  nivelMesa: string;
  grupos: string[];
  activo: boolean;
  anotaciones: string;
}

interface RespuestaApi {
  ok: boolean;
  data?: {
    personal: PersonalDesignacion;
    creado: boolean;
    mensaje: string;
  } | null;
  error?: string | null;
}

// ======================================================
// UTILIDADES
// ======================================================

function vacia(): Ficha {
  return {
    id: null,
    nombreCompleto: "",
    habilitacion: "pista",
    nivelPista: "",
    nivelMesa: "",
    grupos: [],
    activo: true,
    anotaciones: "",
  };
}

function desdePersona(
  persona: PersonalDesignacion,
): Ficha {
  return {
    id: persona.id,
    nombreCompleto: persona.nombreCompleto,
    habilitacion:
      persona.habilitacion === "mesa" ||
      persona.habilitacion === "ambos"
        ? persona.habilitacion
        : "pista",
    nivelPista: persona.nivelPista ?? "",
    nivelMesa: persona.nivelMesa ?? "",
    grupos: [...persona.grupos],
    activo: persona.activo,
    anotaciones: persona.anotaciones,
  };
}

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function etiquetaHabilitacion(
  valor: string,
): string {
  if (valor === "pista") return "Árbitro de pista";
  if (valor === "mesa") return "Oficial de mesa";
  if (valor === "ambos") return "Pista y mesa";
  return "Sin definir";
}

function Campo({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {titulo}
      </span>
      {children}
    </label>
  );
}

function Nivel({
  titulo,
  valor,
  disabled,
  onChange,
}: {
  titulo: string;
  valor: string;
  disabled: boolean;
  onChange: (valor: string) => void;
}) {
  const anterior =
    valor !== "" &&
    !NIVELES.some((nivel) => nivel === valor);

  return (
    <Campo titulo={titulo}>
      <select
        value={valor}
        disabled={disabled}
        onChange={(evento) =>
          onChange(evento.target.value)
        }
        className={CAMPO}
      >
        <option value="">Sin nivel asignado</option>

        {anterior && (
          <option value={valor}>
            {valor} (nivel anterior)
          </option>
        )}

        {NIVELES.map((nivel, indice) => (
          <option key={nivel} value={nivel}>
            {indice + 1}. {nivel}
          </option>
        ))}
      </select>
    </Campo>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function GestionPersonalDesignaciones({
  resultadoInicial,
  puedeCrear,
  puedeEditar,
}: Props) {
  const [personal, setPersonal] = useState<
    PersonalDesignacion[]
  >(resultadoInicial.personal);

  const [formulario, setFormulario] =
    useState<Ficha | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] =
    useState<EstadoFiltro>("todos");

  const [habilitacionFiltro, setHabilitacionFiltro] =
    useState("todos");

  const [nivelFiltro, setNivelFiltro] =
    useState("todos");

  const [grupoFiltro, setGrupoFiltro] =
    useState("todos");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] =
    useState<string | null>(null);

  // ====================================================
  // GRUPOS DISPONIBLES
  // ====================================================

  const grupos = useMemo(
    () =>
      Array.from(
        new Set([
          ...GRUPOS_INICIALES,
          ...resultadoInicial.gruposDisponibles,
          ...personal.flatMap(
            (persona) => persona.grupos,
          ),
          ...(formulario?.grupos ?? []),
        ]),
      ).sort((a, b) => a.localeCompare(b, "es")),
    [
      personal,
      formulario?.grupos,
      resultadoInicial.gruposDisponibles,
    ],
  );

  // ====================================================
  // RESUMEN
  // ====================================================

  const resumen = useMemo(
    () => ({
      total: personal.length,
      activos: personal.filter(
        (persona) => persona.activo,
      ).length,
      inactivos: personal.filter(
        (persona) => !persona.activo,
      ).length,
      pista: personal.filter(
        (persona) => persona.habilitacion === "pista",
      ).length,
      mesa: personal.filter(
        (persona) => persona.habilitacion === "mesa",
      ).length,
      ambos: personal.filter(
        (persona) => persona.habilitacion === "ambos",
      ).length,
    }),
    [personal],
  );

  // ====================================================
  // FILTROS Y ORDEN CBA
  // ====================================================

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda.trim());

    return personal
      .filter((persona) => {
        if (
          estadoFiltro === "activos" &&
          !persona.activo
        ) {
          return false;
        }

        if (
          estadoFiltro === "inactivos" &&
          persona.activo
        ) {
          return false;
        }

        if (
          habilitacionFiltro !== "todos" &&
          persona.habilitacion !== habilitacionFiltro
        ) {
          return false;
        }

        if (
          nivelFiltro !== "todos" &&
          persona.nivelPista !== nivelFiltro &&
          persona.nivelMesa !== nivelFiltro
        ) {
          return false;
        }

        if (
          grupoFiltro !== "todos" &&
          !persona.grupos.includes(grupoFiltro)
        ) {
          return false;
        }

        if (!consulta) {
          return true;
        }

        const contenido = normalizar(
          [
            persona.codigo,
            persona.nombreCompleto,
            persona.habilitacion,
            persona.nivelPista ?? "",
            persona.nivelMesa ?? "",
            ...persona.grupos,
          ].join(" "),
        );

        return contenido.includes(consulta);
      })
      .sort(compararPersonalPorCodigo);
  }, [
    personal,
    busqueda,
    estadoFiltro,
    habilitacionFiltro,
    nivelFiltro,
    grupoFiltro,
  ]);

  // ====================================================
  // EDITAR
  // ====================================================

  function cambiar<K extends keyof Ficha>(
    campo: K,
    valor: Ficha[K],
  ) {
    setFormulario((anterior) =>
      anterior
        ? { ...anterior, [campo]: valor }
        : anterior,
    );

    setError(null);
  }

  function alternarGrupo(grupo: string) {
    setFormulario((anterior) =>
      anterior
        ? {
            ...anterior,
            grupos: anterior.grupos.includes(grupo)
              ? anterior.grupos.filter(
                  (elemento) => elemento !== grupo,
                )
              : [...anterior.grupos, grupo],
          }
        : anterior,
    );
  }

  function abrirNueva() {
    if (!puedeCrear) return;

    setFormulario(vacia());
    setMensaje(null);
    setError(null);
  }

  function abrirEditar(
    persona: PersonalDesignacion,
  ) {
    if (!puedeEditar) return;

    setFormulario(desdePersona(persona));
    setMensaje(null);
    setError(null);
  }

  // ====================================================
  // GUARDAR
  // ====================================================

  async function guardar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!formulario || guardando) return;

    if (
      formulario.id
        ? !puedeEditar
        : !puedeCrear
    ) {
      setError(
        "No tienes permisos para esta operación.",
      );
      return;
    }

    if (formulario.nombreCompleto.trim().length < 3) {
      setError("Introduce el nombre completo.");
      return;
    }

    for (const nivel of [
      formulario.nivelPista,
      formulario.nivelMesa,
    ]) {
      if (
        nivel &&
        !NIVELES.some(
          (permitido) => permitido === nivel,
        )
      ) {
        setError(
          "Selecciona uno de los seis niveles permitidos.",
        );
        return;
      }
    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(API, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formulario.id,
          nombreCompleto:
            formulario.nombreCompleto.trim(),
          habilitacion: formulario.habilitacion,
          nivelPista:
            formulario.nivelPista || null,
          nivelMesa:
            formulario.nivelMesa || null,
          grupos: formulario.grupos,
          activo: formulario.activo,
          anotaciones: formulario.anotaciones,
        }),
      });

      const resultado =
        (await respuesta.json()) as RespuestaApi;

      if (
        !respuesta.ok ||
        !resultado.ok ||
        !resultado.data?.personal
      ) {
        throw new Error(
          resultado.error ||
            "No se han podido guardar los datos.",
        );
      }

      const guardada = resultado.data.personal;

      setPersonal((anterior) =>
        anterior.some(
          (persona) => persona.id === guardada.id,
        )
          ? anterior.map((persona) =>
              persona.id === guardada.id
                ? guardada
                : persona,
            )
          : [...anterior, guardada],
      );

      setFormulario(null);

      setMensaje(
        resultado.data.mensaje ||
          "Personal guardado correctamente.",
      );
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "Error al guardar el personal.",
      );
    } finally {
      setGuardando(false);
    }
  }

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <div className="space-y-6">
      {/* CABECERA */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface">
              Árbitros y oficiales de mesa
            </h2>

            <p className="mt-1 text-sm text-on-surface-variant">
              Activos primero. Orden numérico por código
              CBA dentro de cada estado.
            </p>
          </div>

          {puedeCrear && !formulario && (
            <button
              type="button"
              onClick={abrirNueva}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary"
            >
              + Añadir persona
            </button>
          )}
        </div>

        <nav
          aria-label="Apartados de designaciones"
          className="mt-5 flex flex-wrap gap-2 border-t border-outline-variant/60 pt-4"
        >
          <a
            href="/panel/designaciones"
            className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface"
          >
            Partidos
          </a>

          <a
            href="/panel/designaciones/personal"
            aria-current="page"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary"
          >
            Personal
          </a>

          <a
            href="/panel/designaciones/estadisticas"
            className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface"
          >
            Estadísticas
          </a>
        </nav>
      </section>

      {/* MENSAJES */}

      {mensaje && (
        <div
          role="status"
          className="rounded-xl bg-primary-fixed p-4 text-sm text-on-primary-fixed"
        >
          {mensaje}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/40 bg-error-container p-4 text-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {/* RESUMEN */}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          ["Total", resumen.total],
          ["Activos", resumen.activos],
          ["Inactivos", resumen.inactivos],
          ["Solo pista", resumen.pista],
          ["Solo mesa", resumen.mesa],
          ["Ambos", resumen.ambos],
        ].map(([titulo, cantidad]) => (
          <div
            key={titulo}
            className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4"
          >
            <p className="text-xs text-on-surface-variant">
              {titulo}
            </p>

            <p className="mt-2 text-2xl font-extrabold tabular-nums text-on-surface">
              {cantidad}
            </p>
          </div>
        ))}
      </section>

      {/* FORMULARIO */}

      {formulario && (
        <section className="rounded-2xl border border-primary/40 bg-surface-container-lowest p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-extrabold">
              {formulario.id
                ? "Editar persona"
                : "Registrar persona"}
            </h3>

            <button
              type="button"
              disabled={guardando}
              onClick={() => {
                setFormulario(null);
                setError(null);
              }}
              className="rounded-lg px-3 py-2 text-sm font-bold"
            >
              Cerrar
            </button>
          </div>

          <form onSubmit={guardar} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Campo titulo="Nombre completo">
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  autoComplete="name"
                  disabled={guardando}
                  className={CAMPO}
                  value={formulario.nombreCompleto}
                  onChange={(evento) =>
                    cambiar(
                      "nombreCompleto",
                      evento.target.value,
                    )
                  }
                />
              </Campo>

              <Campo titulo="Habilitación">
                <select
                  disabled={guardando}
                  value={formulario.habilitacion}
                  onChange={(evento) =>
                    cambiar(
                      "habilitacion",
                      evento.target.value as Habilitacion,
                    )
                  }
                  className={CAMPO}
                >
                  <option value="pista">
                    Árbitro de pista
                  </option>
                  <option value="mesa">
                    Oficial de mesa
                  </option>
                  <option value="ambos">
                    Pista y mesa
                  </option>
                </select>
              </Campo>

              <Nivel
                titulo="Nivel de pista"
                valor={formulario.nivelPista}
                disabled={guardando}
                onChange={(valor) =>
                  cambiar("nivelPista", valor)
                }
              />

              <Nivel
                titulo="Nivel de mesa"
                valor={formulario.nivelMesa}
                disabled={guardando}
                onChange={(valor) =>
                  cambiar("nivelMesa", valor)
                }
              />
            </div>

            <fieldset
              className="rounded-xl border border-outline-variant/60 p-4"
              disabled={guardando}
            >
              <legend className="px-2 text-sm font-bold">
                Grupos habilitados
              </legend>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grupos.map((grupo) => (
                  <label
                    key={grupo}
                    className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={formulario.grupos.includes(
                        grupo,
                      )}
                      onChange={() =>
                        alternarGrupo(grupo)
                      }
                    />
                    {grupo}
                  </label>
                ))}
              </div>
            </fieldset>

            <Campo titulo="Anotaciones">
              <textarea
                rows={3}
                maxLength={5000}
                disabled={guardando}
                className={CAMPO}
                value={formulario.anotaciones}
                onChange={(evento) =>
                  cambiar(
                    "anotaciones",
                    evento.target.value,
                  )
                }
              />
            </Campo>

            <label className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4 text-sm font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-primary"
                checked={formulario.activo}
                disabled={guardando}
                onChange={(evento) =>
                  cambiar(
                    "activo",
                    evento.target.checked,
                  )
                }
              />
              Persona activa
            </label>

            <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant/60 pt-5">
              <button
                type="button"
                disabled={guardando}
                onClick={() => setFormulario(null)}
                className="min-h-11 rounded-xl border border-outline-variant px-5 text-sm font-bold"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="min-h-11 rounded-xl bg-primary px-6 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar persona"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* FILTROS */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Campo titulo="Buscar">
            <input
              type="search"
              className={CAMPO}
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Nombre o CBA-001"
            />
          </Campo>

          <Campo titulo="Estado">
            <select
              className={CAMPO}
              value={estadoFiltro}
              onChange={(evento) =>
                setEstadoFiltro(
                  evento.target.value as EstadoFiltro,
                )
              }
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </Campo>

          <Campo titulo="Habilitación">
            <select
              className={CAMPO}
              value={habilitacionFiltro}
              onChange={(evento) =>
                setHabilitacionFiltro(evento.target.value)
              }
            >
              <option value="todos">Todas</option>
              <option value="pista">Pista</option>
              <option value="mesa">Mesa</option>
              <option value="ambos">Ambos</option>
              <option value="sin_definir">
                Sin definir
              </option>
            </select>
          </Campo>

          <Campo titulo="Nivel">
            <select
              className={CAMPO}
              value={nivelFiltro}
              onChange={(evento) =>
                setNivelFiltro(evento.target.value)
              }
            >
              <option value="todos">Todos</option>
              {NIVELES.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </Campo>

          <Campo titulo="Grupo">
            <select
              className={CAMPO}
              value={grupoFiltro}
              onChange={(evento) =>
                setGrupoFiltro(evento.target.value)
              }
            >
              <option value="todos">Todos</option>
              {grupos.map((grupo) => (
                <option key={grupo} value={grupo}>
                  {grupo}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            {filtrados.length} personas encontradas
          </p>

          <button
            type="button"
            className="text-sm font-bold text-primary"
            onClick={() => {
              setBusqueda("");
              setEstadoFiltro("todos");
              setHabilitacionFiltro("todos");
              setNivelFiltro("todos");
              setGrupoFiltro("todos");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* LISTADO */}

      {filtrados.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {filtrados.map((persona) => (
            <article
              key={persona.id}
              className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">
                    {persona.codigo || "Sin código"}
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-on-surface">
                    {persona.nombreCompleto}
                  </h3>
                </div>

                <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold">
                  {persona.activo
                    ? "Activo"
                    : "Inactivo"}
                </span>
              </div>

              <p className="mt-2 text-sm text-on-surface-variant">
                {etiquetaHabilitacion(
                  persona.habilitacion,
                )}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-xs text-on-surface-variant">
                    Nivel de pista
                  </p>
                  <p className="mt-1 font-bold">
                    {persona.nivelPista || "Sin asignar"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-xs text-on-surface-variant">
                    Nivel de mesa
                  </p>
                  <p className="mt-1 font-bold">
                    {persona.nivelMesa || "Sin asignar"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {persona.grupos.length > 0 ? (
                  persona.grupos.map((grupo) => (
                    <span
                      key={grupo}
                      className="rounded-lg border border-outline-variant px-2 py-1 text-xs"
                    >
                      {grupo}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-on-surface-variant">
                    Sin grupos
                  </span>
                )}
              </div>

              {persona.anotaciones && (
                <p className="mt-4 whitespace-pre-wrap border-t border-outline-variant/60 pt-3 text-sm text-on-surface-variant">
                  {persona.anotaciones}
                </p>
              )}

              {puedeEditar && (
                <div className="mt-4 flex justify-end border-t border-outline-variant/60 pt-4">
                  <button
                    type="button"
                    className="min-h-10 rounded-xl border border-outline-variant px-4 text-sm font-bold"
                    onClick={() =>
                      abrirEditar(persona)
                    }
                  >
                    Editar persona
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          No se han encontrado personas.
        </section>
      )}
    </div>
  );
}