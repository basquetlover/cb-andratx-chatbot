import { useEffect, useMemo, useState } from "react";

interface EquipoDisponible {
  id: string;
  nombre: string | null;
  nombreCorto: string | null;
  categoria: string | null;
  genero: string | null;
  nivel: string | null;
}

interface RespuestaEquipos {
  ok: boolean;
  data?: EquipoDisponible[] | {
    equipos?: EquipoDisponible[];
  };
  error?: string;
}

interface GrupoCategoria {
  categoria: string;
  equipos: EquipoDisponible[];
}

interface Propiedades {
  equiposSeleccionados: string[];
  alCambiar: (equiposIds: string[]) => void;
  deshabilitado?: boolean;
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
  "+40",
];

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function obtenerPosicionCategoria(categoria: string): number {
  const categoriaNormalizada = normalizarTexto(categoria);
  const posicion = ordenCategorias.findIndex((nombreCategoria) => categoriaNormalizada.includes(nombreCategoria));

  return posicion === -1 ? ordenCategorias.length : posicion;
}

function obtenerNombreEquipo(equipo: EquipoDisponible): string {
  return equipo.nombre?.trim() || equipo.nombreCorto?.trim() || "Equipo";
}

function obtenerEquiposRespuesta(respuesta: RespuestaEquipos): EquipoDisponible[] {
  if (Array.isArray(respuesta.data)) {
    return respuesta.data;
  }

  if (respuesta.data && Array.isArray(respuesta.data.equipos)) {
    return respuesta.data.equipos;
  }

  return [];
}

