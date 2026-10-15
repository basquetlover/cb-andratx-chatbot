
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AsignacionDetalleDesignacion,
  DatosPartidoDesignacion,
  PersonalDisponibleDesignacion,
  ResultadoDetallePartidoDesignacion,
} from "@servicios/backend/designaciones/obtenerDetallePartidoDesignacion";

import type {
  InstalacionDesignacion,
} from "@servicios/backend/designaciones/obtenerInstalacionesDesignaciones";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const RUTA_API = "/api/panel/designaciones/partido";

const FUNCIONES = [
  { codigo: "AP", nombre: "Árbitro principal", tipo: "pista" },
  { codigo: "AX", nombre: "Árbitro auxiliar", tipo: "pista" },
  { codigo: "AN", nombre: "Anotador", tipo: "mesa" },
  { codigo: "CR", nombre: "Cronometrador", tipo: "mesa" },
  { codigo: "OP", nombre: "Operador de RLL", tipo: "mesa" },
  { codigo: "AY", nombre: "Ayudante de anotador", tipo: "mesa" },
] as const;

type Apartado = "datos" | "designaciones" | "imagen";
type TipoMensaje = "error" | "informacion";

interface Mensaje {
  tipo: TipoMensaje;
  texto: string;
}

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

function convertirAsignacion(
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

function normalizarHabilitacion(
  valor: string,
): "pista" | "mesa" | "ambos" | "otro" {
  const texto = valor.trim().toLocaleLowerCase("es");

  if (
    ["ambos", "ambas", "pista y mesa", "mesa y pista"].includes(texto)
  ) {
    return "ambos";
  }

  if (["pista", "arbitro", "árbitro"].includes(texto)) {
    return "pista";
  }

  if (["mesa", "oficial de mesa"].includes(texto)) {
    return "mesa";
  }

  return "otro";
}

function esPreferido(
  persona: PersonalDisponibleDesignacion,
  funcion: string,
): boolean {
  const configuracion = FUNCIONES.find(
    (elemento) => elemento.codigo === funcion,
  );

  if (!configuracion) return true;

  const habilitacion = normalizarHabilitacion(
    persona.habilitacion,
  );

  return (
    habilitacion === "ambos" ||
    habilitacion === configuracion.tipo
  );
}

function calcularEstado(
  asignaciones: AsignacionFormulario[],
): "sin_designar" | "pendiente" | "realizado" {
  const completas = asignaciones.filter(
    (asignacion) =>
      asignacion.personaId && asignacion.funcionDesignada,
  );

  if (completas.length === 0) return "sin_designar";

  return completas.every(
    (asignacion) => Boolean(asignacion.funcionRealizada),
  )
    ? "realizado"
    : "pendiente";
}

function formatoFecha(valor: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor || "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${valor}T12:00:00Z`));
}

// ======================================================
// CAMPOS DE TEXTO
// ======================================================

interface CampoProps {
  titulo: string;
  valor: string;
  tipo?: string;
  disabled?: boolean;
  onChange: (valor: string) => void;
}

function Campo({
  titulo,
  valor,
  tipo = "text",
  disabled = false,
  onChange,
}: CampoProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {titulo}
      </span>

      <input
        type={tipo}
        value={valor}
        disabled={disabled}
        onChange={(evento) => onChange(evento.target.value)}
        className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-on-surface-variant"
      />
    </label>
  );
}

// ======================================================
// SELECTOR DE INSTALACIONES
// ======================================================

interface SelectorInstalacionesProps {
  valor: string | null;
  instalaciones: InstalacionDesignacion[];
  disabled: boolean;
  onChange: (valor: string | null) => void;
}

