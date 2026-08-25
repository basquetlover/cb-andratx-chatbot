import type { RedSocialPatrocinador } from "@tipos/PatrocinadorPanel";

interface Propiedades {
  redes: RedSocialPatrocinador[];
  alCambiar: (redes: RedSocialPatrocinador[]) => void;
  deshabilitado?: boolean;
}

interface PlataformaDisponible {
  id: string;
  nombre: string;
  icono: string;
  placeholderUsuario: string;
  placeholderUrl: string;
}

const plataformas: PlataformaDisponible[] = [
  {
    id: "instagram",
    nombre: "Instagram",
    icono: "instagram",
    placeholderUsuario: "@usuario",
    placeholderUrl: "https://www.instagram.com/usuario",
  },
  {
    id: "facebook",
    nombre: "Facebook",
    icono: "facebook",
    placeholderUsuario: "Nombre de la página",
    placeholderUrl: "https://www.facebook.com/pagina",
  },
  {
    id: "youtube",
    nombre: "YouTube",
    icono: "youtube",
    placeholderUsuario: "@canal",
    placeholderUrl: "https://www.youtube.com/@canal",
  },
  {
    id: "tiktok",
    nombre: "TikTok",
    icono: "tiktok",
    placeholderUsuario: "@usuario",
    placeholderUrl: "https://www.tiktok.com/@usuario",
  },
  {
    id: "x",
    nombre: "X (Twitter)",
    icono: "x",
    placeholderUsuario: "@usuario",
    placeholderUrl: "https://x.com/usuario",
  },
];

function obtenerPlataforma(id: string): PlataformaDisponible | null {
  return plataformas.find((plataforma) => plataforma.id === id) ?? null;
}

function normalizarOrden(redes: RedSocialPatrocinador[]): RedSocialPatrocinador[] {
  return redes.map((red, indice) => ({
    ...red,
    orden: indice + 1,
  }));
}

function urlValida(url: string): boolean {
  if (!url.trim()) {
    return true;
  }

  try {
    const urlConvertida = new URL(url);

    return urlConvertida.protocol === "https:" || urlConvertida.protocol === "http:";
  } catch {
    return false;
  }
}

