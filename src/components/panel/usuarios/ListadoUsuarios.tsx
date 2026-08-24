import { useEffect, useMemo, useState } from "react";

import type { UsuarioListadoPanel } from "@tipos/UsuarioPanel";

interface Propiedades {
  usuariosIniciales: UsuarioListadoPanel[];
  errorInicial: string | null;
}

type EstadoUsuario = "todos" | UsuarioListadoPanel["estado"];

const USUARIOS_POR_PAGINA = 10;

const etiquetasEstado: Record<UsuarioListadoPanel["estado"], string> = {
  activo: "Activo",
  pendiente: "Pendiente",
  bloqueado: "Bloqueado",
  desactivado: "Desactivado",
};

const clasesEstado: Record<UsuarioListadoPanel["estado"], string> = {
  activo: "bg-success-container text-on-success-container",
  pendiente: "bg-tertiary-fixed text-on-tertiary-fixed",
  bloqueado: "bg-error-container text-on-error-container",
  desactivado: "bg-surface-container-high text-on-surface-variant",
};

function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function capitalizar(texto: string): string {
  if (!texto) {
    return texto;
  }

  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function obtenerIniciales(usuario: UsuarioListadoPanel): string {
  const inicialNombre = usuario.nombre.trim().charAt(0).toUpperCase();
  const inicialApellido = usuario.apellidos?.trim().charAt(0).toUpperCase() ?? "";

  return `${inicialNombre}${inicialApellido}` || "CB";
}

function formatearUltimoAcceso(fecha: string | null): string {
  if (!fecha) {
    return "Nunca";
  }

  const fechaAcceso = new Date(fecha);

  if (Number.isNaN(fechaAcceso.getTime())) {
    return "Sin información";
  }

  const zonaHoraria = "Europe/Madrid";

  const fechaAccesoCorta = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: zonaHoraria,
  }).format(fechaAcceso);

  const fechaActualCorta = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: zonaHoraria,
  }).format(new Date());

  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zonaHoraria,
  }).format(fechaAcceso);

  if (fechaAccesoCorta === fechaActualCorta) {
    return `Hoy, ${hora}`;
  }

  return `${fechaAccesoCorta}, ${hora}`;
}

