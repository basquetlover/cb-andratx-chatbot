import type { PasoCreacionUsuario } from "@tipos/PanelUsuario";

interface PasoUsuario {
  numero: PasoCreacionUsuario;
  nombre: string;
  nombreCorto: string;
}

interface Propiedades {
  pasoActual: PasoCreacionUsuario;
  pasoMaximoAlcanzado: PasoCreacionUsuario;
  alSeleccionarPaso?: (paso: PasoCreacionUsuario) => void;
}

const pasos: PasoUsuario[] = [
  {
    numero: 1,
    nombre: "Datos personales",
    nombreCorto: "Datos",
  },
  {
    numero: 2,
    nombre: "Acceso y permisos",
    nombreCorto: "Permisos",
  },
  {
    numero: 3,
    nombre: "Equipos asignados",
    nombreCorto: "Equipos",
  },
  {
    numero: 4,
    nombre: "Revisión final",
    nombreCorto: "Revisión",
  },
];

export default function IndicadorPasosUsuario({ pasoActual, pasoMaximoAlcanzado, alSeleccionarPaso }: Propiedades) {
  return (
    <nav className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-5 shadow-sm sm:px-8 sm:py-6" aria-label="Proceso de creación del usuario">
      <ol className="flex w-full items-start">
        {pasos.map((paso, indice) => {
          const completado = paso.numero < pasoActual;
          const seleccionado = paso.numero === pasoActual;
          const disponible = paso.numero <= pasoMaximoAlcanzado;
          const permiteSeleccionar = disponible && typeof alSeleccionarPaso === "function";

          const clasesCirculo = [
            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200 sm:h-10 sm:w-10",
            completado ? "border-primary bg-primary text-on-primary" : "",
            seleccionado ? "border-primary bg-primary-fixed text-on-primary-container shadow-[0_0_0_4px_rgba(0,102,136,0.12)]" : "",
            !completado && !seleccionado ? "border-outline-variant bg-surface-container text-on-surface-variant" : "",
            permiteSeleccionar ? "group-hover:border-primary group-hover:text-primary" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const contenido = (
            <>
              <span className={clasesCirculo}>
                {completado ? (
                  <span className="inline-block h-4 w-4 bg-current mask-center mask-contain mask-no-repeat sm:h-5 sm:w-5" style={{ maskImage: "url('/iconos/panel/correcto.svg')", WebkitMaskImage: "url('/iconos/panel/correcto.svg')" }} aria-hidden="true" />
                ) : (
                  paso.numero
                )}
              </span>

              <span className={`mt-2 block max-w-24 text-center text-[10px] font-bold leading-tight sm:max-w-none sm:text-xs lg:text-sm ${seleccionado || completado ? "text-primary" : "text-on-surface-variant"}`}>
                <span className="sm:hidden">{paso.nombreCorto}</span>
                <span className="hidden sm:inline">{paso.nombre}</span>
              </span>
            </>
          );

          return (
            <li key={paso.numero} className="relative flex min-w-0 flex-1 flex-col items-center">
              {indice > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full sm:top-5 ${paso.numero <= pasoActual ? "bg-primary" : "bg-outline-variant"}`} aria-hidden="true" />}

              {permiteSeleccionar ? (
                <button type="button" onClick={() => alSeleccionarPaso(paso.numero)} className="group relative z-10 flex w-full flex-col items-center focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" aria-current={seleccionado ? "step" : undefined} aria-label={`Ir al paso ${paso.numero}: ${paso.nombre}`}>
                  {contenido}
                </button>
              ) : (
                <div className="relative z-10 flex w-full flex-col items-center" aria-current={seleccionado ? "step" : undefined} aria-disabled={!disponible}>
                  {contenido}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}