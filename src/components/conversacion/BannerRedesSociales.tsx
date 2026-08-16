import { useEffect, useState } from "react";

import type { ConfiguracionClub, RespuestaConfiguracionClub } from "@tipos/ConfiguracionClub";

export default function BannerRedesSociales() {
  const [configuracion, setConfiguracion] = useState<ConfiguracionClub | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();

    const cargarConfiguracion = async () => {
      try {
        const respuesta = await fetch("/api/club/configuracion", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No se ha podido obtener la configuración del club");
        }

        const resultado = (await respuesta.json()) as RespuestaConfiguracionClub;

        if (!resultado.ok || !resultado.data) {
          throw new Error(resultado.error ?? "No se ha podido obtener la configuración del club");
        }

        setConfiguracion(resultado.data);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Error al cargar las redes sociales:", error);
      } finally {
        if (!controlador.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarConfiguracion();

    return () => {
      controlador.abort();
    };
  }, []);

  if (cargando) {
    return <div className="h-52 w-full animate-pulse rounded-xl bg-surface-container" aria-label="Cargando redes sociales" />;
  }

  if (!configuracion || configuracion.redes.length === 0) {
    return null;
  }

  return (
    <aside className="relative my-3 w-full overflow-hidden rounded-xl bg-linear-to-br from-on-secondary-fixed via-secondary to-tertiary px-5 py-6 text-on-secondary shadow-sm" aria-label="Redes sociales del club">
      <div className="absolute -left-12 -top-16 h-36 w-36 rotate-12 rounded-full bg-primary-container opacity-20" aria-hidden="true" />
      <div className="absolute -bottom-20 -right-12 h-40 w-40 rounded-full bg-primary-container opacity-20" aria-hidden="true" />

      <div className="relative">
        <p className="text-center text-lg font-semibold uppercase tracking-widest text-primary-fixed-dim">C.B. Andratx</p>
        <h2 className="mt-1 text-center text-xl font-bold text-on-secondary sm:text-2xl">Síguenos en nuestras redes</h2>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {configuracion.redes.map((red) => (
            <a key={red.id} href={red.url} target="_blank" rel="noopener noreferrer" className="group flex min-w-28 flex-1 basis-28 flex-col items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-4 text-center transition-colors hover:border-primary-container hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container" aria-label={`Abrir ${red.nombre} del club`}>
              <img src={`/iconos/redes/${red.icono}.svg`} alt="" className="h-10 w-10 object-contain transition-transform group-hover:scale-110" loading="lazy" aria-hidden="true" />

              <span className="mt-2 text-sm font-semibold text-on-secondary">{red.nombre}</span>

              {red.usuario && <span className="mt-0.5 max-w-32 truncate text-xs text-secondary-fixed">{red.usuario}</span>}
            </a>
          ))}
        </div>
        <div className="mt-5">
            <p className="text-center w-max mx-auto uppercase italic text-on-primary flex items-center max-md:text-sm">
                <span className="inline-block h-5 w-5 max-md:w-4 max-md:h-4 bg-on-primary mask-[url('/iconos/tag.svg')] mask-center mask-no-repeat mask-contain" aria-hidden="true" />
                fentbasquetdesde1985
            </p>
            <p className="text-center w-max mx-auto uppercase italic text-on-primary flex items-center max-md:text-sm">
                <span className="inline-block h-5 w-5 max-md:w-4 max-md:h-4 bg-on-primary mask-[url('/iconos/tag.svg')] mask-center mask-no-repeat mask-contain" aria-hidden="true" />
                sentiment
                <span className="text-on-secondary-fixed">blau</span><span className="text-primary-container">groc</span>
            </p>
        </div>
      </div>
    </aside>
  );
}