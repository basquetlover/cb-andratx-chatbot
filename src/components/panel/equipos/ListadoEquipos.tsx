import { useMemo, useState, type CSSProperties } from "react";

import type { EquipoListadoPanel, ResultadoEquiposPanel } from "@tipos/EquipoPanel";

interface Propiedades {
  resultadoInicial: ResultadoEquiposPanel;
  puedeCrear: boolean;
}

type OrdenCategorias = "ascendente" | "descendente";
type EstadoFiltro = "todos" | "activos" | "inactivos";
type ChatbotFiltro = "todos" | "disponibles" | "no-disponibles";

const ordenCategoriasBase = [
  "escoleta",
  "iniciacion",
  "premini",
  "mini",
  "infantil",
  "cadete",
  "junior",
  "senior",
  "+40",
  "veteranos",
];

function normalizarTexto(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function obtenerPosicionCategoria(categoria: string | null): number {
  const categoriaNormalizada = normalizarTexto(categoria);

  const posicion = ordenCategoriasBase.findIndex((nombreCategoria) => categoriaNormalizada.includes(nombreCategoria));

  return posicion === -1 ? ordenCategoriasBase.length : posicion;
}

function obtenerIniciales(equipo: EquipoListadoPanel): string {
  const nombre = equipo.nombreCorto?.trim() || equipo.nombre.trim();

  const palabras = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return palabras
    .map((palabra) => palabra.charAt(0))
    .join("")
    .toUpperCase();
}

function IconoPanel({ nombre, className = "h-5 w-5" }: { nombre: string; className?: string }) {
  const estilo = {
    maskImage: `url('/iconos/panel/${nombre}.svg')`,
    WebkitMaskImage: `url('/iconos/panel/${nombre}.svg')`,
  } as CSSProperties;

  return <span className={`inline-block shrink-0 bg-current mask-center mask-contain mask-no-repeat ${className}`} style={estilo} aria-hidden="true" />;
}

function EstadoEquipo({ activo }: { activo: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${activo ? "border-success/30 bg-success-container text-on-success-container" : "border-outline-variant bg-surface-container text-on-surface-variant"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${activo ? "bg-success" : "bg-outline"}`} aria-hidden="true" />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function LogosPatrocinadores({ equipo }: { equipo: EquipoListadoPanel }) {
  if (equipo.patrocinadores.length === 0) {
    return <span className="text-xs italic text-outline">Ninguno</span>;
  }

  const visibles = equipo.patrocinadores.slice(0, 3);
  const restantes = equipo.patrocinadores.length - visibles.length;

  return (
    <div className="flex items-center">
      {visibles.map((patrocinador, indice) => (
        <span key={patrocinador.id} className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-surface-container-lowest bg-surface-container text-[10px] font-bold text-primary" style={{ marginLeft: indice === 0 ? 0 : -8 }} title={patrocinador.nombre}>
          {patrocinador.nombre.charAt(0).toUpperCase()}
          {patrocinador.logo && <img src={patrocinador.logo} alt="" className="absolute inset-0 h-full w-full bg-white object-contain p-1" loading="lazy" />}
        </span>
      ))}

      {restantes > 0 && <span className="-ml-2 flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-surface-container-lowest bg-primary-fixed px-1.5 text-[10px] font-bold text-on-primary-container">+{restantes}</span>}
    </div>
  );
}

export default function ListadoEquipos({ resultadoInicial, puedeCrear }: Propiedades) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("todas");
  const [generoSeleccionado, setGeneroSeleccionado] = useState("todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoFiltro>("todos");
  const [chatbotSeleccionado, setChatbotSeleccionado] = useState<ChatbotFiltro>("todos");
  const [ordenCategorias, setOrdenCategorias] = useState<OrdenCategorias>("ascendente");

  const categorias = useMemo(() => {
    return Array.from(new Set(resultadoInicial.equipos.map((equipo) => equipo.categoria?.trim()).filter((categoria): categoria is string => Boolean(categoria)))).sort((primeraCategoria, segundaCategoria) => {
      const primeraPosicion = obtenerPosicionCategoria(primeraCategoria);
      const segundaPosicion = obtenerPosicionCategoria(segundaCategoria);

      if (primeraPosicion !== segundaPosicion) {
        return primeraPosicion - segundaPosicion;
      }

      return primeraCategoria.localeCompare(segundaCategoria, "es");
    });
  }, [resultadoInicial.equipos]);

  const generos = useMemo(() => {
    return Array.from(new Set(resultadoInicial.equipos.map((equipo) => equipo.genero?.trim()).filter((genero): genero is string => Boolean(genero)))).sort((primerGenero, segundoGenero) => primerGenero.localeCompare(segundoGenero, "es"));
  }, [resultadoInicial.equipos]);

  const equiposFiltrados = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busqueda);

    return resultadoInicial.equipos
      .filter((equipo) => {
        if (!busquedaNormalizada) {
          return true;
        }

        const contenido = normalizarTexto([equipo.nombre, equipo.nombreCorto, equipo.categoria, equipo.genero, equipo.nivel].filter(Boolean).join(" "));

        return contenido.includes(busquedaNormalizada);
      })
      .filter((equipo) => categoriaSeleccionada === "todas" || equipo.categoria === categoriaSeleccionada)
      .filter((equipo) => generoSeleccionado === "todos" || equipo.genero === generoSeleccionado)
      .filter((equipo) => {
        if (estadoSeleccionado === "activos") {
          return equipo.activo;
        }

        if (estadoSeleccionado === "inactivos") {
          return !equipo.activo;
        }

        return true;
      })
      .filter((equipo) => {
        if (chatbotSeleccionado === "disponibles") {
          return equipo.chatbot;
        }

        if (chatbotSeleccionado === "no-disponibles") {
          return !equipo.chatbot;
        }

        return true;
      })
      .sort((primerEquipo, segundoEquipo) => {
        const primeraPosicion = obtenerPosicionCategoria(primerEquipo.categoria);
        const segundaPosicion = obtenerPosicionCategoria(segundoEquipo.categoria);
        const diferenciaCategoria = primeraPosicion - segundaPosicion;

        if (diferenciaCategoria !== 0) {
          return ordenCategorias === "ascendente" ? diferenciaCategoria : -diferenciaCategoria;
        }

        const diferenciaNombreCategoria = (primerEquipo.categoria ?? "").localeCompare(segundoEquipo.categoria ?? "", "es");

        if (diferenciaNombreCategoria !== 0) {
          return ordenCategorias === "ascendente" ? diferenciaNombreCategoria : -diferenciaNombreCategoria;
        }

        return primerEquipo.nombre.localeCompare(segundoEquipo.nombre, "es");
      });
  }, [resultadoInicial.equipos, busqueda, categoriaSeleccionada, generoSeleccionado, estadoSeleccionado, chatbotSeleccionado, ordenCategorias]);

  const hayFiltros = busqueda !== "" || categoriaSeleccionada !== "todas" || generoSeleccionado !== "todos" || estadoSeleccionado !== "todos" || chatbotSeleccionado !== "todos" || ordenCategorias !== "ascendente";

  const limpiarFiltros = () => {
    setBusqueda("");
    setCategoriaSeleccionada("todas");
    setGeneroSeleccionado("todos");
    setEstadoSeleccionado("todos");
    setChatbotSeleccionado("todos");
    setOrdenCategorias("ascendente");
  };

  const tarjetasResumen = [
    {
      nombre: "Total de equipos",
      valor: resultadoInicial.resumen.total,
      descripcion: resultadoInicial.temporada?.nombre ?? "Temporada activa",
      icono: "equipos",
      color: "text-primary",
      fondo: "bg-primary-fixed",
    },
    {
      nombre: "Equipos activos",
      valor: resultadoInicial.resumen.activos,
      descripcion: `${resultadoInicial.resumen.total - resultadoInicial.resumen.activos} inactivos`,
      icono: "correcto",
      color: "text-success",
      fondo: "bg-success-container",
    },
    {
      nombre: "Disponibles en asistente",
      valor: resultadoInicial.resumen.disponiblesChatbot,
      descripcion: `${resultadoInicial.resumen.sinConfigurarChatbot} pendientes`,
      icono: "bot",
      color: "text-secondary",
      fondo: "bg-secondary-fixed",
    },
    {
      nombre: "Con entrenamientos",
      valor: resultadoInicial.resumen.conEntrenamientos,
      descripcion: `${resultadoInicial.resumen.sinEntrenamientos} sin horario`,
      icono: "entrenamientos",
      color: "text-tertiary",
      fondo: "bg-tertiary-fixed",
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">{resultadoInicial.temporada?.nombre ?? "Sin temporada activa"}</p>
          <h2 className="mt-1 text-2xl font-bold text-on-surface sm:text-3xl">Equipos del club</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Gestiona los equipos, sus entrenamientos, patrocinadores e integraciones.</p>
        </div>

        {puedeCrear && (
          <a href="/panel/equipos/nuevo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-on-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <IconoPanel nombre="mas" />
            Crear equipo
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetasResumen.map((tarjeta) => (
          <article key={tarjeta.nombre} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tarjeta.fondo} ${tarjeta.color}`}>
                <IconoPanel nombre={tarjeta.icono} />
              </span>

              <span className="text-2xl font-bold text-on-surface sm:text-3xl">{tarjeta.valor}</span>
            </div>

            <p className="mt-4 text-sm font-bold text-on-surface">{tarjeta.nombre}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{tarjeta.descripcion}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_160px_150px_180px_140px_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar un equipo</span>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              <IconoPanel nombre="buscar" />
            </span>
            <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar por nombre, categoría..." className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>

          <select value={categoriaSeleccionada} onChange={(evento) => setCategoriaSeleccionada(evento.target.value)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por categoría">
            <option value="todas">Todas las categorías</option>
            {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
          </select>

          <select value={generoSeleccionado} onChange={(evento) => setGeneroSeleccionado(evento.target.value)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por género">
            <option value="todos">Todos los géneros</option>
            {generos.map((genero) => <option key={genero} value={genero}>{genero}</option>)}
          </select>

          <select value={estadoSeleccionado} onChange={(evento) => setEstadoSeleccionado(evento.target.value as EstadoFiltro)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>

          <select value={chatbotSeleccionado} onChange={(evento) => setChatbotSeleccionado(evento.target.value as ChatbotFiltro)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por asistente">
            <option value="todos">Todos en asistente</option>
            <option value="disponibles">Disponibles</option>
            <option value="no-disponibles">No disponibles</option>
          </select>

          <select value={ordenCategorias} onChange={(evento) => setOrdenCategorias(evento.target.value as OrdenCategorias)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Orden de categorías">
            <option value="ascendente">Ascendente</option>
            <option value="descendente">Descendente</option>
          </select>

          <button type="button" onClick={limpiarFiltros} disabled={!hayFiltros} className="h-11 rounded-xl border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:border-outline-variant disabled:text-outline disabled:opacity-50">
            Limpiar
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-on-surface-variant">
          Mostrando <strong className="text-on-surface">{equiposFiltrados.length}</strong> de <strong className="text-on-surface">{resultadoInicial.equipos.length}</strong> equipos
        </p>
      </div>

      {equiposFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-outline">
            <IconoPanel nombre="buscar" className="h-7 w-7" />
          </span>
          <p className="mt-4 font-bold text-on-surface">No se han encontrado equipos</p>
          <p className="mt-1 text-sm text-on-surface-variant">Prueba a cambiar o limpiar los filtros aplicados.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm lg:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-on-primary-fixed text-on-primary">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Equipo</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Categoría</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Género / nivel</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Asistente</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Entrenos</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide">Sponsors</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/50">
                {equiposFiltrados.map((equipo) => (
                  <tr key={equipo.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-fixed text-sm font-bold text-on-primary-container">
                          {obtenerIniciales(equipo)}
                          {equipo.imagen && <img src={equipo.imagen} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
                        </span>

                        <div className="min-w-0">
                          <a href={`/panel/equipos/${equipo.id}`} className="font-bold text-on-surface hover:text-primary hover:underline">{equipo.nombre}</a>
                          {equipo.nombreCorto && <p className="mt-0.5 text-xs text-on-surface-variant">{equipo.nombreCorto}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-on-surface">{equipo.categoria ?? "Sin categoría"}</td>

                    <td className="px-4 py-3">
                      <p className="text-sm text-on-surface">{equipo.genero ?? "Sin definir"}</p>
                      {equipo.nivel && <p className="mt-0.5 text-xs text-on-surface-variant">{equipo.nivel}</p>}
                    </td>

                    <td className="px-4 py-3"><EstadoEquipo activo={equipo.activo} /></td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 text-sm font-semibold ${equipo.chatbot ? "text-success" : "text-outline"}`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${equipo.chatbot ? "bg-success" : "bg-outline-variant"}`} />
                        {equipo.chatbot ? "Disponible" : "No"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-bold text-on-surface">{equipo.entrenamientosSemana}</span>
                      <span className="ml-1 text-xs text-on-surface-variant">/sem.</span>
                    </td>

                    <td className="px-4 py-3"><LogosPatrocinadores equipo={equipo} /></td>

                    <td className="px-4 py-3 text-right">
                      <a href={`/panel/equipos/${equipo.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-colors hover:bg-primary-fixed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Editar ${equipo.nombre}`}>
                        <IconoPanel nombre="editar" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {equiposFiltrados.map((equipo) => (
              <article key={equipo.id} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-fixed font-bold text-on-primary-container">
                    {obtenerIniciales(equipo)}
                    {equipo.imagen && <img src={equipo.imagen} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <a href={`/panel/equipos/${equipo.id}`} className="font-bold text-on-surface hover:text-primary">{equipo.nombre}</a>
                    <p className="mt-0.5 text-sm text-on-surface-variant">{[equipo.categoria, equipo.genero, equipo.nivel].filter(Boolean).join(" · ") || "Información pendiente"}</p>
                  </div>

                  <EstadoEquipo activo={equipo.activo} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-y border-outline-variant/50 py-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-on-surface">{equipo.entrenamientosSemana}</p>
                    <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Entrenos</p>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-on-surface">{equipo.totalPatrocinadores}</p>
                    <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Sponsors</p>
                  </div>

                  <div>
                    <p className={`text-sm font-bold ${equipo.chatbot ? "text-success" : "text-outline"}`}>{equipo.chatbot ? "Sí" : "No"}</p>
                    <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">Asistente</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <LogosPatrocinadores equipo={equipo} />

                  <a href={`/panel/equipos/${equipo.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary">
                    Editar
                    <IconoPanel nombre="editar" className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}