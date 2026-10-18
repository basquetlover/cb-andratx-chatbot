import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import GeneradorImagenDesignacion from "@components/panel/designaciones/imagen/GeneradorImagenDesignacion";

import type {
  FilaDesignacionImagen,
  DatosImagenDesignacion,
  FuncionDesignacion,
} from "@components/panel/designaciones/imagen/GeneradorImagenDesignacion";

import type {
  AsignacionDetalleDesignacion,
  DatosPartidoDesignacion,
  PersonalDisponibleDesignacion,
  ResultadoDetallePartidoDesignacion,
} from "@servicios/backend/designaciones/obtenerDetallePartidoDesignacion";

import type {
  InstalacionDesignacion,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

import {
  compararPersonalPorCodigo,
} from "@servicios/backend/designaciones/ordenarPersonalPorCodigo";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const API = "/api/panel/designaciones/partido";

const FUNCIONES = [
  {
    codigo: "AP",
    nombre: "Árbitro principal",
    tipo: "pista",
  },
  {
    codigo: "AX",
    nombre: "Árbitro auxiliar",
    tipo: "pista",
  },
  {
    codigo: "AN",
    nombre: "Anotador",
    tipo: "mesa",
  },
  {
    codigo: "CR",
    nombre: "Cronometrador",
    tipo: "mesa",
  },
  {
    codigo: "OP",
    nombre: "Operador de RLL",
    tipo: "mesa",
  },
  {
    codigo: "AY",
    nombre: "Ayudante de anotador",
    tipo: "mesa",
  },
] as const;

const NIVELES = [
  "Escuela",
  "Iniciación",
  "Auxiliar",
  "Entrenador",
  "Técnico",
  "Responsable",
] as const;

const CAMPO =
  "min-h-11 w-full rounded-xl border border-outline-variant " +
  "bg-surface-container-lowest px-3 py-2 text-sm text-on-surface " +
  "outline-none focus:border-primary disabled:opacity-60";

type Apartado =
  | "datos"
  | "designaciones"
  | "imagen";

type Estado =
  | "sin_designar"
  | "pendiente"
  | "realizado";

interface Props {
  resultadoInicial: ResultadoDetallePartidoDesignacion;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

interface AsignacionFormulario {
  clave: string;
  id: string | null;
  personaId: string;
  funcionDesignada: string;
  funcionRealizada: string | null;
  anotaciones: string;
}

interface RespuestaGuardado {
  ok: boolean;
  data?: {
    idPartido: string;
    estado: string;
    creado: boolean;
    url: string;
  } | null;
  error?: string | null;
}

// ======================================================
// UTILIDADES
// ======================================================

function asignacionInicial(
  asignacion: AsignacionDetalleDesignacion,
): AsignacionFormulario {
  return {
    clave: asignacion.id,
    id: asignacion.id,
    personaId: asignacion.personaId,
    funcionDesignada: asignacion.funcionDesignada,
    funcionRealizada: asignacion.funcionRealizada,
    anotaciones: asignacion.anotaciones,
  };
}

function nuevaAsignacion(): AsignacionFormulario {
  return {
    clave: crypto.randomUUID(),
    id: null,
    personaId: "",
    funcionDesignada: "",
    funcionRealizada: null,
    anotaciones: "",
  };
}

function esFuncion(
  valor: string,
): valor is FuncionDesignacion {
  return FUNCIONES.some(
    (funcion) => funcion.codigo === valor,
  );
}

function estadoAsignaciones(
  asignaciones: AsignacionFormulario[],
): Estado {
  const completas = asignaciones.filter(
    (asignacion) =>
      asignacion.personaId &&
      asignacion.funcionDesignada,
  );

  if (!completas.length) {
    return "sin_designar";
  }

  return completas.every(
    (asignacion) =>
      Boolean(asignacion.funcionRealizada),
  )
    ? "realizado"
    : "pendiente";
}

function fechaLegible(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha || "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(
    new Date(`${fecha}T12:00:00Z`),
  );
}

// ======================================================
// COMPONENTES DE CAMPOS
// ======================================================

function Campo({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {titulo}
      </span>

      {children}
    </label>
  );
}

function Texto({
  titulo,
  valor,
  disabled,
  tipo = "text",
  onChange,
}: {
  titulo: string;
  valor: string;
  disabled: boolean;
  tipo?: string;
  onChange: (valor: string) => void;
}) {
  return (
    <Campo titulo={titulo}>
      <input
        type={tipo}
        value={valor}
        disabled={disabled}
        onChange={(evento) =>
          onChange(evento.target.value)
        }
        className={CAMPO}
      />
    </Campo>
  );
}

// ======================================================
// SELECTOR DE FUNCIONES
// ======================================================

function SelectorFuncion({
  valor,
  disabled,
  permitirVacio = false,
  onChange,
}: {
  valor: string;
  disabled: boolean;
  permitirVacio?: boolean;
  onChange: (valor: string) => void;
}) {
  return (
    <select
      value={valor}
      disabled={disabled}
      onChange={(evento) =>
        onChange(evento.target.value)
      }
      className={CAMPO}
    >
      <option value="">
        {permitirVacio
          ? "Sin función realizada"
          : "Seleccionar función"}
      </option>

      {FUNCIONES.map((funcion) => (
        <option
          key={funcion.codigo}
          value={funcion.codigo}
        >
          {funcion.codigo} · {funcion.nombre}
        </option>
      ))}
    </select>
  );
}

// ======================================================
// SELECTOR DE NIVEL
// ======================================================

function SelectorNivel({
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
        <option value="">
          Sin nivel mínimo
        </option>

        {anterior && (
          <option value={valor}>
            {valor} (anterior)
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
// SELECTOR DE INSTALACIONES
// ======================================================

function SelectorInstalacion({
  valor,
  instalaciones,
  disabled,
  onChange,
}: {
  valor: string | null;
  instalaciones: InstalacionDesignacion[];
  disabled: boolean;
  onChange: (valor: string | null) => void;
}) {
  const seleccionada = instalaciones.find(
    (instalacion) =>
      instalacion.id === valor,
  );

  return (
    <div className="space-y-2">
      <Campo titulo="Instalación del club">
        <select
          value={valor ?? ""}
          disabled={disabled}
          className={CAMPO}
          onChange={(evento) =>
            onChange(evento.target.value || null)
          }
        >
          <option value="">
            Sin instalación asignada
          </option>

          <optgroup label="Instalaciones activas">
            {instalaciones
              .filter(
                (instalacion) =>
                  instalacion.activa,
              )
              .map((instalacion) => (
                <option
                  key={instalacion.id}
                  value={instalacion.id}
                >
                  {instalacion.etiqueta}
                </option>
              ))}
          </optgroup>

          {instalaciones.some(
            (instalacion) => !instalacion.activa,
          ) && (
            <optgroup label="Instalaciones anteriores">
              {instalaciones
                .filter(
                  (instalacion) =>
                    !instalacion.activa,
                )
                .map((instalacion) => (
                  <option
                    key={instalacion.id}
                    value={instalacion.id}
                    disabled={
                      instalacion.id !== valor
                    }
                  >
                    {instalacion.etiqueta} (inactiva)
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </Campo>

      {seleccionada && (
        <p className="rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
          <strong>{seleccionada.nombre}</strong>

          {seleccionada.direccion &&
            ` · ${seleccionada.direccion}`}

          {seleccionada.localidad &&
            ` · ${seleccionada.localidad}`}

          {!seleccionada.activa &&
            " · Inactiva"}
        </p>
      )}

      {valor && !seleccionada && (
        <p className="text-sm text-error">
          La instalación seleccionada ya no está
          disponible.
        </p>
      )}
    </div>
  );
}

// ======================================================
// SELECTOR PERSONAL ORDENADO POR CÓDIGO CBA
// ======================================================

function SelectorPersonal({
  valor,
  funcion,
  personal,
  disabled,
  onChange,
}: {
  valor: string;
  funcion: string;
  personal: PersonalDisponibleDesignacion[];
  disabled: boolean;
  onChange: (valor: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const seleccionada = personal.find(
    (persona) => persona.id === valor,
  );

  const filtrados = useMemo(() => {
    const consulta = busqueda
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");

    return personal
      .filter((persona) => {
        const contenido = [
          persona.nombreCompleto,
          persona.codigo,
        ]
          .join(" ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLocaleLowerCase("es");

        return contenido.includes(consulta);
      })
      .sort(compararPersonalPorCodigo);
  }, [personal, busqueda]);

  const tipo = FUNCIONES.find(
    (funcionActual) =>
      funcionActual.codigo === funcion,
  )?.tipo;

  function compatible(
    persona: PersonalDisponibleDesignacion,
  ): boolean {
    const habilitacion =
      persona.habilitacion.toLocaleLowerCase("es");

    return (
      !tipo ||
      habilitacion === "ambos" ||
      habilitacion === tipo ||
      habilitacion === "pista y mesa" ||
      habilitacion === "mesa y pista"
    );
  }

  const activos = filtrados.filter(
    (persona) => persona.activo,
  );

  const inactivos = filtrados.filter(
    (persona) => !persona.activo,
  );

  return (
    <div className="space-y-2">
      <input
        type="search"
        disabled={disabled}
        className={CAMPO}
        placeholder="Buscar por nombre o CBA-001"
        value={busqueda}
        onChange={(evento) =>
          setBusqueda(evento.target.value)
        }
        aria-label="Buscar árbitro u oficial"
      />

      <select
        value={valor}
        disabled={disabled}
        onChange={(evento) => {
          onChange(evento.target.value);
          setBusqueda("");
        }}
        className={CAMPO}
        aria-label="Seleccionar árbitro u oficial de mesa"
      >
        <option value="">
          Seleccionar persona
        </option>

        {seleccionada &&
          !filtrados.some(
            (persona) =>
              persona.id === seleccionada.id,
          ) && (
            <option value={seleccionada.id}>
              {seleccionada.codigo}
              {" · "}
              {seleccionada.nombreCompleto}
            </option>
          )}

        {activos.length > 0 && (
          <optgroup label="ACTIVOS · orden CBA">
            {activos.map((persona) => (
              <option
                key={persona.id}
                value={persona.id}
              >
                {persona.codigo}
                {" · "}
                {persona.nombreCompleto}
                {compatible(persona)
                  ? ""
                  : " · Otra habilitación"}
              </option>
            ))}
          </optgroup>
        )}

        {inactivos.length > 0 && (
          <optgroup label="INACTIVOS · orden CBA">
            {inactivos.map((persona) => (
              <option
                key={persona.id}
                value={persona.id}
              >
                {persona.codigo}
                {" · "}
                {persona.nombreCompleto}
                {compatible(persona)
                  ? ""
                  : " · Otra habilitación"}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {seleccionada && (
        <p className="text-xs text-on-surface-variant">
          {seleccionada.habilitacion}
          {" · "}
          Nivel{" "}
          {tipo === "mesa"
            ? seleccionada.nivelMesa ||
              "sin asignar"
            : seleccionada.nivelPista ||
              "sin asignar"}

          {!seleccionada.activo &&
            " · Inactivo"}
        </p>
      )}
    </div>
  );
}

// ======================================================
// EDITOR PRINCIPAL
// ======================================================

export default function EditorPartidoDesignacion({
  resultadoInicial,
  puedeEditar,
}: Props) {
  const [partido, setPartido] =
    useState<DatosPartidoDesignacion>(
      resultadoInicial.partido,
    );

  const [asignaciones, setAsignaciones] =
    useState<AsignacionFormulario[]>(
      resultadoInicial.asignaciones.map(
        asignacionInicial,
      ),
    );

  const [apartado, setApartado] =
    useState<Apartado>("datos");

  const [guardando, setGuardando] =
    useState(false);

  const [modificado, setModificado] =
    useState(false);

  const [mensaje, setMensaje] = useState<{
    tipo: "error" | "informacion";
    texto: string;
  } | null>(null);

  const guardandoRef = useRef(false);

  const personal = resultadoInicial.personal;
  const instalaciones = resultadoInicial.instalaciones;

  const estado = estadoAsignaciones(asignaciones);

  const completos = asignaciones.filter(
    (asignacion) =>
      asignacion.personaId &&
      asignacion.funcionDesignada,
  );

  const realizados = completos.filter(
    (asignacion) =>
      asignacion.funcionRealizada,
  ).length;

  const bloqueado =
    !puedeEditar || guardando;

  // ====================================================
  // DATOS PARA LA IMAGEN
  // ====================================================

  // Se mantiene el orden de las funciones
  // designadas. Solo añadimos el código CBA
  // al nombre completo.

  const designacionesImagen = useMemo<
    FilaDesignacionImagen[]
  >(
    () =>
      asignaciones.flatMap((asignacion) => {
        if (
          !asignacion.personaId ||
          !esFuncion(
            asignacion.funcionDesignada,
          )
        ) {
          return [];
        }

        const persona = personal.find(
          (elemento) =>
            elemento.id ===
            asignacion.personaId,
        );

        if (!persona) {
          return [];
        }

        const codigo = persona.codigo.trim();

        return [
          {
            funcion:
              asignacion.funcionDesignada,

            nombreCompleto:
              `${persona.nombreCompleto}` +
              `${codigo ? ` (${codigo})` : ""}`,
          },
        ];
      }),
    [
      asignaciones,
      personal,
    ],
  );

  const instalacion = instalaciones.find(
    (elemento) =>
      elemento.id === partido.instalacionId,
  );

  const lugarImagen =
    instalacion?.nombre ||
    partido.nombreCampoFbib ||
    "";

  const datosImagen =
    useMemo<DatosImagenDesignacion>(
      () => ({
        grupo:
          [
            partido.categoria,
            partido.grupo,
          ]
            .map(
              (valor) =>
                valor?.trim(),
            )
            .filter(Boolean)
            .join(" - ") || null,

        jornada:
          partido.jornada || null,

        fecha:
          partido.fecha || null,

        hora:
          partido.hora || null,

        lugar:
          lugarImagen || null,

        equipoLocal:
          partido.equipoLocal || null,

        equipoVisitante:
          partido.equipoVisitante || null,

        numeroPartido:
          partido.numeroPartido || null,

        fechaGeneracion: null,

        modificado,
      }),
      [
        partido.categoria,
        partido.grupo,
        partido.jornada,
        partido.fecha,
        partido.hora,
        lugarImagen,
        partido.equipoLocal,
        partido.equipoVisitante,
        partido.numeroPartido,
        modificado,
      ],
    );

  const imagenDisponible =
    partido.guardado &&
    !modificado &&
    !guardando &&
    designacionesImagen.length > 0;

  // ====================================================
  // ACTUALIZAR DATOS
  // ====================================================

  function actualizarPartido<
    K extends keyof DatosPartidoDesignacion
  >(
    campo: K,
    valor: DatosPartidoDesignacion[K],
  ) {
    setPartido((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    setModificado(true);
    setMensaje(null);
  }

  function actualizarAsignacion(
    clave: string,
    cambios: Partial<AsignacionFormulario>,
  ) {
    setAsignaciones((anteriores) =>
      anteriores.map((asignacion) =>
        asignacion.clave === clave
          ? { ...asignacion, ...cambios }
          : asignacion,
      ),
    );

    setModificado(true);
    setMensaje(null);
  }

  function agregarAsignacion() {
    setAsignaciones((anteriores) => [
      ...anteriores,
      nuevaAsignacion(),
    ]);

    setApartado("designaciones");
    setModificado(true);
    setMensaje(null);
  }

  function eliminarAsignacion(clave: string) {
    setAsignaciones((anteriores) =>
      anteriores.filter(
        (asignacion) =>
          asignacion.clave !== clave,
      ),
    );

    setModificado(true);
    setMensaje(null);
  }

  function avisar(
    apartadoError: Apartado,
    texto: string,
  ) {
    setApartado(apartadoError);

    setMensaje({
      tipo: "error",
      texto,
    });
  }

  // ====================================================
  // GUARDAR
  // ====================================================

  async function guardarCambios() {
    if (
      !puedeEditar ||
      guardandoRef.current
    ) {
      return;
    }

    if (
      !partido.fecha ||
      !partido.equipoLocal.trim() ||
      !partido.equipoVisitante.trim()
    ) {
      avisar(
        "datos",
        "Debes indicar la fecha, equipo local y equipo visitante.",
      );
      return;
    }

    if (
      partido.instalacionId &&
      !instalaciones.some(
        (instalacion) =>
          instalacion.id ===
          partido.instalacionId,
      )
    ) {
      avisar(
        "datos",
        "La instalación seleccionada no está disponible.",
      );
      return;
    }

    const incompleta = asignaciones.findIndex(
      (asignacion) =>
        !asignacion.personaId ||
        !asignacion.funcionDesignada,
    );

    if (incompleta !== -1) {
      avisar(
        "designaciones",
        `Completa la persona y la función de la designación ${incompleta + 1}.`,
      );
      return;
    }

    if (
      !partido.guardado &&
      asignaciones.length === 0
    ) {
      avisar(
        "designaciones",
        "Para guardar por primera vez un partido FBIB debes registrar al menos una designación.",
      );
      return;
    }

    guardandoRef.current = true;
    setGuardando(true);
    setMensaje(null);

    try {
      const respuesta = await fetch(API, {
        method: "POST",
        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          partido: {
            id: partido.id,
            origen: partido.origen,
            idPartidoFbib: partido.idPartidoFbib,

            fecha: partido.fecha,
            hora: partido.hora,

            equipoLocal: partido.equipoLocal,
            equipoVisitante: partido.equipoVisitante,

            categoria: partido.categoria,
            grupo: partido.grupo,
            jornada: partido.jornada,
            competicion: partido.competicion,

            instalacionId: partido.instalacionId,

            nivelMinimoPista:
              partido.nivelMinimoPista,

            nivelMinimoMesa:
              partido.nivelMinimoMesa,

            anotaciones: partido.anotaciones,
          },

          asignaciones: asignaciones.map(
            (asignacion, orden) => ({
              id: asignacion.id,

              personaId:
                asignacion.personaId,

              funcionDesignada:
                asignacion.funcionDesignada,

              funcionRealizada:
                asignacion.funcionRealizada,

              orden,

              anotaciones:
                asignacion.anotaciones,
            }),
          ),
        }),
      });

      const resultado =
        (await respuesta.json()) as RespuestaGuardado;

      if (
        !respuesta.ok ||
        !resultado.ok ||
        !resultado.data?.idPartido
      ) {
        throw new Error(
          resultado.error ||
            "No se han podido guardar las designaciones.",
        );
      }

      setModificado(false);

      window.location.assign(
        "/panel/designaciones/partido?" +
          new URLSearchParams({
            idPartido:
              resultado.data.idPartido,
          }).toString(),
      );
    } catch (fallo) {
      setMensaje({
        tipo: "error",

        texto:
          fallo instanceof Error
            ? fallo.message
            : "Error al guardar el partido.",
      });
    } finally {
      guardandoRef.current = false;
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
              <span className="rounded-lg bg-primary-fixed px-3 py-1 text-on-primary-fixed">
                {partido.origen}
              </span>

              <span className="rounded-lg bg-surface-container px-3 py-1">
                {partido.guardado
                  ? "Guardado en CBA"
                  : "Sin guardar"}
              </span>

              <span className="rounded-lg bg-surface-container px-3 py-1">
                {estado === "realizado"
                  ? "Realizado"
                  : estado === "pendiente"
                    ? "Pendiente"
                    : "Sin designar"}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-on-surface">
              {partido.equipoLocal ||
                "Equipo local"}
              {" "}
              <span className="font-normal text-on-surface-variant">
                vs
              </span>
              {" "}
              {partido.equipoVisitante ||
                "Equipo visitante"}
            </h2>

            <p className="mt-2 text-sm text-on-surface-variant">
              {fechaLegible(partido.fecha)}

              {partido.hora
                ? ` · ${partido.hora}`
                : ""}

              {" · Nº "}
              {partido.numeroPartido}
            </p>
          </div>

          {puedeEditar && (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                disabled={guardando}
                onClick={guardarCambios}
                className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

              {modificado && (
                <span className="text-xs text-on-surface-variant">
                  Cambios sin guardar
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* AVISOS */}

      {resultadoInicial.avisos.map(
        (aviso, indice) => (
          <p
            key={`${indice}-${aviso}`}
            className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm"
          >
            {aviso}
          </p>
        ),
      )}

      {mensaje && (
        <div
          role="alert"
          className={
            mensaje.tipo === "error"
              ? "rounded-xl bg-error-container p-4 text-sm text-on-error-container"
              : "rounded-xl bg-surface-container-low p-4 text-sm"
          }
        >
          {mensaje.texto}
        </div>
      )}

      {/* PESTAÑAS */}

      <nav
        aria-label="Secciones del partido"
        className="flex flex-wrap gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-2"
      >
        {(
          [
            ["datos", "Datos del partido"],
            ["designaciones", "Designaciones"],
            ["imagen", "Imagen"],
          ] as const
        ).map(([id, etiqueta]) => (
          <button
            key={id}
            type="button"
            onClick={() => setApartado(id)}
            className={
              "min-h-11 rounded-xl px-4 py-2 text-sm font-bold " +
              (
                apartado === id
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              )
            }
          >
            {etiqueta}
          </button>
        ))}
      </nav>

      {/* DATOS DEL PARTIDO */}

      {apartado === "datos" && (
        <section className="space-y-5 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="text-lg font-bold">
            Información del partido
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Texto
              titulo="Número de partido"
              valor={partido.numeroPartido}
              disabled
              onChange={() => {}}
            />

            <Texto
              titulo="Fecha"
              tipo="date"
              valor={partido.fecha}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("fecha", valor)
              }
            />

            <Texto
              titulo="Hora"
              tipo="time"
              valor={partido.hora}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("hora", valor)
              }
            />

            <Texto
              titulo="Equipo local"
              valor={partido.equipoLocal}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "equipoLocal",
                  valor,
                )
              }
            />

            <Texto
              titulo="Equipo visitante"
              valor={partido.equipoVisitante}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "equipoVisitante",
                  valor,
                )
              }
            />

            <Texto
              titulo="Categoría"
              valor={partido.categoria}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "categoria",
                  valor,
                )
              }
            />

            <Texto
              titulo="Grupo"
              valor={partido.grupo}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "grupo",
                  valor,
                )
              }
            />

            <Texto
              titulo="Jornada"
              valor={partido.jornada}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "jornada",
                  valor,
                )
              }
            />

            <Texto
              titulo="Competición"
              valor={partido.competicion}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "competicion",
                  valor,
                )
              }
            />
          </div>

          {/* INSTALACIÓN */}

          <div className="border-t border-outline-variant/60 pt-5">
            <h4 className="mb-3 font-bold">
              Instalación
            </h4>

            {partido.nombreCampoFbib && (
              <p className="mb-3 rounded-xl bg-surface-container-low p-3 text-sm">
                Campo FBIB: {partido.nombreCampoFbib}

                {partido.codigoPostalFbib
                  ? ` · CP ${partido.codigoPostalFbib}`
                  : ""}
              </p>
            )}

            <SelectorInstalacion
              valor={partido.instalacionId}
              instalaciones={instalaciones}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "instalacionId",
                  valor,
                )
              }
            />
          </div>

          {/* NIVELES */}

          <div className="grid gap-4 border-t border-outline-variant/60 pt-5 sm:grid-cols-2">
            <SelectorNivel
              titulo="Nivel mínimo de pista"
              valor={partido.nivelMinimoPista}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "nivelMinimoPista",
                  valor,
                )
              }
            />

            <SelectorNivel
              titulo="Nivel mínimo de mesa"
              valor={partido.nivelMinimoMesa}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido(
                  "nivelMinimoMesa",
                  valor,
                )
              }
            />
          </div>

          {/* ANOTACIONES */}

          <Campo titulo="Anotaciones del partido">
            <textarea
              rows={4}
              value={partido.anotaciones}
              disabled={bloqueado}
              onChange={(evento) =>
                actualizarPartido(
                  "anotaciones",
                  evento.target.value,
                )
              }
              className={CAMPO}
            />
          </Campo>
        </section>
      )}

      {/* DESIGNACIONES */}

      {apartado === "designaciones" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">
                Árbitros y oficiales de mesa
              </h3>

              <p className="text-sm text-on-surface-variant">
                {completos.length} designados
                {" · "}
                {realizados} funciones realizadas
              </p>
            </div>

            {puedeEditar && (
              <button
                type="button"
                disabled={guardando}
                onClick={agregarAsignacion}
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary"
              >
                + Añadir designación
              </button>
            )}
          </div>

          {asignaciones.length === 0 && (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant">
              Todavía no hay designaciones.
            </div>
          )}

          {asignaciones.map((asignacion, indice) => (
            <article
              key={asignacion.clave}
              className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-bold">
                  Designación {indice + 1}
                </h4>

                {puedeEditar && (
                  <button
                    type="button"
                    disabled={guardando}
                    className="rounded-lg px-3 py-2 text-xs font-bold text-error"
                    onClick={() =>
                      eliminarAsignacion(
                        asignacion.clave,
                      )
                    }
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Campo titulo="Función designada">
                  <SelectorFuncion
                    valor={
                      asignacion.funcionDesignada
                    }
                    disabled={bloqueado}
                    onChange={(valor) =>
                      actualizarAsignacion(
                        asignacion.clave,
                        {
                          funcionDesignada: valor,
                        },
                      )
                    }
                  />
                </Campo>

                <div>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                    Árbitro / oficial de mesa
                  </p>

                  <SelectorPersonal
                    valor={asignacion.personaId}
                    funcion={
                      asignacion.funcionDesignada
                    }
                    personal={personal}
                    disabled={bloqueado}
                    onChange={(valor) =>
                      actualizarAsignacion(
                        asignacion.clave,
                        {
                          personaId: valor,
                        },
                      )
                    }
                  />
                </div>

                <Campo titulo="Función realizada">
                  <SelectorFuncion
                    valor={
                      asignacion.funcionRealizada ??
                      ""
                    }
                    permitirVacio
                    disabled={bloqueado}
                    onChange={(valor) =>
                      actualizarAsignacion(
                        asignacion.clave,
                        {
                          funcionRealizada:
                            valor || null,
                        },
                      )
                    }
                  />

                  <p className="mt-1 text-xs text-on-surface-variant">
                    Se utilizará para las estadísticas.
                  </p>
                </Campo>

                <Texto
                  titulo="Anotaciones"
                  valor={asignacion.anotaciones}
                  disabled={bloqueado}
                  onChange={(valor) =>
                    actualizarAsignacion(
                      asignacion.clave,
                      {
                        anotaciones: valor,
                      },
                    )
                  }
                />
              </div>
            </article>
          ))}
        </section>
      )}

      {/* IMAGEN */}

      {apartado === "imagen" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5">
            <h3 className="text-lg font-bold">
              Imagen de designaciones
            </h3>

            <p className="mt-2 text-sm text-on-surface-variant">
              PNG con la plantilla del C.B. Andratx
              y códigos CBA junto a cada nombre.
            </p>
          </div>

          {modificado && (
            <div
              role="alert"
              className="rounded-xl border border-error/40 bg-error-container p-4 text-sm text-on-error-container"
            >
              Hay cambios sin guardar. Guarda antes
              de descargar la imagen.
            </div>
          )}

          {!partido.guardado && (
            <div className="rounded-xl bg-surface-container-low p-4 text-sm">
              El partido todavía no está guardado.
            </div>
          )}

          {designacionesImagen.length === 0 && (
            <div className="rounded-xl bg-surface-container-low p-4 text-sm">
              Añade al menos una persona designada.
            </div>
          )}

          {imagenDisponible ? (
            <GeneradorImagenDesignacion
              datos={datosImagen}
              designaciones={designacionesImagen}
              escudoSrc="/favicon.svg"
              nombreClub="CLUB BÀSQUET ANDRATX"
              mostrarBotonDescarga
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="text-sm text-on-surface-variant">
                La imagen estará disponible cuando
                el partido esté guardado, con
                designaciones completas y sin
                cambios pendientes.
              </p>

              {modificado && puedeEditar && (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={guardarCambios}
                  className="mt-4 min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary"
                >
                  Guardar cambios
                </button>
              )}

              {designacionesImagen.length === 0 &&
                puedeEditar && (
                  <button
                    type="button"
                    onClick={() =>
                      setApartado("designaciones")
                    }
                    className="ml-2 mt-4 min-h-11 rounded-xl border border-primary px-5 text-sm font-bold text-primary"
                  >
                    Ir a designaciones
                  </button>
                )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}