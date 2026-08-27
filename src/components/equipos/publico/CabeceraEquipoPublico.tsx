import type { DatosEquipoPublico } from "@tipos/EquipoPublico";

interface Propiedades {
  equipo: DatosEquipoPublico;
}

export default function CabeceraEquipoPublico({
  equipo,
}: Propiedades) {
  return (
    <section className="relative min-h-64 overflow-hidden rounded-2xl border border-outline-variant/60 bg-on-secondary-container shadow-sm sm:min-h-80">
      {equipo.imagen && (
        <img
          src={equipo.imagen}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-15 blur-sm"
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-linear-to-r from-on-secondary-container via-on-secondary-container/95 to-on-secondary-container/55" />

      <div
        className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full border-32 border-secondary/15"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-64 flex-col justify-end p-6 sm:min-h-80 sm:p-9">
        {equipo.temporada && (
          <p className="text-sm font-black uppercase tracking-[0.18em] text-secondary-fixed">
            Temporada{" "}
            {equipo.temporada.nombre}
          </p>
        )}

        <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-surface-container-lowest sm:text-5xl">
          {equipo.nombre}
        </h2>

        {equipo.descripcion && (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-surface-container-lowest/80 sm:text-base">
            {equipo.descripcion}
          </p>
        )}

        {equipo.fbib && (
          <a
            href={
              equipo.fbib.enlaceFbib
            }
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-xl border border-surface-container-lowest/30 bg-surface-container-lowest/10 px-4 py-2 text-sm font-bold text-surface-container-lowest backdrop-blur-sm transition-colors hover:bg-surface-container-lowest hover:text-on-secondary-container"
          >
            Ver ficha oficial en la FBIB

            <span aria-hidden="true">
              ↗
            </span>
          </a>
        )}
      </div>
    </section>
  );
}