export default function SelectorEquiposPatrocinador({ equiposSeleccionados, alCambiar, deshabilitado = false }: Propiedades) {
  const [equipos, setEquipos] = useState<EquipoDisponible[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarEquipos = async () => {
      try {
        setCargando(true);
        setError(null);

        const respuesta = await fetch("/api/panel/equipos", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        const contenido = (await respuesta.json()) as RespuestaEquipos;

        if (!respuesta.ok || !contenido.ok) {
          throw new Error(contenido.error ?? "No se han podido obtener los equipos");
        }

        const equiposRecibidos = obtenerEquiposRespuesta(contenido).filter((equipo) => typeof equipo.id === "string" && equipo.id.length > 0);

        setEquipos(equiposRecibidos);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error cargando los equipos para el patrocinador:", error);
        setError(error instanceof Error ? error.message : "No se han podido obtener los equipos");
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarEquipos();

    return () => {
      controlador.abort();
    };
  }, [intento]);

  const categorias = useMemo(() => {
    return Array.from(
      new Set(
        equipos
          .map((equipo) => equipo.categoria?.trim())
          .filter((categoria): categoria is string => Boolean(categoria)),
      ),
    ).sort((primeraCategoria, segundaCategoria) => {
      const primeraPosicion = obtenerPosicionCategoria(primeraCategoria);
      const segundaPosicion = obtenerPosicionCategoria(segundaCategoria);

      if (primeraPosicion !== segundaPosicion) {
        return primeraPosicion - segundaPosicion;
      }

      return primeraCategoria.localeCompare(segundaCategoria, "es");
    });
  }, [equipos]);

  const equiposFiltrados = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busqueda);

    return equipos.filter((equipo) => {
      const coincideCategoria = categoriaSeleccionada === "todas" || equipo.categoria === categoriaSeleccionada;

      if (!coincideCategoria) {
        return false;
      }

      if (!busquedaNormalizada) {
        return true;
      }

      const contenido = [
        equipo.nombre,
        equipo.nombreCorto,
        equipo.categoria,
        equipo.genero,
        equipo.nivel,
      ]
        .filter((valor): valor is string => typeof valor === "string")
        .join(" ");

      return normalizarTexto(contenido).includes(busquedaNormalizada);
    });
  }, [busqueda, categoriaSeleccionada, equipos]);

  const grupos = useMemo<GrupoCategoria[]>(() => {
    const equiposPorCategoria = new Map<string, EquipoDisponible[]>();

    equiposFiltrados.forEach((equipo) => {
      const categoria = equipo.categoria?.trim() || "Sin categoría";
      const equiposCategoria = equiposPorCategoria.get(categoria) ?? [];

      equiposCategoria.push(equipo);
      equiposPorCategoria.set(categoria, equiposCategoria);
    });

    return Array.from(equiposPorCategoria.entries())
      .map(([categoria, equiposCategoria]) => ({
        categoria,
        equipos: equiposCategoria.sort((primerEquipo, segundoEquipo) => obtenerNombreEquipo(primerEquipo).localeCompare(obtenerNombreEquipo(segundoEquipo), "es")),
      }))
      .sort((primerGrupo, segundoGrupo) => {
        const primeraPosicion = obtenerPosicionCategoria(primerGrupo.categoria);
        const segundaPosicion = obtenerPosicionCategoria(segundoGrupo.categoria);

        if (primeraPosicion !== segundaPosicion) {
          return primeraPosicion - segundaPosicion;
        }

        return primerGrupo.categoria.localeCompare(segundoGrupo.categoria, "es");
      });
  }, [equiposFiltrados]);

  const equiposSeleccionadosCompletos = useMemo(() => {
    const posiciones = new Map(equiposSeleccionados.map((equipoId, indice) => [equipoId, indice]));

    return equipos
      .filter((equipo) => posiciones.has(equipo.id))
      .sort((primerEquipo, segundoEquipo) => (posiciones.get(primerEquipo.id) ?? 0) - (posiciones.get(segundoEquipo.id) ?? 0));
  }, [equipos, equiposSeleccionados]);

  const todosVisiblesSeleccionados = equiposFiltrados.length > 0 && equiposFiltrados.every((equipo) => equiposSeleccionados.includes(equipo.id));

  const cambiarSeleccionEquipo = (equipoId: string) => {
    if (deshabilitado) {
      return;
    }

    if (equiposSeleccionados.includes(equipoId)) {
      alCambiar(equiposSeleccionados.filter((id) => id !== equipoId));
      return;
    }

    alCambiar([...equiposSeleccionados, equipoId]);
  };

  const seleccionarVisibles = () => {
    if (deshabilitado) {
      return;
    }

    if (todosVisiblesSeleccionados) {
      const idsVisibles = new Set(equiposFiltrados.map((equipo) => equipo.id));

      alCambiar(equiposSeleccionados.filter((equipoId) => !idsVisibles.has(equipoId)));
      return;
    }

    const seleccion = new Set(equiposSeleccionados);

    equiposFiltrados.forEach((equipo) => seleccion.add(equipo.id));

    alCambiar(Array.from(seleccion));
  };

  const eliminarEquipo = (equipoId: string) => {
    if (!deshabilitado) {
      alCambiar(equiposSeleccionados.filter((id) => id !== equipoId));
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
      <div className="min-w-0 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
        <div className="border-b border-outline-variant/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-on-surface">Equipos disponibles</h3>
              <p className="mt-1 text-sm text-on-surface-variant">Selecciona todos los equipos patrocinados.</p>
            </div>

            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-surface-variant">{equipos.length} equipos</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px]">
            <label className="relative block">
              <span className="sr-only">Buscar equipo</span>
              <span className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/buscar.svg')", WebkitMaskImage: "url('/iconos/panel/buscar.svg')" }} aria-hidden="true" />
              <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} disabled={deshabilitado} placeholder="Buscar equipo" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50" />
            </label>

            <select value={categoriaSeleccionada} onChange={(evento) => setCategoriaSeleccionada(evento.target.value)} disabled={deshabilitado} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Filtrar por categoría">
              <option value="todas">Todas las categorías</option>

              {categorias.map((categoria) => (
                <option key={categoria} value={categoria}>{categoria}</option>
              ))}
            </select>
          </div>
        </div>

        {cargando && (
          <div className="flex min-h-52 items-center justify-center gap-3 p-5" role="status">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden="true" />
            <p className="text-sm text-on-surface-variant">Cargando equipos...</p>
          </div>
        )}

        {!cargando && error && (
          <div className="m-4 rounded-xl border border-error/40 bg-error-container p-4 text-on-error-container" role="alert">
            <p className="font-semibold">No se han podido cargar los equipos</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={() => setIntento((valor) => valor + 1)} className="mt-4 rounded-xl border border-error px-4 py-2 text-sm font-bold transition-colors hover:bg-error hover:text-on-error">
              Volver a intentarlo
            </button>
          </div>
        )}

        {!cargando && !error && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 px-4 py-3">
              <p className="text-sm text-on-surface-variant">{equiposFiltrados.length} resultados</p>

              <button type="button" onClick={seleccionarVisibles} disabled={deshabilitado || equiposFiltrados.length === 0} className="text-sm font-bold text-primary transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40">
                {todosVisiblesSeleccionados ? "Deseleccionar visibles" : "Seleccionar visibles"}
              </button>
            </div>

            {grupos.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-on-surface">No hay equipos disponibles</p>
                <p className="mt-1 text-sm text-on-surface-variant">Prueba a cambiar la búsqueda o la categoría.</p>
              </div>
            ) : (
              <div className="max-h-[520px] space-y-5 overflow-y-auto p-4">
                {grupos.map((grupo) => (
                  <section key={grupo.categoria}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-px flex-1 bg-outline-variant"></span>
                      <h4 className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">{grupo.categoria}</h4>
                      <span className="h-px flex-1 bg-outline-variant"></span>
                    </div>

                    <div className="space-y-2">
                      {grupo.equipos.map((equipo) => {
                        const seleccionado = equiposSeleccionados.includes(equipo.id);

                        return (
                          <button key={equipo.id} type="button" onClick={() => cambiarSeleccionEquipo(equipo.id)} disabled={deshabilitado} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${seleccionado ? "border-primary bg-primary-fixed/60" : "border-outline-variant/60 bg-surface-container-lowest hover:border-primary hover:bg-primary-fixed/30"}`}>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${seleccionado ? "border-primary bg-primary text-on-primary" : "border-outline bg-surface-container-lowest text-transparent"}`}>
                              <span className="inline-block h-3.5 w-3.5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-on-surface">{obtenerNombreEquipo(equipo)}</span>

                              {(equipo.genero || equipo.nivel) && <span className="mt-0.5 block text-xs text-on-surface-variant">{[equipo.genero, equipo.nivel].filter(Boolean).join(" · ")}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <aside className="min-w-0 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/60 p-4">
          <div>
            <h3 className="font-bold text-on-surface">Equipos seleccionados</h3>
            <p className="mt-1 text-sm text-on-surface-variant">La fecha y el administrador se guardarán automáticamente.</p>
          </div>

          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">{equiposSeleccionados.length}</span>
        </div>

        {equiposSeleccionadosCompletos.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
            <span className="inline-block h-10 w-10 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
            <p className="mt-3 font-semibold text-on-surface">Ningún equipo seleccionado</p>
            <p className="mt-1 text-sm text-on-surface-variant">Puedes crear el patrocinador sin asignarlo a ningún equipo.</p>
          </div>
        ) : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto p-4">
            {equiposSeleccionadosCompletos.map((equipo) => (
              <article key={equipo.id} className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-fixed/40 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                  <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface">{obtenerNombreEquipo(equipo)}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant">{equipo.categoria ?? "Sin categoría"}</p>
                </div>

                <button type="button" onClick={() => eliminarEquipo(equipo.id)} disabled={deshabilitado} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Eliminar ${obtenerNombreEquipo(equipo)} de la selección`}>
                  <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/cerrar.svg')", WebkitMaskImage: "url('/iconos/panel/cerrar.svg')" }} aria-hidden="true" />
                </button>
              </article>
            ))}

            <button type="button" onClick={() => alCambiar([])} disabled={deshabilitado} className="mt-3 w-full rounded-xl border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-50">
              Quitar todos
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}