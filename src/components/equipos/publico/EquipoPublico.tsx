import CabeceraEquipoPublico from "./CabeceraEquipoPublico";
import CalendarioEquipoPublico from "./CalendarioEquipoPublico";
import ClasificacionesEquipoPublico from "./ClasificacionesEquipoPublico";
import HorariosEquipoPublico from "./HorariosEquipoPublico";
import PartidosMesEquipoPublico from "./PartidosMesEquipoPublico";
import PatrocinadoresEquipoPublico from "./PatrocinadoresEquipoPublico";
import ProximosPartidosEquipoPublico from "./ProximosPartidosEquipoPublico";
import ResumenEquipoPublico from "./ResumenEquipoPublico";

import type {
  DatosEquipoPublico,
  PatrocinadorEquipoPublico,
} from "@tipos/EquipoPublico";

interface Propiedades {
  equipoInicial:
    DatosEquipoPublico;

  patrocinadoresIniciales?:
    PatrocinadorEquipoPublico[];
}

export default function EquipoPublico({
  equipoInicial,
  patrocinadoresIniciales = [],
}: Propiedades) {
  const patrocinadoresEquipo =
    Array.isArray(
      equipoInicial.patrocinadores,
    )
      ? equipoInicial.patrocinadores
      : [];

  const patrocinadoresAlternativos =
    Array.isArray(
      patrocinadoresIniciales,
    )
      ? patrocinadoresIniciales
      : [];

  const patrocinadores =
    patrocinadoresEquipo.length > 0
      ? patrocinadoresEquipo
      : patrocinadoresAlternativos;

  const entrenamientosHabituales =
    Array.isArray(
      equipoInicial
        .entrenamientosHabituales,
    )
      ? equipoInicial
          .entrenamientosHabituales
      : [];

  const partidosMes =
    Array.isArray(
      equipoInicial.fbib
        ?.partidosMes,
    )
      ? equipoInicial.fbib
          ?.partidosMes ?? []
      : [];

  const proximosPartidos =
    Array.isArray(
      equipoInicial.fbib
        ?.proximosPartidos,
    )
      ? (
          equipoInicial.fbib
            ?.proximosPartidos ??
          []
        ).slice(0, 2)
      : [];

  const clasificaciones =
    Array.isArray(
      equipoInicial.fbib
        ?.clasificaciones,
    )
      ? equipoInicial.fbib
          ?.clasificaciones ??
        []
      : [];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <nav
        className="mb-5"
        aria-label="Navegación de equipos"
      >
        <a
          href="/equipos"
          className="group inline-flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface-variant shadow-sm transition-all hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span
            className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat transition-transform group-hover:-translate-x-1"
            style={{
              maskImage:
                "url('/iconos/panel/volver.svg')",

              WebkitMaskImage:
                "url('/iconos/panel/volver.svg')",
            }}
            aria-hidden="true"
          />

          Volver a todos los equipos
        </a>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="grid gap-5 lg:sticky lg:top-5">
          <ResumenEquipoPublico
            equipo={equipoInicial}
          />

          {equipoInicial.fbib && (
            <ProximosPartidosEquipoPublico
              partidos={
                proximosPartidos
              }
              enlaceFbib={
                equipoInicial.fbib
                  .enlaceFbib
              }
            />
          )}

          <HorariosEquipoPublico
            entrenamientos={
              entrenamientosHabituales
            }
          />
        </aside>

        <div className="min-w-0 space-y-5">
          <CabeceraEquipoPublico
            equipo={equipoInicial}
          />

          {equipoInicial.fbib && (
            <>
              <PartidosMesEquipoPublico
                equipoId={
                  equipoInicial.id
                }
                partidosIniciales={
                  partidosMes
                }
                mesInicial={
                  equipoInicial.fbib
                    .mesConsultado
                }
              />

              <ClasificacionesEquipoPublico
                clasificaciones={
                  clasificaciones
                }
              />
            </>
          )}

          <CalendarioEquipoPublico
            equipoId={
              equipoInicial.id
            }
          />

          <PatrocinadoresEquipoPublico
            patrocinadores={
              patrocinadores
            }
          />
        </div>
      </div>
    </main>
  );
}