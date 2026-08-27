import TarjetaPartidoEquipoPublico from "./TarjetaPartidoEquipoPublico";

import type { PartidoEquipoFbib } from "@tipos/FbibEquipoPublico";

interface Propiedades {
  partidos: PartidoEquipoFbib[];
  enlaceFbib: string;
}

export default function ProximosPartidosEquipoPublico({
  partidos,
  enlaceFbib,
}: Propiedades) {
  const proximosPartidos =
    partidos.slice(0, 2);

  return (
    <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="5"
            width="17"
            height="15"
            rx="2"
          />

          <path
            d="M7.5 3v4M16.5 3v4M3.5 9.5h17"
            strokeLinecap="round"
          />
        </svg>

        <h2 className="font-bold text-on-surface">
          Próximos partidos
        </h2>
      </div>

      {proximosPartidos.length >
      0 ? (
        <div className="mt-4 grid gap-3">
          {proximosPartidos.map(
            (partido) => (
              <TarjetaPartidoEquipoPublico
                key={partido.id}
                partido={partido}
                compacto
              />
            ),
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-center">
          <p className="text-sm font-bold text-on-surface">
            No hay próximos partidos
          </p>

          <p className="mt-1 text-xs text-on-surface-variant">
            La FBIB todavía no ha
            publicado nuevos encuentros.
          </p>
        </div>
      )}

      <a
        href={enlaceFbib}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      >
        Ver calendario en la FBIB

        <span aria-hidden="true">
          ↗
        </span>
      </a>
    </section>
  );
}