export default function RedesPatrocinador({ redes, alCambiar, deshabilitado = false }: Propiedades) {
  const plataformasUtilizadas = new Set(redes.map((red) => red.id));

  const añadirRed = () => {
    if (deshabilitado) {
      return;
    }

    const plataforma = plataformas.find((opcion) => !plataformasUtilizadas.has(opcion.id));

    if (!plataforma) {
      return;
    }

    alCambiar([
      ...redes,
      {
        id: plataforma.id,
        nombre: plataforma.nombre,
        usuario: null,
        url: "",
        icono: plataforma.icono,
        activo: true,
        orden: redes.length + 1,
      },
    ]);
  };

  const actualizarRed = (indice: number, cambios: Partial<RedSocialPatrocinador>) => {
    if (deshabilitado) {
      return;
    }

    alCambiar(
      redes.map((red, posicion) =>
        posicion === indice
          ? {
              ...red,
              ...cambios,
            }
          : red,
      ),
    );
  };

  const cambiarPlataforma = (indice: number, plataformaId: string) => {
    const plataforma = obtenerPlataforma(plataformaId);

    if (!plataforma) {
      return;
    }

    actualizarRed(indice, {
      id: plataforma.id,
      nombre: plataforma.nombre,
      icono: plataforma.icono,
    });
  };

  const eliminarRed = (indice: number) => {
    if (deshabilitado) {
      return;
    }

    alCambiar(normalizarOrden(redes.filter((_, posicion) => posicion !== indice)));
  };

  const moverRed = (indice: number, direccion: -1 | 1) => {
    const nuevoIndice = indice + direccion;

    if (deshabilitado || nuevoIndice < 0 || nuevoIndice >= redes.length) {
      return;
    }

    const nuevasRedes = [...redes];
    const redMovida = nuevasRedes[indice];

    nuevasRedes[indice] = nuevasRedes[nuevoIndice];
    nuevasRedes[nuevoIndice] = redMovida;

    alCambiar(normalizarOrden(nuevasRedes));
  };

  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 p-4">
        <div>
          <h3 className="font-bold text-on-surface">Redes sociales</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Añade los perfiles públicos del patrocinador.</p>
        </div>

        <button type="button" onClick={añadirRed} disabled={deshabilitado || redes.length >= plataformas.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-not-allowed disabled:opacity-40">
          <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/mas.svg')", WebkitMaskImage: "url('/iconos/panel/mas.svg')" }} aria-hidden="true" />
          Añadir red
        </button>
      </div>

      {redes.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center p-6 text-center">
          <span className="inline-block h-10 w-10 bg-outline mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/web.svg')", WebkitMaskImage: "url('/iconos/panel/web.svg')" }} aria-hidden="true" />
          <p className="mt-3 font-semibold text-on-surface">No hay redes sociales añadidas</p>
          <p className="mt-1 max-w-sm text-sm text-on-surface-variant">Este apartado es opcional. Puedes añadir las redes del patrocinador ahora o más adelante.</p>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {redes.map((red, indice) => {
            const plataformaActual = obtenerPlataforma(red.id);
            const esUrlValida = urlValida(red.url);

            return (
              <article key={`${red.id}-${indice}`} className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
                <div className="flex items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${red.activo ? "bg-primary-fixed text-primary" : "bg-surface-container text-outline"}`}>
                    <img src={`/iconos/redes/${red.icono ?? red.id}.svg`} className="inline-block h-6 w-6 mask-center mask-contain mask-no-repeat"  />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-on-surface">{red.nombre}</p>
                        <p className="mt-0.5 text-xs text-on-surface-variant">Posición {indice + 1}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moverRed(indice, -1)} disabled={deshabilitado || indice === 0} className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Subir ${red.nombre}`}>
                          <span className="inline-block h-4 w-4 rotate-90 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/volver.svg')", WebkitMaskImage: "url('/iconos/panel/volver.svg')" }} aria-hidden="true" />
                        </button>

                        <button type="button" onClick={() => moverRed(indice, 1)} disabled={deshabilitado || indice === redes.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Bajar ${red.nombre}`}>
                          <span className="inline-block h-4 w-4 -rotate-90 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/volver.svg')", WebkitMaskImage: "url('/iconos/panel/volver.svg')" }} aria-hidden="true" />
                        </button>

                        <button type="button" onClick={() => eliminarRed(indice)} disabled={deshabilitado} className="flex h-8 w-8 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Eliminar ${red.nombre}`}>
                          <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat" style={{ maskImage: "url('/iconos/panel/eliminar.svg')", WebkitMaskImage: "url('/iconos/panel/eliminar.svg')" }} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-on-surface">Plataforma</span>

                        <select value={red.id} onChange={(evento) => cambiarPlataforma(indice, evento.target.value)} disabled={deshabilitado} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50">
                          {plataformas.map((plataforma) => (
                            <option key={plataforma.id} value={plataforma.id} disabled={plataforma.id !== red.id && plataformasUtilizadas.has(plataforma.id)}>{plataforma.nombre}</option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-on-surface">Usuario o nombre</span>

                        <input type="text" value={red.usuario ?? ""} onChange={(evento) => actualizarRed(indice, { usuario: evento.target.value || null })} disabled={deshabilitado} maxLength={100} placeholder={plataformaActual?.placeholderUsuario ?? "Usuario"} className="h-11 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50" />
                      </label>

                      <label className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-on-surface">URL</span>

                        <input type="url" value={red.url} onChange={(evento) => actualizarRed(indice, { url: evento.target.value })} disabled={deshabilitado} placeholder={plataformaActual?.placeholderUrl ?? "https://"} className={`h-11 rounded-xl border bg-surface-container-lowest px-3 text-on-surface outline-none transition-colors placeholder:text-outline focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${esUrlValida ? "border-outline-variant focus:border-primary focus:ring-primary/20" : "border-error focus:border-error focus:ring-error/20"}`} />

                        {!esUrlValida && <span className="text-xs text-error">Introduce una URL completa y válida.</span>}
                      </label>
                    </div>

                    <button type="button" onClick={() => actualizarRed(indice, { activo: !red.activo })} disabled={deshabilitado} className="mt-4 inline-flex items-center relative gap-2 text-sm font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-50" aria-pressed={red.activo}>
                      <span className={`relative h-6 w-11 rounded-full transition-colors ${red.activo ? "bg-success" : "bg-outline-variant"}`}>
                        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${red.activo ? "translate-x-0" : "-translate-x-4"}`}></span>
                      </span>

                      {red.activo ? "Red visible" : "Red oculta"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}