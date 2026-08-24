import { useMemo, useState } from "react";

import type { EquipoAsignadoUsuario, EquipoDisponiblePanel, NivelAccesoUsuario } from "@tipos/PanelUsuario";

interface Propiedades {
  equipos: EquipoDisponiblePanel[];
  equiposAsignados: EquipoAsignadoUsuario[];
  nivelAcceso: NivelAccesoUsuario;
  cargando: boolean;
  error: string | null;
  alCambiar: (equiposAsignados: EquipoAsignadoUsuario[]) => void;
  alReintentar?: () => void;
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

export default function PasoEquiposUsuario({ equipos, equiposAsignados, nivelAcceso, cargando, error, alCambiar, alReintentar }: Propiedades) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");

  const accesoTodosLosEquipos = nivelAcceso === "todos-equipos" || nivelAcceso === "acceso-total";

  const categorias = useMemo(() => {
    return Array.from(new Set(equipos.map((equipo) => equipo.categoria?.trim()).filter((categoria): categoria is string => Boolean(categoria)))).sort((primeraCategoria, segundaCategoria) => {
      const primeraPosicion = obtenerPosicionCategoria(primeraCategoria);
      const segundaPosicion = obtenerPosicionCategoria(segundaCategoria);

      if (primeraPosicion !== segundaPosicion) {
        return primeraPosicion - segundaPosicion;
      }

      return primeraCategoria.localeCompare(segundaCategoria, "es");
    });
  }, [equipos]);

