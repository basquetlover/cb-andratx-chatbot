import { useEffect, useMemo, useState } from "react";

import type { PatrocinadorListadoPanel, ResultadoPatrocinadoresPanel } from "@tipos/PatrocinadorPanel";

interface Propiedades {
  resultadoInicial: ResultadoPatrocinadoresPanel;
}

type FiltroEstado = "todos" | "activos" | "inactivos";

const PATROCINADORES_POR_PAGINA = 8;

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function obtenerIniciales(patrocinador: PatrocinadorListadoPanel): string {
  const nombre = patrocinador.nombreCorto ?? patrocinador.nombre;

  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join("");
}

function obtenerUrlExterna(url: string): string {
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  return `https://${url}`;
}

function LogotipoPatrocinador({ patrocinador, grande = false }: { patrocinador: PatrocinadorListadoPanel; grande?: boolean }) {
  const tamaño = grande ? "h-14 w-14" : "h-10 w-10";

  return (
    <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-low text-sm font-bold text-primary ${tamaño}`}>
      <span aria-hidden="true">{obtenerIniciales(patrocinador)}</span>

      {patrocinador.logo && (
        <img src={patrocinador.logo} alt="" className="absolute inset-0 h-full w-full bg-surface-container-lowest object-contain p-1" loading="lazy" onError={(evento) => evento.currentTarget.remove()} />
      )}
    </span>
  );
}

function RedesPatrocinador({ patrocinador }: { patrocinador: PatrocinadorListadoPanel }) {
  const redesActivas = patrocinador.redes.filter((red) => red.activo);

  if (!patrocinador.web && redesActivas.length === 0) {
    return <span className="text-sm text-outline">Sin contacto</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {patrocinador.web && (
        <a href={obtenerUrlExterna(patrocinador.web)} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-primary-fixed hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Abrir la web de ${patrocinador.nombre}`}>
          <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/web.svg')", WebkitMaskImage: "url('/iconos/panel/web.svg')" }} aria-hidden="true" />
        </a>
      )}

      {redesActivas.slice(0, 4).map((red) => (
        <a key={red.id} href={obtenerUrlExterna(red.url)} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-primary-fixed hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`${red.nombre} de ${patrocinador.nombre}`}>
          <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: `url('/iconos/redes/${red.icono ?? red.id}.svg')`, WebkitMaskImage: `url('/iconos/redes/${red.icono ?? red.id}.svg')` }} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function EquiposPatrocinados({ patrocinador, maximo = 2 }: { patrocinador: PatrocinadorListadoPanel; maximo?: number }) {
  const equiposVisibles = patrocinador.equipos.slice(0, maximo);
  const equiposRestantes = patrocinador.equipos.length - equiposVisibles.length;

  if (patrocinador.equipos.length === 0) {
    return <span className="text-sm italic text-outline">Ningún equipo</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {equiposVisibles.map((equipo) => (
        <span key={equipo.id} className="rounded-md bg-surface-container px-2 py-1 text-xs font-semibold text-on-surface-variant">
          {equipo.nombreCorto ?? equipo.nombre}
        </span>
      ))}

      {equiposRestantes > 0 && <span className="rounded-md bg-primary-fixed px-2 py-1 text-xs font-bold text-on-primary-fixed-variant">+{equiposRestantes}</span>}
    </div>
  );
}

