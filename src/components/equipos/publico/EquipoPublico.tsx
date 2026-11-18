
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

// ======================================================
// PROPIEDADES
// ======================================================

interface DatosEquipoConAcceso
  extends DatosEquipoPublico {
  puedeVerEntrenamientos?: boolean;
}

interface Propiedades {
  equipoInicial:
    DatosEquipoConAcceso;

  patrocinadoresIniciales?:
    PatrocinadorEquipoPublico[];
}

// ======================================================
// AVISO DE ENTRENAMIENTOS PARA SOCIOS
// ======================================================

function AvisoHorariosSocios() {
  return (
    <section
      className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm"
      aria-labelledby="titulo-horarios-socios"
    >
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-secondary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="8.5"
          />

          <path
            d="M12 7.5V12l3 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <h2
          id="titulo-horarios-socios"
          className="font-bold text-on-surface"
        >
          Horarios de entrenamiento
        </h2>
      </div>

      <div className="mt-4 rounded-xl border border-primary/25 bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
              />

              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>

          <div className="min-w-0">
            <p className="text-sm font-bold text-on-surface">
              Información exclusiva
              para socios
            </p>

            <p className="mt-1 text-xs font-semibold text-primary">
              Acceso restringido
            </p>
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-on-surface-variant">
          Los horarios de entrenamiento
          de este equipo solo están
          disponibles para los socios
          del club con un carnet activo.
        </p>

        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Inicia sesión como socio
          para consultar los días,
          horarios e instalaciones
          de entrenamiento.
        </p>

        <a
          href="/socios/iniciar-sesion"
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-center text-sm font-bold text-on-primary transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 17l5-5-5-5" />

            <path d="M15 12H3" />

            <path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" />
          </svg>

          Iniciar sesión como socio
        </a>
      </div>
    </section>
  );
}

// ======================================================
// FICHA PÚBLICA DEL EQUIPO
// ======================================================

export default function EquipoPublico({
  equipoInicial,
  patrocinadoresIniciales = [],
}: Propiedades) {
  // --------------------------------------------------
  // 1. PATROCINADORES
  // --------------------------------------------------

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

  // --------------------------------------------------
  // 2. CONTROL DE ACCESO A ENTRENAMIENTOS
  // --------------------------------------------------

  /*
   * El permiso procede de la página
   * Astro, que lo obtiene después
   * de verificar la sesión del socio.
   *
   * Por defecto se considera que
   * el visitante no tiene acceso.
   *
   * Esta comprobación controla la
   * interfaz. La protección real
   * de los datos se hace en el servidor.
   */

  const puedeVerEntrenamientos =
    equipoInicial.puedeVerEntrenamientos ===
    true;

  const entrenamientosHabituales =
    puedeVerEntrenamientos &&
    Array.isArray(
      equipoInicial.entrenamientosHabituales,
    )
      ? equipoInicial.entrenamientosHabituales
      : [];

  // --------------------------------------------------
  // 3. PARTIDOS DEL MES
  // --------------------------------------------------

  const partidosMes =
    Array.isArray(
      equipoInicial.fbib?.partidosMes,
    )
      ? equipoInicial.fbib?.partidosMes ?? []
      : [];

  // --------------------------------------------------
  // 4. PRÓXIMOS PARTIDOS
  // --------------------------------------------------

  const proximosPartidos =
    Array.isArray(
      equipoInicial.fbib?.proximosPartidos,
    )
      ? (
          equipoInicial.fbib?.proximosPartidos ??
          []
        ).slice(0, 2)
      : [];

  // --------------------------------------------------
  // 5. CLASIFICACIONES
  // --------------------------------------------------

  const clasificaciones =
    Array.isArray(
      equipoInicial.fbib?.clasificaciones,
    )
      ? equipoInicial.fbib?.clasificaciones ??
        []
      : [];

  // ==================================================
  // INTERFAZ
  // ==================================================

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* NAVEGACIÓN */}

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

      {/* DISTRIBUCIÓN DE LA FICHA */}

      <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* COLUMNA LATERAL */}

        <aside className="grid gap-5 lg:sticky lg:top-5">
          <ResumenEquipoPublico
            equipo={equipoInicial}
          />

          {equipoInicial.fbib && (
            <ProximosPartidosEquipoPublico
              partidos={proximosPartidos}
              enlaceFbib={
                equipoInicial.fbib.enlaceFbib
              }
            />
          )}

          {/* HORARIOS DE ENTRENAMIENTO */}

          {puedeVerEntrenamientos ? (
            <HorariosEquipoPublico
              entrenamientos={
                entrenamientosHabituales
              }
            />
          ) : (
            <AvisoHorariosSocios />
          )}
        </aside>

        {/* COLUMNA PRINCIPAL */}

        <div className="min-w-0 space-y-5">
          <CabeceraEquipoPublico
            equipo={equipoInicial}
          />

          {/* PARTIDOS Y CLASIFICACIONES */}

          {equipoInicial.fbib && (
            <>
              <PartidosMesEquipoPublico
                equipoId={equipoInicial.id}
                partidosIniciales={
                  partidosMes
                }
                mesInicial={
                  equipoInicial.fbib.mesConsultado
                }
              />

              <ClasificacionesEquipoPublico
                clasificaciones={
                  clasificaciones
                }
              />
            </>
          )}

          {/* CALENDARIO DEL EQUIPO */}

          <CalendarioEquipoPublico
            equipoId={equipoInicial.id}
          />

          {/* PATROCINADORES */}

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