  const equiposPorCategoria = useMemo<GrupoEquipos[]>(() => {
    const busquedaNormalizada = normalizarTexto(busqueda);
    const grupos = new Map<string, EquipoDisponiblePanel[]>();

    equipos
      .filter((equipo) => {
        const categoria = equipo.categoria?.trim() || "Sin categoría";
        const nombre = equipo.nombre ?? equipo.nombreCorto ?? "";
        const informacionEquipo = normalizarTexto([nombre, equipo.nombreCorto, categoria, equipo.genero, equipo.nivel].filter(Boolean).join(" "));

        const coincideBusqueda = !busquedaNormalizada || informacionEquipo.includes(busquedaNormalizada);
        const coincideCategoria = categoriaSeleccionada === "todas" || categoria === categoriaSeleccionada;

        return coincideBusqueda && coincideCategoria;
      })
      .forEach((equipo) => {
        const categoria = equipo.categoria?.trim() || "Sin categoría";
        const equiposCategoria = grupos.get(categoria) ?? [];

        equiposCategoria.push(equipo);
        grupos.set(categoria, equiposCategoria);
      });

    return Array.from(grupos.entries())
      .map(([categoria, equiposCategoria]) => ({
        categoria,
        equipos: equiposCategoria.sort((primerEquipo, segundoEquipo) => {
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
  }, [equipos, busqueda, categoriaSeleccionada]);

  const obtenerAsignacion = (equipoId: string) => {
    return equiposAsignados.find((asignacion) => asignacion.equipoId === equipoId);
  };

  const alternarEquipo = (equipoId: string) => {
    const asignacionActual = obtenerAsignacion(equipoId);

    if (asignacionActual) {
      const asignacionesRestantes = equiposAsignados.filter((asignacion) => asignacion.equipoId !== equipoId);

      if (asignacionActual.principal && asignacionesRestantes.length > 0) {
        asignacionesRestantes[0] = {
          ...asignacionesRestantes[0],
          principal: true,
        };
      }

      alCambiar(asignacionesRestantes);
      return;
    }

    alCambiar([
      ...equiposAsignados,
      {
        equipoId,
        principal: equiposAsignados.length === 0,
        fechaCaducidad: null,
      },
    ]);
  };

  const establecerEquipoPrincipal = (equipoId: string) => {
    alCambiar(
      equiposAsignados.map((asignacion) => ({
        ...asignacion,
        principal: asignacion.equipoId === equipoId,
      })),
    );
  };

  const actualizarFechaCaducidad = (equipoId: string, fechaCaducidad: string) => {
    alCambiar(
      equiposAsignados.map((asignacion) =>
        asignacion.equipoId === equipoId
          ? {
              ...asignacion,
              fechaCaducidad: fechaCaducidad || null,
            }
          : asignacion,
      ),
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
      <div className="border-b border-outline-variant/60 px-5 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Paso 3 de 4</p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">Equipos asignados</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Selecciona los equipos cuyos datos podrá gestionar este usuario.</p>
          </div>

          <span className="w-max rounded-full bg-primary-fixed px-3 py-1 text-xs font-bold text-on-primary-container">
            {equiposAsignados.length} {equiposAsignados.length === 1 ? "equipo seleccionado" : "equipos seleccionados"}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 lg:p-8">
        {accesoTodosLosEquipos ? (
          <div className="flex items-start gap-4 rounded-xl border border-primary/30 bg-primary-fixed/40 p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
            </span>

            <div>
              <p className="font-bold text-on-primary-container">Acceso a todos los equipos</p>
              <p className="mt-1 text-sm text-on-primary-fixed-variant">El nivel de acceso seleccionado permite gestionar todos los equipos actuales y los que se creen en el futuro. No es necesario realizar una asignación individual.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block">
                <span className="sr-only">Buscar equipos</span>
                <span className="absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/buscar.svg')", WebkitMaskImage: "url('/iconos/panel/buscar.svg')" }} aria-hidden="true" />
                <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre, categoría o nivel" className="h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </label>

              <select value={categoriaSeleccionada} onChange={(evento) => setCategoriaSeleccionada(evento.target.value)} className="h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por categoría">
                <option value="todas">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>

            {cargando && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4" role="status">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden="true" />
                <p className="text-sm text-on-surface-variant">Cargando equipos de la temporada activa...</p>
              </div>
            )}

            {!cargando && error && (
              <div className="mt-5 rounded-xl border border-error/40 bg-error-container p-4" role="alert">
                <p className="font-bold text-on-error-container">No se han podido cargar los equipos</p>
                <p className="mt-1 text-sm text-on-error-container">{error}</p>

                {alReintentar && (
                  <button type="button" onClick={alReintentar} className="mt-3 rounded-lg border border-error px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error hover:text-on-error">
                    Volver a intentarlo
                  </button>
                )}
              </div>
            )}

            {!cargando && !error && equipos.length === 0 && (
              <div className="mt-5 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                <p className="text-sm text-on-surface-variant">No hay equipos activos en la temporada actual.</p>
              </div>
            )}

            {!cargando && !error && equipos.length > 0 && equiposPorCategoria.length === 0 && (
              <div className="mt-5 rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                <p className="font-semibold text-on-surface">No se han encontrado equipos</p>
                <p className="mt-1 text-sm text-on-surface-variant">Prueba con otro término de búsqueda o elimina el filtro de categoría.</p>
              </div>
            )}

            {!cargando && !error && equiposPorCategoria.length > 0 && (
              <div className="mt-6 flex flex-col gap-7">
                {equiposPorCategoria.map((grupo) => (
                  <div key={grupo.categoria}>
                    <div className="mb-3 flex items-center gap-3">
                      <h3 className="shrink-0 text-sm font-bold uppercase tracking-wide text-on-surface">{grupo.categoria}</h3>
                      <span className="h-px flex-1 bg-outline-variant" aria-hidden="true" />
                      <span className="text-xs text-on-surface-variant">{grupo.equipos.length}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {grupo.equipos.map((equipo) => {
                        const asignacion = obtenerAsignacion(equipo.id);
                        const seleccionado = Boolean(asignacion);
                        const informacion = [equipo.genero, equipo.nivel].filter(Boolean).join(" · ");

                        return (
                          <article key={equipo.id} className={`rounded-xl border-2 p-4 transition-colors ${seleccionado ? "border-primary bg-primary-fixed/30" : "border-outline-variant/60 bg-surface-container-lowest hover:border-primary/50"}`}>
                            <div className="flex items-start gap-3">
                              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                <input type="checkbox" checked={seleccionado} onChange={() => alternarEquipo(equipo.id)} className="mt-1 h-5 w-5 shrink-0 rounded border-outline-variant accent-primary" />

                                <span className="min-w-0">
                                  <span className="block font-bold text-on-surface">{equipo.nombre ?? equipo.nombreCorto ?? "Equipo"}</span>
                                  {informacion && <span className="mt-0.5 block text-sm text-on-surface-variant">{informacion}</span>}
                                </span>
                              </label>

                              {seleccionado && (
                                <button type="button" onClick={() => establecerEquipoPrincipal(equipo.id)} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${asignacion?.principal ? "border-tertiary bg-tertiary-fixed text-tertiary" : "border-outline-variant text-outline hover:border-tertiary hover:text-tertiary"}`} aria-label={asignacion?.principal ? `${equipo.nombre} es el equipo principal` : `Marcar ${equipo.nombre} como equipo principal`} title={asignacion?.principal ? "Equipo principal" : "Marcar como principal"}>
                                  <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/panel/${asignacion?.principal ? "estrella-rellena" : "estrella"}.svg')`, WebkitMaskImage: `url('/iconos/panel/${asignacion?.principal ? "estrella-rellena" : "estrella"}.svg')` }} aria-hidden="true" />
                                </button>
                              )}
                            </div>

                            {seleccionado && (
                              <div className="mt-4 border-t border-outline-variant/60 pt-4">
                                <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                  <span className="text-xs font-semibold text-on-surface-variant">Acceso válido hasta</span>
                                  <input type="date" value={asignacion?.fechaCaducidad ?? ""} onChange={(evento) => actualizarFechaCaducidad(equipo.id, evento.target.value)} min={new Date().toISOString().slice(0, 10)} className="h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                                </label>

                                <p className="mt-1 text-xs text-on-surface-variant">Déjalo vacío si el acceso no debe caducar.</p>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}