export default function ListadoPatrocinadores({ resultadoInicial }: Propiedades) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");
  const [paginaActual, setPaginaActual] = useState(1);

  const patrocinadoresFiltrados = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busqueda);

    return resultadoInicial.patrocinadores.filter((patrocinador) => {
      const coincideEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" && patrocinador.activo) ||
        (filtroEstado === "inactivos" && !patrocinador.activo);

      if (!coincideEstado) {
        return false;
      }

      if (!busquedaNormalizada) {
        return true;
      }

      const contenido = [
        patrocinador.nombre,
        patrocinador.nombreCorto,
        patrocinador.descripcion,
        patrocinador.web,
        ...patrocinador.equipos.map((equipo) => equipo.nombre),
        ...patrocinador.equipos.map((equipo) => equipo.nombreCorto),
      ]
        .filter((valor): valor is string => typeof valor === "string")
        .join(" ");

      return normalizarTexto(contenido).includes(busquedaNormalizada);
    });
  }, [busqueda, filtroEstado, resultadoInicial.patrocinadores]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(patrocinadoresFiltrados.length / PATROCINADORES_POR_PAGINA));
  const paginaCorregida = Math.min(paginaActual, totalPaginas);
  const indiceInicial = (paginaCorregida - 1) * PATROCINADORES_POR_PAGINA;
  const patrocinadoresPagina = patrocinadoresFiltrados.slice(indiceInicial, indiceInicial + PATROCINADORES_POR_PAGINA);
  const hayFiltros = busqueda.trim().length > 0 || filtroEstado !== "todos";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("todos");
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/sponsors.svg')", WebkitMaskImage: "url('/iconos/panel/sponsors.svg')" }} aria-hidden="true" />
            </span>

            <span className="text-xs font-semibold text-on-surface-variant">Total</span>
          </div>

          <p className="mt-4 text-sm text-on-surface-variant">Patrocinadores</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{resultadoInicial.totalPatrocinadores}</p>
        </article>

        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-container text-success">
            <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
          </span>

          <p className="mt-4 text-sm text-on-surface-variant">Activos</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{resultadoInicial.patrocinadoresActivos}</p>
        </article>

        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-error-container text-error">
            <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/cerrar.svg')", WebkitMaskImage: "url('/iconos/panel/cerrar.svg')" }} aria-hidden="true" />
          </span>

          <p className="mt-4 text-sm text-on-surface-variant">Inactivos</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{resultadoInicial.patrocinadoresInactivos}</p>
        </article>

        <article className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
            <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
          </span>

          <p className="mt-4 text-sm text-on-surface-variant">Equipos patrocinados</p>
          <p className="mt-1 text-2xl font-bold text-on-surface">{resultadoInicial.equiposPatrocinados}<span className="ml-1 text-sm font-semibold text-on-surface-variant">/ {resultadoInicial.totalEquipos}</span></p>
        </article>
      </div>

      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-outline-variant"></span>
        <span className="inline-block h-5 w-5 bg-tertiary mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/balon.svg')", WebkitMaskImage: "url('/iconos/panel/balon.svg')" }}></span>
        <span className="h-px flex-1 bg-outline-variant"></span>
      </div>

      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar patrocinador</span>
            <span className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/buscar.svg')", WebkitMaskImage: "url('/iconos/panel/buscar.svg')" }} aria-hidden="true" />
            <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar patrocinador o equipo" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>

          <select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as FiltroEstado)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar patrocinadores por estado">
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>

          <button type="button" onClick={limpiarFiltros} disabled={!hayFiltros} className="h-11 rounded-xl border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40">
            Limpiar
          </button>
        </div>
      </div>

      {patrocinadoresPagina.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-5 py-14 text-center shadow-sm">
          <span className="mx-auto inline-block h-12 w-12 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/sponsors.svg')", WebkitMaskImage: "url('/iconos/panel/sponsors.svg')" }} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold text-on-surface">{hayFiltros ? "No hay resultados" : "Todavía no hay patrocinadores"}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-on-surface-variant">{hayFiltros ? "Prueba a cambiar la búsqueda o limpiar los filtros aplicados." : "Crea el primer patrocinador para empezar a asociarlo con los equipos del club."}</p>

          {hayFiltros && (
            <button type="button" onClick={limpiarFiltros} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition-opacity hover:opacity-90">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm md:block">
            <table className="w-full border-collapse">
              <thead className="bg-on-primary-fixed text-on-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Patrocinador</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Equipos patrocinados</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide">Contacto</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/50">
                {patrocinadoresPagina.map((patrocinador) => (
                  <tr key={patrocinador.id} className="transition-colors hover:bg-surface-container-low/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <LogotipoPatrocinador patrocinador={patrocinador} />

                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface">{patrocinador.nombre}</p>
                          {patrocinador.nombreCorto && <p className="mt-0.5 text-xs text-on-surface-variant">{patrocinador.nombreCorto}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${patrocinador.activo ? "border-success/30 bg-success-container text-on-success-container" : "border-error/30 bg-error-container text-on-error-container"}`}>
                        {patrocinador.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="max-w-xs px-4 py-3">
                      <EquiposPatrocinados patrocinador={patrocinador} />
                    </td>

                    <td className="px-4 py-3">
                      <RedesPatrocinador patrocinador={patrocinador} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <a href={`/panel/sponsors/${patrocinador.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary-fixed hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Gestionar ${patrocinador.nombre}`}>
                        <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/editar.svg')", WebkitMaskImage: "url('/iconos/panel/editar.svg')" }} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {patrocinadoresPagina.map((patrocinador) => (
              <article key={patrocinador.id} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <LogotipoPatrocinador patrocinador={patrocinador} grande />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-bold text-on-surface">{patrocinador.nombre}</h2>
                        {patrocinador.nombreCorto && <p className="mt-0.5 text-xs text-on-surface-variant">{patrocinador.nombreCorto}</p>}
                      </div>

                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${patrocinador.activo ? "border-success/30 bg-success-container text-on-success-container" : "border-error/30 bg-error-container text-on-error-container"}`}>
                        {patrocinador.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-outline-variant/50 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Equipos patrocinados</p>
                  <EquiposPatrocinados patrocinador={patrocinador} maximo={4} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant/50 pt-4">
                  <RedesPatrocinador patrocinador={patrocinador} />

                  <a href={`/panel/sponsors/${patrocinador.id}`} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-opacity hover:opacity-90">
                    Gestionar
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {patrocinadoresFiltrados.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 shadow-sm sm:flex-row">
          <p className="text-sm text-on-surface-variant">
            Mostrando <strong className="text-on-surface">{indiceInicial + 1}</strong> a <strong className="text-on-surface">{Math.min(indiceInicial + PATROCINADORES_POR_PAGINA, patrocinadoresFiltrados.length)}</strong> de <strong className="text-on-surface">{patrocinadoresFiltrados.length}</strong>
          </p>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))} disabled={paginaCorregida === 1} className="h-9 rounded-lg border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30">
              Anterior
            </button>

            <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-sm font-bold text-on-primary">{paginaCorregida} / {totalPaginas}</span>

            <button type="button" onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))} disabled={paginaCorregida === totalPaginas} className="h-9 rounded-lg border border-outline-variant px-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}