function EstadoUsuarioBadge({ estado }: { estado: UsuarioListadoPanel["estado"] }) {
  return (
    <span className={`inline-flex w-max items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${clasesEstado[estado]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {etiquetasEstado[estado]}
    </span>
  );
}

function AvatarUsuario({ usuario, tamaño = "normal" }: { usuario: UsuarioListadoPanel; tamaño?: "normal" | "pequeño" }) {
  const clasesTamaño = tamaño === "pequeño" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

  if (usuario.imagen) {
    return <img src={usuario.imagen} alt="" className={`${clasesTamaño} shrink-0 rounded-full border border-outline-variant/60 object-cover`} />;
  }

  return <span className={`${clasesTamaño} flex shrink-0 items-center justify-center rounded-full bg-primary-fixed font-bold text-on-primary-fixed`}>{obtenerIniciales(usuario)}</span>;
}

function EquiposUsuario({ usuario, maximo = 2 }: { usuario: UsuarioListadoPanel; maximo?: number }) {
  if (usuario.accesoTodosEquipos) {
    return (
      <span className="inline-flex w-max items-center gap-1.5 rounded-md bg-primary-fixed px-2.5 py-1 text-xs font-bold text-on-primary-fixed">
        <span className="inline-block h-3.5 w-3.5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/equipos.svg')", WebkitMaskImage: "url('/iconos/panel/equipos.svg')" }} aria-hidden="true" />
        Todos los equipos
      </span>
    );
  }

  if (usuario.equipos.length === 0) {
    return <span className="text-sm text-outline">Sin equipos asignados</span>;
  }

  const equiposVisibles = usuario.equipos.slice(0, maximo);
  const equiposRestantes = usuario.equipos.length - equiposVisibles.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {equiposVisibles.map((equipo) => (
        <span key={equipo.id} className="rounded-md bg-surface-container-high px-2 py-1 text-xs font-semibold text-on-surface-variant">{equipo.nombre}</span>
      ))}

      {equiposRestantes > 0 && <span className="rounded-md bg-primary-fixed px-2 py-1 text-xs font-bold text-on-primary-fixed">+{equiposRestantes}</span>}
    </div>
  );
}

export default function ListadoUsuarios({ usuariosIniciales, errorInicial }: Propiedades) {
  const [busqueda, setBusqueda] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("todos");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoUsuario>("todos");
  const [paginaActual, setPaginaActual] = useState(1);

  const tiposUsuario = useMemo(() => {
    return Array.from(new Set(usuariosIniciales.map((usuario) => usuario.tipoUsuario).filter(Boolean))).sort((primerTipo, segundoTipo) => primerTipo.localeCompare(segundoTipo, "es"));
  }, [usuariosIniciales]);

  const usuariosFiltrados = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busqueda);

    return usuariosIniciales.filter((usuario) => {
      const coincideTipo = tipoSeleccionado === "todos" || usuario.tipoUsuario === tipoSeleccionado;
      const coincideEstado = estadoSeleccionado === "todos" || usuario.estado === estadoSeleccionado;

      if (!coincideTipo || !coincideEstado) {
        return false;
      }

      if (!busquedaNormalizada) {
        return true;
      }

      const contenidoBusqueda = normalizarTexto(
        [
          usuario.nombreCompleto,
          usuario.email,
          usuario.telefono,
          usuario.cargo,
          usuario.tipoUsuario,
          ...usuario.equipos.map((equipo) => equipo.nombre),
        ]
          .filter(Boolean)
          .join(" "),
      );

      return contenidoBusqueda.includes(busquedaNormalizada);
    });
  }, [usuariosIniciales, busqueda, tipoSeleccionado, estadoSeleccionado]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / USUARIOS_POR_PAGINA));

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const usuariosPagina = useMemo(() => {
    const indiceInicio = (paginaActual - 1) * USUARIOS_POR_PAGINA;

    return usuariosFiltrados.slice(indiceInicio, indiceInicio + USUARIOS_POR_PAGINA);
  }, [usuariosFiltrados, paginaActual]);

  const primerUsuarioMostrado = usuariosFiltrados.length === 0 ? 0 : (paginaActual - 1) * USUARIOS_POR_PAGINA + 1;
  const ultimoUsuarioMostrado = Math.min(paginaActual * USUARIOS_POR_PAGINA, usuariosFiltrados.length);
  const hayFiltros = busqueda.trim() !== "" || tipoSeleccionado !== "todos" || estadoSeleccionado !== "todos";

  const actualizarBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };

  const actualizarTipo = (valor: string) => {
    setTipoSeleccionado(valor);
    setPaginaActual(1);
  };

  const actualizarEstado = (valor: EstadoUsuario) => {
    setEstadoSeleccionado(valor);
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setTipoSeleccionado("todos");
    setEstadoSeleccionado("todos");
    setPaginaActual(1);
  };

  if (errorInicial) {
    return (
      <section className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container" role="alert">
        <p className="font-bold">No se han podido cargar los usuarios</p>
        <p className="mt-1 text-sm">{errorInicial}</p>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <a href="/panel/usuarios/nuevo" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-on-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/añadir-usuario.svg')", WebkitMaskImage: "url('/iconos/panel/añadir-usuario.svg')" }} aria-hidden="true" />
          Crear usuario
        </a>
      </div>

      <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3" aria-hidden="true">
        <span className="h-px bg-outline-variant" />
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
          <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/balon.svg')", WebkitMaskImage: "url('/iconos/panel/balon.svg')" }} />
        </span>
        <span className="h-px bg-outline-variant" />
      </div>

      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
          <label className="relative block">
            <span className="sr-only">Buscar usuarios</span>
            <span className="pointer-events-none absolute left-3 top-1/2 inline-block h-5 w-5 -translate-y-1/2 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/buscar.svg')", WebkitMaskImage: "url('/iconos/panel/buscar.svg')" }} aria-hidden="true" />
            <input type="search" value={busqueda} onChange={(evento) => actualizarBusqueda(evento.target.value)} placeholder="Buscar por nombre, correo o equipo" className="h-11 w-full rounded-xl border border-outline-variant bg-surface-container-lowest pl-10 pr-4 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>

          <select value={tipoSeleccionado} onChange={(evento) => actualizarTipo(evento.target.value)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por tipo de usuario">
            <option value="todos">Todos los tipos</option>

            {tiposUsuario.map((tipo) => (
              <option key={tipo} value={tipo}>{capitalizar(tipo)}</option>
            ))}
          </select>

          <select value={estadoSeleccionado} onChange={(evento) => actualizarEstado(evento.target.value as EstadoUsuario)} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="pendiente">Pendiente</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="desactivado">Desactivado</option>
          </select>

          <button type="button" onClick={limpiarFiltros} disabled={!hayFiltros} className="h-11 rounded-xl border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-35">
            Limpiar
          </button>
        </div>
      </div>

      {usuariosFiltrados.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-6 py-12 text-center shadow-sm">
          <span className="mx-auto inline-block h-12 w-12 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/usuarios.svg')", WebkitMaskImage: "url('/iconos/panel/usuarios.svg')" }} aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold text-on-surface">{hayFiltros ? "No hay usuarios que coincidan" : "Todavía no hay usuarios"}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{hayFiltros ? "Prueba a cambiar o limpiar los filtros." : "Crea el primer usuario para empezar a gestionar el panel."}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm lg:block">
            <table className="w-full border-collapse">
              <thead className="bg-on-primary-fixed text-left text-xs font-bold uppercase tracking-wide text-on-primary">
                <tr>
                  <th className="px-4 py-4">Nombre</th>
                  <th className="px-4 py-4">Correo</th>
                  <th className="px-4 py-4">Cargo</th>
                  <th className="px-4 py-4">Estado</th>
                  <th className="px-4 py-4">Equipos asignados</th>
                  <th className="px-4 py-4">Último acceso</th>
                  <th className="w-14 px-4 py-4"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/60">
                {usuariosPagina.map((usuario) => (
                  <tr key={usuario.id} className="transition-colors hover:bg-surface-container-low">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <AvatarUsuario usuario={usuario} tamaño="pequeño" />
                        <span className="font-semibold text-on-surface">{usuario.nombreCompleto}</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-on-surface-variant">{usuario.email}</td>
                    <td className="px-4 py-4 text-sm text-on-surface">{usuario.cargo ?? "Sin especificar"}</td>
                    <td className="px-4 py-4"><EstadoUsuarioBadge estado={usuario.estado} /></td>
                    <td className="px-4 py-4"><EquiposUsuario usuario={usuario} /></td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant">{formatearUltimoAcceso(usuario.ultimoAccesoAt)}</td>

                    <td className="px-4 py-4">
                      <a href={`/panel/usuarios/${usuario.id}`} className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-primary-fixed hover:text-primary" aria-label={`Gestionar a ${usuario.nombreCompleto}`}>
                        <span className="inline-block h-5 w-5 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/siguiente.svg')", WebkitMaskImage: "url('/iconos/panel/siguiente.svg')" }} aria-hidden="true" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 lg:hidden">
            {usuariosPagina.map((usuario) => (
              <article key={usuario.id} className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AvatarUsuario usuario={usuario} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-on-surface">{usuario.nombreCompleto}</h2>
                        <p className="mt-0.5 truncate text-sm text-on-surface-variant">{usuario.email}</p>
                      </div>

                      <EstadoUsuarioBadge estado={usuario.estado} />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-on-surface">{usuario.cargo ?? "Sin cargo especificado"}</p>
                  </div>
                </div>

                <div className="mt-4 border-t border-outline-variant/60 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant">Equipos asignados</p>
                  <EquiposUsuario usuario={usuario} maximo={3} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-outline-variant/60 pt-4">
                  <span className="text-xs text-on-surface-variant">Último acceso: {formatearUltimoAcceso(usuario.ultimoAccesoAt)}</span>

                  <a href={`/panel/usuarios/${usuario.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-fixed px-4 py-2 text-sm font-bold text-on-primary-fixed transition-colors hover:bg-primary hover:text-on-primary">
                    Gestionar
                    <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/siguiente.svg')", WebkitMaskImage: "url('/iconos/panel/siguiente.svg')" }} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>

          <footer className="mt-4 flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">
              Mostrando <strong className="text-on-surface">{primerUsuarioMostrado}</strong> a <strong className="text-on-surface">{ultimoUsuarioMostrado}</strong> de <strong className="text-on-surface">{usuariosFiltrados.length}</strong> usuarios
            </p>

            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPaginaActual((pagina) => Math.max(1, pagina - 1))} disabled={paginaActual === 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35" aria-label="Página anterior">
                <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/volver.svg')", WebkitMaskImage: "url('/iconos/panel/volver.svg')" }} aria-hidden="true" />
              </button>

              <span className="min-w-20 text-center text-sm font-semibold text-on-surface">{paginaActual} de {totalPaginas}</span>

              <button type="button" onClick={() => setPaginaActual((pagina) => Math.min(totalPaginas, pagina + 1))} disabled={paginaActual === totalPaginas} className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35" aria-label="Página siguiente">
                <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/siguiente.svg')", WebkitMaskImage: "url('/iconos/panel/siguiente.svg')" }} aria-hidden="true" />
              </button>
            </div>
          </footer>
        </>
      )}
    </section>
  );
}