import type {
  PatrocinadorEquipoPublico,
} from "@tipos/EquipoPublico";

interface Propiedades {
  patrocinadores:
    PatrocinadorEquipoPublico[];
}

export default function PatrocinadoresEquipoPublico({
  patrocinadores,
}: Propiedades) {
  if (
    patrocinadores.length === 0
  ) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6"
      aria-labelledby="titulo-patrocinadores-equipo"
    >
      <header className="mb-6 text-center">
        <div
          className="mx-auto flex items-center justify-center gap-3"
          aria-hidden="true"
        >
          <span className="h-px w-12 bg-outline-variant sm:w-20" />

          <span
            className="inline-block h-6 w-6 shrink-0 bg-primary mask-center mask-contain mask-no-repeat"
            style={{
              maskImage:
                "url('/iconos/balon.svg')",

              WebkitMaskImage:
                "url('/iconos/balon.svg')",
            }}
          />

          <span className="h-px w-12 bg-outline-variant sm:w-20" />
        </div>

        <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-secondary">
          Juntos hacemos equipo
        </p>

        <h2
          id="titulo-patrocinadores-equipo"
          className="mt-1 text-2xl font-black text-on-surface sm:text-3xl"
        >
          Patrocinadores del equipo
        </h2>
      </header>

      <div className=" gap-3 flex flex-wrap items-center place-content-center">
        {patrocinadores.map(
          (patrocinador) => {
            const banner = (
              <img
                src={
                  patrocinador.banner
                }
                alt={`Patrocinador ${patrocinador.nombre}`}
                loading="lazy"
                decoding="async"
                className=" h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            );

            if (
              patrocinador.enlace
            ) {
              return (
                <a
                  key={
                    patrocinador.id
                  }
                  href={
                    patrocinador.enlace
                  }
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  aria-label={`Visitar la página de ${patrocinador.nombre}`}
                  className="max-w-76 group aspect-12/5 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[0_12px_30px_rgba(0,102,136,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {banner}
                </a>
              );
            }

            return (
              <div
                key={patrocinador.id}
                className="max-w-76 group aspect-12/5 overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm"
              >
                {banner}
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}