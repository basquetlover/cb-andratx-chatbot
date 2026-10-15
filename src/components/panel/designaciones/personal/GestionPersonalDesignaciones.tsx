
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

// ======================================================
// CONFIGURACIÓN
// ======================================================

const API_PERSONAL =
  "/api/panel/designaciones/personal";

const NIVELES = [
  "Escuela",
  "Iniciación",
  "Auxiliar",
  "Entrenador",
  "Técnico",
  "Responsable",
] as const;

const GRUPOS_SUGERIDOS = [
  "Iniciación",
  "Premini",
  "Mini",
  "Infantil",
  "Cadete",
  "Júnior",
  "Sénior",
  "+40",
];

const CLASE_CAMPO =
  "min-h-11 w-full rounded-xl border border-outline-variant " +
  "bg-surface-container-lowest px-3 py-2 text-sm text-on-surface " +
  "outline-none focus:border-primary focus:ring-2 " +
  "focus:ring-primary/15 disabled:opacity-50";

// ======================================================
// TIPOS
// ======================================================

type Nivel = (typeof NIVELES)[number];

type Habilitacion =
  | "pista"
  | "mesa"
  | "ambos";

type FiltroEstado =
  | "todos"
  | "activos"
  | "inactivos";

interface Props {
  resultadoInicial: ResultadoListadoPersonalDesignaciones;
  puedeCrear: boolean;
  puedeEditar: boolean;
}

interface FormularioPersonal {
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

function formularioVacio(): FormularioPersonal {
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

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function nivelValido(
  valor: string,
): valor is Nivel {
  return NIVELES.some(
    (nivel) => nivel === valor,
  );
}

function ordenarPersonal(
  personal: PersonalDesignacion[],
): PersonalDesignacion[] {
  return [...personal].sort((a, b) => {
    if (a.activo !== b.activo) {
      return a.activo ? -1 : 1;
    }

    const comparacion =
      a.nombreCompleto.localeCompare(
        b.nombreCompleto,
        "es",
        {
          sensitivity: "base",
        },
      );

    return comparacion !== 0
      ? comparacion
      : a.id.localeCompare(b.id);
  });
}

function nombreHabilitacion(
  habilitacion: string,
): string {
  switch (habilitacion) {
    case "pista":
      return "Árbitro de pista";

    case "mesa":
      return "Oficial de mesa";

    case "ambos":
      return "Pista y mesa";

    default:
      return "Sin definir";
  }
}

function convertirFormulario(
  persona: PersonalDesignacion,
): FormularioPersonal {
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

// ======================================================
// COMPONENTES AUXILIARES
// ======================================================

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

function SelectorNivel({
  titulo,
  valor,
  deshabilitado,
  onChange,
}: {
  titulo: string;
  valor: string;
  deshabilitado: boolean;
  onChange: (valor: string) => void;
}) {
  // Si una ficha antigua tiene un nivel diferente,
  // lo mostramos para que pueda corregirse
  // sin perderlo silenciosamente.

  const nivelAntiguo =
    valor !== "" && !nivelValido(valor);

  return (
    <Campo titulo={titulo}>
      <select
        value={valor}
        disabled={deshabilitado}
        onChange={(evento) =>
          onChange(evento.target.value)
        }
        className={CLASE_CAMPO}
      >
        <option value="">
          Sin nivel asignado
        </option>

        {nivelAntiguo && (
          <option value={valor}>
            {valor} (nivel anterior)
          </option>
        )}

        {NIVELES.map((nivel, indice) => (
          <option
            key={nivel}
            value={nivel}
          >
            {indice + 1}. {nivel}
          </option>
        ))}
      </select>
    </Campo>
  );
}

function BadgeEstado({
  activo,
}: {
  activo: boolean;
}) {
  return (
    <span
      className={[
        "rounded-full px-3 py-1 text-xs font-bold",
        activo
          ? "bg-primary-fixed text-on-primary-fixed"
          : "bg-surface-container-high text-on-surface-variant",
      ].join(" ")}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
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
  const [personal, setPersonal] = useState(
    () => ordenarPersonal(resultadoInicial.personal),
  );

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("todos");

  const [
    filtroHabilitacion,
    setFiltroHabilitacion,
  ] = useState("todos");

  const [filtroNivel, setFiltroNivel] =
    useState("todos");

  const [filtroGrupo, setFiltroGrupo] =
    useState("todos");

  const [formulario, setFormulario] =
    useState<FormularioPersonal | null>(null);

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  // ====================================================
  // GRUPOS
  // ====================================================

  const gruposDisponibles = useMemo(
    () =>
      Array.from(
        new Set([
          ...GRUPOS_SUGERIDOS,
          ...personal.flatMap(
            (persona) => persona.grupos,
          ),
        ]),
      ).sort((a, b) =>
        a.localeCompare(b, "es", {
          sensitivity: "base",
        }),
      ),
    [personal],
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
        (persona) =>
          persona.habilitacion === "pista",
      ).length,

      mesa: personal.filter(
        (persona) =>
          persona.habilitacion === "mesa",
      ).length,

      ambos: personal.filter(
        (persona) =>
          persona.habilitacion === "ambos",
      ).length,
    }),
    [personal],
  );

  // ====================================================
  // FILTROS
  // ====================================================

  const personalFiltrado = useMemo(() => {
    const consulta = normalizar(
      busqueda.trim(),
    );

    return personal.filter((persona) => {
      if (
        filtroEstado === "activos" &&
        !persona.activo
      ) {
        return false;
      }

      if (
        filtroEstado === "inactivos" &&
        persona.activo
      ) {
        return false;
      }

      if (
        filtroHabilitacion !== "todos" &&
        persona.habilitacion !== filtroHabilitacion
      ) {
        return false;
      }

      if (
        filtroNivel !== "todos" &&
        persona.nivelPista !== filtroNivel &&
        persona.nivelMesa !== filtroNivel
      ) {
        return false;
      }

      if (
        filtroGrupo !== "todos" &&
        !persona.grupos.includes(filtroGrupo)
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
          nombreHabilitacion(persona.habilitacion),
          persona.nivelPista ?? "",
          persona.nivelMesa ?? "",
          ...persona.grupos,
        ].join(" "),
      );

      return contenido.includes(consulta);
    });
  }, [
    personal,
    busqueda,
    filtroEstado,
    filtroHabilitacion,
    filtroNivel,
    filtroGrupo,
  ]);

