import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { EquipoDisponiblePanel } from "@tipos/PanelUsuario";
import type { EquipoUsuarioDetalle } from "@tipos/UsuarioDetallePanel";

interface AsignacionFormulario {
  equipoId: string;
  fechaCaducidad: string | null;
}

interface Propiedades {
  usuarioId: string;
  accesoTodosEquipos: boolean;
  equiposIniciales: EquipoUsuarioDetalle[];
  alActualizar: (equipos: EquipoUsuarioDetalle[]) => void;
  alIrAPermisos: () => void;
}

interface RespuestaEquiposApi {
  ok: boolean;
  data: EquipoDisponiblePanel[];
  total: number;
  error?: string;
}

interface RespuestaActualizacion {
  ok: boolean;
  data: {
    equipos: {
      accesoTodosEquipos: boolean;
      equiposAsignados: AsignacionFormulario[];
    };
  } | null;
  error: string | null;
}

interface GrupoEquipos {
  categoria: string;
  equipos: EquipoDisponiblePanel[];
}

const ordenCategorias = [
  "escoleta",
  "iniciacion",
  "premini",
  "mini",
  "infantil",
  "cadete",
  "junior",
  "senior",
  "insular",
  "balear",
  "+40",
];

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function obtenerPosicionCategoria(categoria: string): number {
  const categoriaNormalizada = normalizarTexto(categoria);
  const posicion = ordenCategorias.findIndex((categoriaOrden) => categoriaNormalizada.includes(categoriaOrden));

  return posicion === -1 ? ordenCategorias.length : posicion;
}

function convertirFechaInput(fecha: string | null): string | null {
  if (!fecha) {
    return null;
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return null;
  }

  return fechaConvertida.toISOString().slice(0, 10);
}

function ordenarAsignaciones(asignaciones: AsignacionFormulario[]): AsignacionFormulario[] {
  return [...asignaciones].sort((primera, segunda) => primera.equipoId.localeCompare(segunda.equipoId));
}