function SelectorInstalaciones({
  valor,
  instalaciones,
  disabled,
  onChange,
}: SelectorInstalacionesProps) {
  const seleccionada = instalaciones.find(
    (instalacion) => instalacion.id === valor,
  );

  const activas = instalaciones.filter(
    (instalacion) => instalacion.activa,
  );

  const inactivas = instalaciones.filter(
    (instalacion) => !instalacion.activa,
  );

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Instalación del club
        </span>

        <select
          value={valor ?? ""}
          disabled={disabled}
          onChange={(evento) =>
            onChange(evento.target.value || null)
          }
          className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:opacity-60"
        >
          <option value="">Sin instalación asignada</option>

          <optgroup label="Instalaciones activas">
            {activas.map((instalacion) => (
              <option
                key={instalacion.id}
                value={instalacion.id}
              >
                {instalacion.etiqueta}
              </option>
            ))}
          </optgroup>

          {inactivas.length > 0 && (
            <optgroup label="Instalaciones anteriores">
              {inactivas.map((instalacion) => (
                <option
                  key={instalacion.id}
                  value={instalacion.id}
                  disabled={instalacion.id !== valor}
                >
                  {instalacion.etiqueta} (inactiva)
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      {seleccionada ? (
        <div className="rounded-xl bg-surface-container-low p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-on-surface">
              {seleccionada.nombre}
            </p>

            {!seleccionada.activa && (
              <span className="rounded-md bg-surface-container-high px-2 py-1 text-xs font-bold text-on-surface-variant">
                Inactiva
              </span>
            )}
          </div>

          {seleccionada.nombreCorto &&
            seleccionada.nombreCorto !== seleccionada.nombre && (
              <p className="mt-1 text-xs text-on-surface-variant">
                {seleccionada.nombreCorto}
              </p>
            )}

          {(seleccionada.direccion || seleccionada.localidad) && (
            <p className="mt-2 text-sm text-on-surface-variant">
              {[seleccionada.direccion, seleccionada.localidad]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      ) : valor ? (
        <p className="text-sm text-error">
          La instalación guardada ya no existe en el listado.
          Selecciona otra antes de guardar.
        </p>
      ) : (
        <p className="text-xs text-on-surface-variant">
          Selecciona una pista registrada en el club.
          Si todavía no se ha determinado, puedes dejarla vacía.
        </p>
      )}

      {activas.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          Actualmente no hay instalaciones activas.
        </p>
      )}
    </div>
  );
}

// ======================================================
// SELECTOR DE FUNCIONES
// ======================================================

interface SelectorFuncionProps {
  valor: string;
  disabled: boolean;
  permitirVacio?: boolean;
  onChange: (valor: string) => void;
}

function SelectorFuncion({
  valor,
  disabled,
  permitirVacio = false,
  onChange,
}: SelectorFuncionProps) {
  return (
    <select
      value={valor}
      disabled={disabled}
      onChange={(evento) => onChange(evento.target.value)}
      className="min-h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
    >
      <option value="">
        {permitirVacio
          ? "Sin función realizada"
          : "Seleccionar función"}
      </option>

      {FUNCIONES.map((funcion) => (
        <option key={funcion.codigo} value={funcion.codigo}>
          {funcion.codigo} · {funcion.nombre}
        </option>
      ))}
    </select>
  );
}

// ======================================================
// SELECTOR DE PERSONAL
// ======================================================

interface SelectorPersonalProps {
  valor: string;
  funcion: string;
  personal: PersonalDisponibleDesignacion[];
  disabled: boolean;
  onChange: (id: string) => void;
}

function SelectorPersonal({
  valor,
  funcion,
  personal,
  disabled,
  onChange,
}: SelectorPersonalProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarOtros, setMostrarOtros] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);

  const seleccionada = personal.find(
    (persona) => persona.id === valor,
  );

  const coincidencias = useMemo(() => {
    const consulta = busqueda
      .trim()
      .toLocaleLowerCase("es");

    return personal
      .filter(
        (persona) =>
          persona.nombreCompleto
            .toLocaleLowerCase("es")
            .includes(consulta) ||
          persona.codigo.toLocaleLowerCase("es").includes(consulta),
      )
      .sort((a, b) =>
        a.nombreCompleto.localeCompare(
          b.nombreCompleto,
          "es",
        ),
      );
  }, [busqueda, personal]);

  const preferidos = coincidencias.filter(
    (persona) => esPreferido(persona, funcion),
  );

  const otros = coincidencias.filter(
    (persona) => !esPreferido(persona, funcion),
  );

  useEffect(() => {
    if (!abierto) return;

    function cerrarFuera(evento: PointerEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    }

    function cerrarEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("pointerdown", cerrarFuera);
    document.addEventListener("keydown", cerrarEscape);

    return () => {
      document.removeEventListener("pointerdown", cerrarFuera);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, [abierto]);

  function elegir(id: string) {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  }

  function pintarPersona(persona: PersonalDisponibleDesignacion) {
    const nivel =
      FUNCIONES.find((item) => item.codigo === funcion)?.tipo ===
      "mesa"
        ? persona.nivelMesa
        : persona.nivelPista;

    return (
      <button
        key={persona.id}
        type="button"
        role="option"
        aria-selected={persona.id === valor}
        onClick={() => elegir(persona.id)}
        className={[
          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-surface-container",
          persona.id === valor
            ? "bg-primary-fixed text-on-primary-fixed"
            : "",
        ].join(" ")}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {persona.nombreCompleto}
          </span>

          <span className="block text-xs text-on-surface-variant">
            {persona.codigo} · {persona.habilitacion}
            {nivel ? ` · ${nivel}` : ""}
            {!persona.activo ? " · Inactivo" : ""}
          </span>
        </span>

        {persona.id === valor && (
          <span className="font-bold text-primary">✓</span>
        )}
      </button>
    );
  }

  return (
    <div ref={contenedorRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        onClick={() => setAbierto((actual) => !actual)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-left text-sm text-on-surface hover:border-primary disabled:opacity-60"
      >
        <span className="truncate">
          {seleccionada?.nombreCompleto ??
            (valor ? "Persona no disponible" : "Seleccionar persona")}
        </span>

        <span aria-hidden="true">▾</span>
      </button>

      {abierto && (
        <div
          role="listbox"
          aria-label="Seleccionar árbitro u oficial"
          className="absolute left-0 top-full z-30 mt-2 w-full min-w-[260px] rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-xl"
        >
          <input
            autoFocus
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar por nombre o código"
            className="mb-3 min-h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary"
          />

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {preferidos.map(pintarPersona)}

            {preferidos.length === 0 && (
              <p className="p-2 text-sm text-on-surface-variant">
                No hay personas recomendadas.
              </p>
            )}

            {mostrarOtros && (
              <>
                {otros.length > 0 && (
                  <p className="mt-3 border-t border-outline-variant px-2 pt-3 text-xs font-bold uppercase text-on-surface-variant">
                    Otras habilitaciones
                  </p>
                )}

                {otros.map(pintarPersona)}
              </>
            )}
          </div>

          {otros.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarOtros(!mostrarOtros)}
              className="mt-3 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm font-bold text-primary"
            >
              {mostrarOtros
                ? "Ocultar otros"
                : `Mostrar otros (${otros.length})`}
            </button>
          )}

          {valor && (
            <button
              type="button"
              onClick={() => elegir("")}
              className="mt-2 w-full rounded-lg px-3 py-2 text-xs text-on-surface-variant hover:bg-surface-container"
            >
              Quitar selección
            </button>
          )}
        </div>
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
  puedeEliminar,
}: Props) {
  const [partido, setPartido] =
    useState<DatosPartidoDesignacion>(
      resultadoInicial.partido,
    );

  const [asignaciones, setAsignaciones] = useState<
    AsignacionFormulario[]
  >(
    resultadoInicial.asignaciones.map(convertirAsignacion),
  );

  const [apartado, setApartado] = useState<Apartado>("datos");
  const [guardando, setGuardando] = useState(false);
  const [modificado, setModificado] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const guardandoRef = useRef(false);

  const personal = resultadoInicial.personal;
  const instalaciones = resultadoInicial.instalaciones;

  const estado = calcularEstado(asignaciones);

  const totalDesignados = asignaciones.filter(
    (fila) => fila.personaId && fila.funcionDesignada,
  ).length;

  const totalRealizados = asignaciones.filter(
    (fila) =>
      fila.personaId &&
      fila.funcionDesignada &&
      fila.funcionRealizada,
  ).length;

  function marcarModificado() {
    setModificado(true);
    setMensaje(null);
  }

  function actualizarPartido<
    K extends keyof DatosPartidoDesignacion,
  >(
    campo: K,
    valor: DatosPartidoDesignacion[K],
  ) {
    setPartido((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    marcarModificado();
  }

  function actualizarAsignacion(
    clave: string,
    cambios: Partial<AsignacionFormulario>,
  ) {
    setAsignaciones((actuales) =>
      actuales.map((fila) =>
        fila.clave === clave
          ? { ...fila, ...cambios }
          : fila,
      ),
    );

    marcarModificado();
  }

  function agregarAsignacion() {
    setAsignaciones((actuales) => [
      ...actuales,
      nuevaAsignacion(),
    ]);

    setApartado("designaciones");
    marcarModificado();
  }

  function eliminarAsignacion(clave: string) {
    setAsignaciones((actuales) =>
      actuales.filter((fila) => fila.clave !== clave),
    );

    marcarModificado();
  }

  // ====================================================
  // GUARDADO REAL
  // ====================================================

  async function guardarCambios() {
    if (!puedeEditar || guardandoRef.current) return;

    if (!partido.fecha || !partido.equipoLocal.trim() ||
        !partido.equipoVisitante.trim()) {
      setApartado("datos");
      setMensaje({
        tipo: "error",
        texto:
          "Debes indicar fecha, equipo local y equipo visitante.",
      });
      return;
    }

    if (
      partido.instalacionId &&
      !instalaciones.some(
        (instalacion) =>
          instalacion.id === partido.instalacionId,
      )
    ) {
      setApartado("datos");
      setMensaje({
        tipo: "error",
        texto:
          "La instalación seleccionada no está disponible.",
      });
      return;
    }

    const incompleta = asignaciones.findIndex(
      (fila) => !fila.personaId || !fila.funcionDesignada,
    );

    if (incompleta !== -1) {
      setApartado("designaciones");
      setMensaje({
        tipo: "error",
        texto:
          `Completa la persona y la función de la designación ${incompleta + 1}.`,
      });
      return;
    }

    if (!partido.guardado && asignaciones.length === 0) {
      setApartado("designaciones");
      setMensaje({
        tipo: "error",
        texto:
          "Para guardar por primera vez un partido FBIB debes registrar al menos una designación.",
      });
      return;
    }

    const contenido = {
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
        nivelMinimoPista: partido.nivelMinimoPista,
        nivelMinimoMesa: partido.nivelMinimoMesa,
        anotaciones: partido.anotaciones,
      },
      asignaciones: asignaciones.map((fila, indice) => ({
        id: fila.id,
        personaId: fila.personaId,
        funcionDesignada: fila.funcionDesignada,
        funcionRealizada: fila.funcionRealizada,
        orden: indice,
        anotaciones: fila.anotaciones,
      })),
    };

    guardandoRef.current = true;
    setGuardando(true);
    setMensaje(null);

    try {
      const respuesta = await fetch(RUTA_API, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contenido),
      });

      const resultado =
        (await respuesta.json()) as RespuestaGuardado;

      if (!respuesta.ok || !resultado.ok ||
          !resultado.data?.idPartido) {
        throw new Error(
          resultado.error ||
            "No se han podido guardar las designaciones.",
        );
      }

      // Recargar la ficha después del guardado
      // permite recuperar los UUID reales de las
      // nuevas asignaciones y evita duplicarlas.

      setModificado(false);

      window.location.assign(
        `/panel/designaciones/partido?idPartido=${encodeURIComponent(
          resultado.data.idPartido,
        )}`,
      );
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "Se ha producido un error al guardar.",
      });
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  }

  const bloqueado = !puedeEditar || guardando;

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg bg-primary-fixed px-3 py-1 text-xs font-bold uppercase text-on-primary-fixed">
                {partido.origen}
              </span>

              <span className="rounded-lg bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
                {partido.guardado
                  ? "Guardado en CBA"
                  : "Sin guardar"}
              </span>

              <span className="rounded-lg bg-surface-container-high px-3 py-1 text-xs font-bold text-on-surface">
                {estado === "realizado"
                  ? "Realizado"
                  : estado === "pendiente"
                    ? "Pendiente"
                    : "Sin designar"}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-extrabold text-on-surface sm:text-2xl">
              {partido.equipoLocal || "Equipo local"}
              <span className="mx-2 font-normal text-on-surface-variant">
                vs
              </span>
              {partido.equipoVisitante || "Equipo visitante"}
            </h2>

            <p className="mt-2 text-sm text-on-surface-variant">
              {formatoFecha(partido.fecha)}
              {partido.hora ? ` · ${partido.hora}` : ""}
              {" · "}Nº {partido.numeroPartido}
            </p>
          </div>

          {puedeEditar && (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                disabled={guardando}
                onClick={guardarCambios}
                className="min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:opacity-90 disabled:opacity-50"
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

      {resultadoInicial.avisos.map((aviso, indice) => (
        <div
          key={`${indice}-${aviso}`}
          className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant"
        >
          {aviso}
        </div>
      ))}

      {mensaje && (
        <div
          role="alert"
          className={
            mensaje.tipo === "error"
              ? "rounded-xl border border-error/40 bg-error-container p-4 text-sm font-medium text-on-error-container"
              : "rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface"
          }
        >
          {mensaje.texto}
        </div>
      )}

      {/* PESTAÑAS */}

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-2 shadow-sm">
        {(
          [
            ["datos", "Datos del partido"],
            ["designaciones", "Designaciones"],
            ["imagen", "Imagen"],
          ] as const
        ).map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            onClick={() => setApartado(id)}
            className={[
              "min-h-11 rounded-xl px-4 py-2 text-sm font-bold transition-colors",
              apartado === id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container",
            ].join(" ")}
          >
            {nombre}
          </button>
        ))}
      </nav>

      {/* DATOS */}

      {apartado === "datos" && (
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
          <h3 className="text-lg font-bold text-on-surface">
            Información del partido
          </h3>

          <p className="mt-1 text-sm text-on-surface-variant">
            Puedes modificar los datos excepto el número
            de partido y el origen.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Campo
              titulo="Número de partido"
              valor={partido.numeroPartido}
              disabled
              onChange={() => {}}
            />

            <Campo
              titulo="Fecha"
              tipo="date"
              valor={partido.fecha}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("fecha", valor)
              }
            />

            <Campo
              titulo="Hora"
              tipo="time"
              valor={partido.hora}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("hora", valor)
              }
            />

            <Campo
              titulo="Equipo local"
              valor={partido.equipoLocal}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("equipoLocal", valor)
              }
            />

            <Campo
              titulo="Equipo visitante"
              valor={partido.equipoVisitante}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("equipoVisitante", valor)
              }
            />

            <Campo
              titulo="Categoría"
              valor={partido.categoria}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("categoria", valor)
              }
            />

            <Campo
              titulo="Grupo"
              valor={partido.grupo}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("grupo", valor)
              }
            />

            <Campo
              titulo="Jornada"
              valor={partido.jornada}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("jornada", valor)
              }
            />

            <Campo
              titulo="Competición"
              valor={partido.competicion}
              disabled={bloqueado}
              onChange={(valor) =>
                actualizarPartido("competicion", valor)
              }
            />
          </div>

          {/* INSTALACIÓN REAL */}

          <div className="mt-6 border-t border-outline-variant/60 pt-5">
            <h4 className="font-bold text-on-surface">
              Instalación
            </h4>

            <p className="mt-1 text-sm text-on-surface-variant">
              Selecciona una de las instalaciones
              registradas en el club.
            </p>

            {partido.nombreCampoFbib && (
              <div className="mt-3 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
                <span className="font-bold">
                  Campo indicado por FBIB:
                </span>{" "}
                {partido.nombreCampoFbib}
                {partido.codigoPostalFbib
                  ? ` · CP ${partido.codigoPostalFbib}`
                  : ""}
              </div>
            )}

            <div className="mt-4 max-w-2xl">
              <SelectorInstalaciones
                valor={partido.instalacionId}
                instalaciones={instalaciones}
                disabled={bloqueado}
                onChange={(valor) =>
                  actualizarPartido("instalacionId", valor)
                }
              />
            </div>
          </div>

          {/* NIVELES */}

          <div className="mt-6 border-t border-outline-variant/60 pt-5">
            <h4 className="font-bold text-on-surface">
              Niveles de referencia
            </h4>

            <p className="mt-1 text-sm text-on-surface-variant">
              Estos niveles son orientativos.
              No bloquearán la selección de personal.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo
                titulo="Nivel mínimo de pista"
                valor={partido.nivelMinimoPista}
                disabled={bloqueado}
                onChange={(valor) =>
                  actualizarPartido("nivelMinimoPista", valor)
                }
              />

              <Campo
                titulo="Nivel mínimo de mesa"
                valor={partido.nivelMinimoMesa}
                disabled={bloqueado}
                onChange={(valor) =>
                  actualizarPartido("nivelMinimoMesa", valor)
                }
              />
            </div>
          </div>

          {/* ANOTACIONES */}

          <div className="mt-6 border-t border-outline-variant/60 pt-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Anotaciones del partido
              </span>

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
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-3 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
                placeholder="Observaciones, incidencias..."
              />
            </label>
          </div>
        </section>
      )}

      {/* DESIGNACIONES */}

      {apartado === "designaciones" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                Árbitros y oficiales de mesa
              </h3>

              <p className="mt-1 text-sm text-on-surface-variant">
                {totalDesignados} designados ·{" "}
                {totalRealizados} funciones realizadas
              </p>
            </div>

            {puedeEditar && (
              <button
                type="button"
                disabled={guardando}
                onClick={agregarAsignacion}
                className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50"
              >
                + Añadir designación
              </button>
            )}
          </div>

          {asignaciones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-5 py-12 text-center">
              <h4 className="font-bold text-on-surface">
                Todavía no hay designaciones
              </h4>

              <p className="mt-2 text-sm text-on-surface-variant">
                Elige una función y una persona para empezar.
              </p>

              {puedeEditar && (
                <button
                  type="button"
                  onClick={agregarAsignacion}
                  disabled={guardando}
                  className="mt-5 rounded-xl border border-primary px-5 py-2.5 text-sm font-bold text-primary disabled:opacity-50"
                >
                  Añadir primera designación
                </button>
              )}
            </div>
          ) : (
            asignaciones.map((fila, indice) => (
              <div
                key={fila.clave}
                className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-bold text-on-surface">
                    Designación {indice + 1}
                  </h4>

                  {puedeEditar && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => eliminarAsignacion(fila.clave)}
                      className="rounded-lg px-3 py-2 text-xs font-bold text-error hover:bg-error-container disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase text-on-surface-variant">
                      Función designada
                    </span>

                    <SelectorFuncion
                      valor={fila.funcionDesignada}
                      disabled={bloqueado}
                      onChange={(valor) =>
                        actualizarAsignacion(fila.clave, {
                          funcionDesignada: valor,
                        })
                      }
                    />
                  </label>

                  <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase text-on-surface-variant">
                      Árbitro / oficial de mesa
                    </span>

                    <SelectorPersonal
                      valor={fila.personaId}
                      funcion={fila.funcionDesignada}
                      personal={personal}
                      disabled={bloqueado}
                      onChange={(valor) =>
                        actualizarAsignacion(fila.clave, {
                          personaId: valor,
                        })
                      }
                    />
                  </div>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold uppercase text-on-surface-variant">
                      Función realizada
                    </span>

                    <SelectorFuncion
                      valor={fila.funcionRealizada ?? ""}
                      permitirVacio
                      disabled={bloqueado}
                      onChange={(valor) =>
                        actualizarAsignacion(fila.clave, {
                          funcionRealizada: valor || null,
                        })
                      }
                    />

                    <span className="mt-1 block text-xs text-on-surface-variant">
                      Se utilizará para las estadísticas.
                    </span>
                  </label>

                  <Campo
                    titulo="Anotaciones"
                    valor={fila.anotaciones}
                    disabled={bloqueado}
                    onChange={(valor) =>
                      actualizarAsignacion(fila.clave, {
                        anotaciones: valor,
                      })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* IMAGEN */}

      {apartado === "imagen" && (
        <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 text-center shadow-sm">
          <h3 className="text-lg font-bold text-on-surface">
            Imagen de designaciones
          </h3>

          <p className="mx-auto mt-3 max-w-lg text-sm text-on-surface-variant">
            La generación de la imagen se incorporará
            utilizando los datos del partido y las
            personas designadas.
          </p>

          <div className="mx-auto mt-6 flex aspect-[1414/2000] max-w-sm items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low">
            <p className="text-sm text-on-surface-variant">
              Vista previa pendiente
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