  // ====================================================
  // FORMULARIO
  // ====================================================

  function iniciarAlta() {
    if (!puedeCrear) {
      return;
    }

    setFormulario(formularioVacio());
    setError(null);
    setMensaje(null);
  }

  function iniciarEdicion(
    persona: PersonalDesignacion,
  ) {
    if (!puedeEditar) {
      return;
    }

    setFormulario(
      convertirFormulario(persona),
    );

    setError(null);
    setMensaje(null);
  }

  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setFormulario(null);
    setError(null);
  }

  function cambiarCampo<
    K extends keyof FormularioPersonal
  >(
    campo: K,
    valor: FormularioPersonal[K],
  ) {
    setFormulario((anterior) =>
      anterior
        ? {
            ...anterior,
            [campo]: valor,
          }
        : anterior,
    );
  }

  function alternarGrupo(
    grupo: string,
  ) {
    setFormulario((anterior) => {
      if (!anterior) {
        return anterior;
      }

      const seleccionado =
        anterior.grupos.includes(grupo);

      return {
        ...anterior,

        grupos: seleccionado
          ? anterior.grupos.filter(
              (actual) => actual !== grupo,
            )
          : [
              ...anterior.grupos,
              grupo,
            ],
      };
    });
  }

  // ====================================================
  // GUARDAR PERSONAL
  // ====================================================

  async function guardar(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (!formulario || guardando) {
      return;
    }

    if (
      formulario.id
        ? !puedeEditar
        : !puedeCrear
    ) {
      setError(
        "No tienes permiso para realizar esta operación.",
      );
      return;
    }

    if (
      formulario.nombreCompleto.trim().length < 3
    ) {
      setError(
        "Introduce un nombre completo válido.",
      );
      return;
    }

    // Ningún usuario puede guardar niveles
    // fuera de los seis definidos.

    for (const nivel of [
      formulario.nivelPista,
      formulario.nivelMesa,
    ]) {
      if (nivel && !nivelValido(nivel)) {
        setError(
          "Selecciona uno de los seis niveles establecidos para pista y mesa.",
        );
        return;
      }
    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(
        API_PERSONAL,
        {
          method: "POST",
          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: formulario.id,

            nombreCompleto:
              formulario.nombreCompleto.trim(),

            habilitacion:
              formulario.habilitacion,

            nivelPista:
              formulario.nivelPista || null,

            nivelMesa:
              formulario.nivelMesa || null,

            grupos:
              formulario.grupos,

            activo:
              formulario.activo,

            anotaciones:
              formulario.anotaciones,
          }),
        },
      );

      let resultado: RespuestaApi;

      try {
        resultado =
          await respuesta.json() as RespuestaApi;
      } catch {
        throw new Error(
          "El servidor no ha devuelto una respuesta válida.",
        );
      }

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

      const personaGuardada =
        resultado.data.personal;

      setPersonal((anterior) => {
        const existe = anterior.some(
          (persona) =>
            persona.id === personaGuardada.id,
        );

        return ordenarPersonal(
          existe
            ? anterior.map((persona) =>
                persona.id === personaGuardada.id
                  ? personaGuardada
                  : persona,
              )
            : [
                ...anterior,
                personaGuardada,
              ],
        );
      });

      setFormulario(null);

      setMensaje(
        resultado.data.mensaje ||
        "Los datos se han guardado correctamente.",
      );
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "Ha ocurrido un error inesperado.",
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

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-on-surface sm:text-2xl">
              Árbitros y oficiales de mesa
            </h2>

            <p className="mt-2 text-sm text-on-surface-variant">
              Gestiona el personal de arbitraje del C.B. Andratx.
            </p>
          </div>

          {puedeCrear && !formulario && (
            <button
              type="button"
              onClick={iniciarAlta}
              className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary hover:opacity-90"
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
            className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-primary"
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
            className="rounded-xl bg-surface-container-low px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-primary"
          >
            Estadísticas
          </a>
        </nav>
      </section>

      {/* MENSAJES */}

      {mensaje && (
        <div
          role="status"
          className="rounded-xl border border-primary/30 bg-primary-fixed p-4 text-sm font-medium text-on-primary-fixed"
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
          { titulo: "Total", valor: resumen.total },
          { titulo: "Activos", valor: resumen.activos },
          { titulo: "Inactivos", valor: resumen.inactivos },
          { titulo: "Solo pista", valor: resumen.pista },
          { titulo: "Solo mesa", valor: resumen.mesa },
          { titulo: "Ambos", valor: resumen.ambos },
        ].map((dato) => (
          <div
            key={dato.titulo}
            className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              {dato.titulo}
            </p>

            <p className="mt-2 text-3xl font-extrabold tabular-nums text-on-surface">
              {dato.valor}
            </p>
          </div>
        ))}
      </section>

      {/* FORMULARIO DE ALTA Y EDICIÓN */}

      {formulario && (
        <section className="rounded-2xl border border-primary/40 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-on-surface">
              {formulario.id
                ? "Editar persona"
                : "Registrar nueva persona"}
            </h3>

            <button
              type="button"
              disabled={guardando}
              onClick={cerrarFormulario}
              className="rounded-lg px-3 py-2 text-sm font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            >
              Cerrar
            </button>
          </div>

          <form
            onSubmit={guardar}
            className="space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">

              {/* NOMBRE */}

              <Campo titulo="Nombre completo">
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={200}
                  autoComplete="name"
                  disabled={guardando}
                  value={formulario.nombreCompleto}
                  onChange={(evento) =>
                    cambiarCampo(
                      "nombreCompleto",
                      evento.target.value,
                    )
                  }
                  className={CLASE_CAMPO}
                />
              </Campo>

              {/* HABILITACIÓN */}

              <Campo titulo="Habilitación">
                <select
                  value={formulario.habilitacion}
                  disabled={guardando}
                  onChange={(evento) =>
                    cambiarCampo(
                      "habilitacion",
                      evento.target.value as Habilitacion,
                    )
                  }
                  className={CLASE_CAMPO}
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

              {/* NIVELES INDEPENDIENTES */}

              <SelectorNivel
                titulo="Nivel de árbitro de pista"
                valor={formulario.nivelPista}
                deshabilitado={guardando}
                onChange={(valor) =>
                  cambiarCampo(
                    "nivelPista",
                    valor,
                  )
                }
              />

              <SelectorNivel
                titulo="Nivel de oficial de mesa"
                valor={formulario.nivelMesa}
                deshabilitado={guardando}
                onChange={(valor) =>
                  cambiarCampo(
                    "nivelMesa",
                    valor,
                  )
                }
              />
            </div>

            <p className="text-xs text-on-surface-variant">
              Cada especialidad tiene seis niveles:
              Escuela, Iniciación, Auxiliar, Entrenador,
              Técnico y Responsable. Puedes dejar uno
              sin asignar.
            </p>

            {/* GRUPOS */}

            <fieldset
              disabled={guardando}
              className="rounded-xl border border-outline-variant/60 p-4"
            >
              <legend className="px-2 text-sm font-bold text-on-surface">
                Grupos habilitados
              </legend>

              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {gruposDisponibles.map((grupo) => (
                  <label
                    key={grupo}
                    className="flex cursor-pointer items-center gap-3 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface"
                  >
                    <input
                      type="checkbox"
                      checked={formulario.grupos.includes(grupo)}
                      onChange={() =>
                        alternarGrupo(grupo)
                      }
                      className="h-4 w-4 accent-primary"
                    />

                    <span>{grupo}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* ANOTACIONES */}

            <Campo titulo="Anotaciones">
              <textarea
                rows={3}
                maxLength={5000}
                disabled={guardando}
                value={formulario.anotaciones}
                onChange={(evento) =>
                  cambiarCampo(
                    "anotaciones",
                    evento.target.value,
                  )
                }
                className={CLASE_CAMPO}
                placeholder="Información interna relacionada con esta persona..."
              />
            </Campo>

            {/* ACTIVO */}

            <label className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
              <input
                type="checkbox"
                checked={formulario.activo}
                disabled={guardando}
                onChange={(evento) =>
                  cambiarCampo(
                    "activo",
                    evento.target.checked,
                  )
                }
                className="h-5 w-5 accent-primary"
              />

              <span>
                <span className="block text-sm font-bold text-on-surface">
                  Persona activa
                </span>

                <span className="block text-xs text-on-surface-variant">
                  Una persona inactiva conserva su historial.
                </span>
              </span>
            </label>

            {/* BOTONES */}

            <div className="flex flex-wrap justify-end gap-3 border-t border-outline-variant/60 pt-5">
              <button
                type="button"
                disabled={guardando}
                onClick={cerrarFormulario}
                className="min-h-11 rounded-xl border border-outline-variant px-5 text-sm font-bold text-on-surface disabled:opacity-50"
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
                  : formulario.id
                    ? "Guardar cambios"
                    : "Registrar persona"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* FILTROS */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">

          <Campo titulo="Buscar personal">
            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Nombre, código, nivel..."
              className={CLASE_CAMPO}
            />
          </Campo>

          <Campo titulo="Estado">
            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(
                  evento.target.value as FiltroEstado,
                )
              }
              className={CLASE_CAMPO}
            >
              <option value="todos">
                Todos
              </option>

              <option value="activos">
                Activos
              </option>

              <option value="inactivos">
                Inactivos
              </option>
            </select>
          </Campo>

          <Campo titulo="Habilitación">
            <select
              value={filtroHabilitacion}
              onChange={(evento) =>
                setFiltroHabilitacion(evento.target.value)
              }
              className={CLASE_CAMPO}
            >
              <option value="todos">
                Todas
              </option>

              <option value="pista">
                Solo pista
              </option>

              <option value="mesa">
                Solo mesa
              </option>

              <option value="ambos">
                Pista y mesa
              </option>

              <option value="sin_definir">
                Sin definir
              </option>
            </select>
          </Campo>

          <Campo titulo="Nivel">
            <select
              value={filtroNivel}
              onChange={(evento) =>
                setFiltroNivel(evento.target.value)
              }
              className={CLASE_CAMPO}
            >
              <option value="todos">
                Todos los niveles
              </option>

              {NIVELES.map((nivel) => (
                <option
                  key={nivel}
                  value={nivel}
                >
                  {nivel}
                </option>
              ))}
            </select>
          </Campo>

          <Campo titulo="Grupo">
            <select
              value={filtroGrupo}
              onChange={(evento) =>
                setFiltroGrupo(evento.target.value)
              }
              className={CLASE_CAMPO}
            >
              <option value="todos">
                Todos los grupos
              </option>

              {gruposDisponibles.map((grupo) => (
                <option
                  key={grupo}
                  value={grupo}
                >
                  {grupo}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            <strong className="text-on-surface">
              {personalFiltrado.length}
            </strong>{" "}
            personas encontradas
          </p>

          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setFiltroEstado("todos");
              setFiltroHabilitacion("todos");
              setFiltroNivel("todos");
              setFiltroGrupo("todos");
            }}
            className="text-sm font-bold text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      </section>

      {/* LISTADO */}

      {personalFiltrado.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {personalFiltrado.map((persona) => (
            <article
              key={persona.id}
              className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    {persona.codigo || "Sin código"}
                  </p>

                  <h3 className="mt-1 text-lg font-extrabold text-on-surface">
                    {persona.nombreCompleto}
                  </h3>
                </div>

                <BadgeEstado activo={persona.activo} />
              </div>

              <p className="mt-3 text-sm font-semibold text-on-surface-variant">
                {nombreHabilitacion(persona.habilitacion)}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-xs text-on-surface-variant">
                    Nivel de pista
                  </p>

                  <p className="mt-1 text-sm font-bold text-on-surface">
                    {persona.nivelPista || "Sin asignar"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-xs text-on-surface-variant">
                    Nivel de mesa
                  </p>

                  <p className="mt-1 text-sm font-bold text-on-surface">
                    {persona.nivelMesa || "Sin asignar"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {persona.grupos.length > 0 ? (
                  persona.grupos.map((grupo) => (
                    <span
                      key={grupo}
                      className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs text-on-surface"
                    >
                      {grupo}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-on-surface-variant">
                    Sin grupos asignados
                  </span>
                )}
              </div>

              {persona.anotaciones && (
                <p className="mt-4 whitespace-pre-wrap border-t border-outline-variant/60 pt-3 text-sm text-on-surface-variant">
                  {persona.anotaciones}
                </p>
              )}

              {puedeEditar && (
                <div className="mt-5 flex justify-end border-t border-outline-variant/60 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      iniciarEdicion(persona)
                    }
                    className="min-h-10 rounded-xl border border-outline-variant px-4 text-sm font-bold text-on-surface hover:border-primary hover:text-primary"
                  >
                    Editar persona
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-5 py-12 text-center">
          <h3 className="text-lg font-extrabold text-on-surface">
            No se ha encontrado personal
          </h3>

          <p className="mt-2 text-sm text-on-surface-variant">
            Cambia los filtros o registra una nueva persona.
          </p>

          {puedeCrear && (
            <button
              type="button"
              onClick={iniciarAlta}
              className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary"
            >
              Añadir persona
            </button>
          )}
        </section>
      )}
    </div>
  );
}