export default function EquiposUsuario({ usuarioId, accesoTodosEquipos, equiposIniciales, alActualizar, alIrAPermisos }: Propiedades) {
  const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoDisponiblePanel[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionFormulario[]>(() =>
    equiposIniciales.map((equipo) => ({
      equipoId: equipo.equipoId,
      fechaCaducidad: convertirFechaInput(equipo.fechaCaducidad),
    })),
  );

  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [cargandoEquipos, setCargandoEquipos] = useState(!accesoTodosEquipos);
  const [errorEquipos, setErrorEquipos] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [guardadoCorrectamente, setGuardadoCorrectamente] = useState(false);

  useEffect(() => {
    setAsignaciones(
      equiposIniciales.map((equipo) => ({
        equipoId: equipo.equipoId,
        fechaCaducidad: convertirFechaInput(equipo.fechaCaducidad),
      })),
    );
  }, [equiposIniciales]);

  useEffect(() => {
    if (accesoTodosEquipos) {
      setCargandoEquipos(false);
      setErrorEquipos(null);
      return;
    }

    const controlador = new AbortController();

    const cargarEquipos = async () => {
      try {
        setCargandoEquipos(true);
        setErrorEquipos(null);

        const respuesta = await fetch("/api/panel/equipos", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaEquiposApi;

        if (!respuesta.ok || !contenido.ok) {
          throw new Error(contenido.error ?? "No se han podido cargar los equipos.");
        }

        setEquiposDisponibles(contenido.data.filter((equipo) => typeof equipo.id === "string"));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error cargando los equipos:", error);
        setErrorEquipos("No se ha podido obtener la lista de equipos de la temporada.");
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoEquipos(false);
        }
      }
    };

    cargarEquipos();

    return () => {
      controlador.abort();
    };
  }, [accesoTodosEquipos, intento]);

  const categorias = useMemo(() => {
    return Array.from(new Set(equiposDisponibles.map((equipo) => equipo.categoria?.trim()).filter((categoria): categoria is string => Boolean(categoria)))).sort((primeraCategoria, segundaCategoria) => {
      const primeraPosicion = obtenerPosicionCategoria(primeraCategoria);
      const segundaPosicion = obtenerPosicionCategoria(segundaCategoria);

      if (primeraPosicion !== segundaPosicion) {
        return primeraPosicion - segundaPosicion;
      }

      return primeraCategoria.localeCompare(segundaCategoria, "es");
    });
  }, [equiposDisponibles]);

  const equiposPorCategoria = useMemo<GrupoEquipos[]>(() => {
    const busquedaNormalizada = normalizarTexto(busqueda);
    const grupos = new Map<string, EquipoDisponiblePanel[]>();

    equiposDisponibles
      .filter((equipo) => {
        const categoria = equipo.categoria?.trim() || "Sin categoría";
        const nombre = equipo.nombre ?? equipo.nombreCorto ?? "";
        const contenido = normalizarTexto([nombre, equipo.nombreCorto, categoria, equipo.genero, equipo.nivel].filter(Boolean).join(" "));

        return (!busquedaNormalizada || contenido.includes(busquedaNormalizada)) && (categoriaSeleccionada === "todas" || categoria === categoriaSeleccionada);
      })
      .forEach((equipo) => {
        const categoria = equipo.categoria?.trim() || "Sin categoría";
        const equiposCategoria = grupos.get(categoria) ?? [];

        equiposCategoria.push(equipo);
        grupos.set(categoria, equiposCategoria);
      });

    return Array.from(grupos.entries())
      .map(([categoria, equipos]) => ({
        categoria,
        equipos: equipos.sort((primerEquipo, segundoEquipo) => {
          const primerNombre = primerEquipo.nombre ?? primerEquipo.nombreCorto ?? "";
          const segundoNombre = segundoEquipo.nombre ?? segundoEquipo.nombreCorto ?? "";

          return primerNombre.localeCompare(segundoNombre, "es");
        }),
      }))
      .sort((primerGrupo, segundoGrupo) => {
        const primeraPosicion = obtenerPosicionCategoria(primerGrupo.categoria);
        const segundaPosicion = obtenerPosicionCategoria(segundoGrupo.categoria);

        if (primeraPosicion !== segundaPosicion) {
          return primeraPosicion - segundaPosicion;
        }

        return primerGrupo.categoria.localeCompare(segundoGrupo.categoria, "es");
      });
  }, [equiposDisponibles, busqueda, categoriaSeleccionada]);

  const asignacionesIniciales = useMemo(
    () =>
      equiposIniciales.map((equipo) => ({
        equipoId: equipo.equipoId,
        fechaCaducidad: convertirFechaInput(equipo.fechaCaducidad),
      })),
    [equiposIniciales],
  );

  const hayCambios = JSON.stringify(ordenarAsignaciones(asignaciones)) !== JSON.stringify(ordenarAsignaciones(asignacionesIniciales));

  const obtenerAsignacion = (equipoId: string) => {
    return asignaciones.find((asignacion) => asignacion.equipoId === equipoId);
  };

  const alternarEquipo = (equipoId: string) => {
    setAsignaciones((asignacionesActuales) => {
      if (asignacionesActuales.some((asignacion) => asignacion.equipoId === equipoId)) {
        return asignacionesActuales.filter((asignacion) => asignacion.equipoId !== equipoId);
      }

      return [
        ...asignacionesActuales,
        {
          equipoId,
          fechaCaducidad: null,
        },
      ];
    });

    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const cambiarFechaCaducidad = (equipoId: string, fechaCaducidad: string) => {
    setAsignaciones((asignacionesActuales) =>
      asignacionesActuales.map((asignacion) =>
        asignacion.equipoId === equipoId
          ? {
              ...asignacion,
              fechaCaducidad: fechaCaducidad || null,
            }
          : asignacion,
      ),
    );

    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const descartarCambios = () => {
    setAsignaciones(asignacionesIniciales);
    setErrorGuardado(null);
    setGuardadoCorrectamente(false);
  };

  const guardarCambios = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!hayCambios || guardando || cargandoEquipos || errorEquipos || accesoTodosEquipos) {
      return;
    }

    try {
      setGuardando(true);
      setErrorGuardado(null);
      setGuardadoCorrectamente(false);

      const respuesta = await fetch(`/api/panel/usuarios/${encodeURIComponent(usuarioId)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seccion: "equipos",
          datos: {
            equiposAsignados: asignaciones,
          },
        }),
      });

      const contenido = (await respuesta.json()) as RespuestaActualizacion;

      if (!respuesta.ok || !contenido.ok || !contenido.data) {
        throw new Error(contenido.error ?? "No se han podido guardar los equipos.");
      }

      const equiposActualizados = contenido.data.equipos.equiposAsignados
        .map((asignacion) => {
          const equipo = equiposDisponibles.find((equipoDisponible) => equipoDisponible.id === asignacion.equipoId);

          if (!equipo) {
            return null;
          }

          return {
            equipoId: equipo.id,
            nombre: equipo.nombre ?? equipo.nombreCorto ?? "Equipo",
            nombreCorto: equipo.nombreCorto,
            categoria: equipo.categoria,
            genero: equipo.genero,
            nivel: equipo.nivel,
            fechaCaducidad: asignacion.fechaCaducidad,
          };
        })
        .filter((equipo): equipo is EquipoUsuarioDetalle => equipo !== null);

      alActualizar(equiposActualizados);
      setGuardadoCorrectamente(true);
    } catch (error) {
      console.error("Error actualizando los equipos:", error);
      setErrorGuardado(error instanceof Error ? error.message : "No se han podido guardar los equipos.");
    } finally {
      setGuardando(false);
    }
  };

  if (accesoTodosEquipos) {
    return (
      <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-on-surface">Equipos asignados</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Gestiona los equipos a los que puede acceder este usuario.</p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col items-center rounded-2xl border border-primary/25 bg-primary-fixed/40 px-5 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
              <span className="inline-block h-7 w-7 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
            </span>

            <h3 className="mt-4 text-lg font-bold text-on-primary-fixed">Acceso a todos los equipos</h3>
            <p className="mt-2 max-w-xl text-sm text-on-primary-fixed-variant">Este usuario puede acceder a todos los equipos actuales y a los que se creen en el futuro. No necesita asignaciones individuales.</p>

            <button type="button" onClick={alIrAPermisos} className="mt-5 rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary">
              Modificar nivel de acceso
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={guardarCambios} className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
        <h2 className="text-xl font-bold text-on-surface">Equipos asignados</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Selecciona los equipos concretos que podrá gestionar este usuario.</p>
      </div>

      <div className="p-5 sm:p-6">
        {errorGuardado && (
          <div className="mb-5 rounded-xl border border-error/40 bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
            <p className="font-bold">No se han podido guardar los equipos</p>
            <p className="mt-1">{errorGuardado}</p>
          </div>
        )}

        {guardadoCorrectamente && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-success/30 bg-success-container px-4 py-3 text-sm font-semibold text-on-success-container" role="status">
            <span className="inline-block h-5 w-5 shrink-0 bg-success mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
            Los equipos se han actualizado correctamente.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="relative block">
            <span className="sr-only">Buscar equipos</span>
            <span className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/buscar.svg')", WebkitMaskImage: "url('/iconos/panel/buscar.svg')" }} aria-hidden="true" />
            <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre o categoría" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>

          <select value={categoriaSeleccionada} onChange={(evento) => setCategoriaSeleccionada(evento.target.value)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
            <option value="todas">Todas las categorías</option>

            {categorias.map((categoria) => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
        </div>

        {cargandoEquipos && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Cargando equipos...</p>
          </div>
        )}

        {!cargandoEquipos && errorEquipos && (
          <div className="mt-5 rounded-xl border border-error/40 bg-error-container p-4" role="alert">
            <p className="font-bold text-on-error-container">No se han podido cargar los equipos</p>
            <p className="mt-1 text-sm text-on-error-container">{errorEquipos}</p>

            <button type="button" onClick={() => setIntento((valor) => valor + 1)} className="mt-3 rounded-lg border border-error px-4 py-2 text-sm font-bold text-error">
              Volver a intentarlo
            </button>
          </div>
        )}

        {!cargandoEquipos && !errorEquipos && (
          <div className="mt-6 flex flex-col gap-6">
            {equiposPorCategoria.map((grupo) => (
              <section key={grupo.categoria}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-px flex-1 bg-outline-variant" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-on-surface">{grupo.categoria}</h3>
                  <span className="h-px flex-1 bg-outline-variant" />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {grupo.equipos.map((equipo) => {
                    const asignacion = obtenerAsignacion(equipo.id);
                    const seleccionado = Boolean(asignacion);
                    const nombreEquipo = equipo.nombre ?? equipo.nombreCorto ?? "Equipo";
                    const informacion = [equipo.genero, equipo.nivel].filter(Boolean).join(" · ");

                    return (
                      <article key={equipo.id} className={`rounded-xl border p-4 transition-colors ${seleccionado ? "border-primary bg-primary-fixed/40" : "border-outline-variant/60 bg-surface-container-lowest"}`}>
                        <label className="flex cursor-pointer items-start gap-3">
                          <input type="checkbox" checked={seleccionado} onChange={() => alternarEquipo(equipo.id)} disabled={guardando} className="mt-1 h-4 w-4 shrink-0 accent-primary" />

                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-on-surface">{nombreEquipo}</span>
                            {informacion && <span className="mt-0.5 block text-xs text-on-surface-variant">{informacion}</span>}
                          </span>
                        </label>

                        {asignacion && (
                          <label className="mt-4 block border-t border-outline-variant/60 pt-3">
                            <span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Caducidad opcional</span>
                            <input type="date" value={asignacion.fechaCaducidad ?? ""} onChange={(evento) => cambiarFechaCaducidad(equipo.id, evento.target.value)} disabled={guardando} className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                          </label>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}

            {equiposPorCategoria.length === 0 && <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">No hay equipos que coincidan con los filtros.</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-outline-variant/60 bg-surface-container-low px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" onClick={descartarCambios} disabled={!hayCambios || guardando} className="min-h-11 rounded-xl border border-outline-variant px-5 py-3 text-sm font-bold text-on-surface-variant disabled:cursor-not-allowed disabled:opacity-40">
          Descartar cambios
        </button>

        <button type="submit" disabled={!hayCambios || guardando || cargandoEquipos || Boolean(errorEquipos)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-40">
          {guardando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" aria-hidden="true" />}
          {guardando ? "Guardando..." : `Guardar equipos (${asignaciones.length})`}
        </button>
      </div>
    </form>
  );
}