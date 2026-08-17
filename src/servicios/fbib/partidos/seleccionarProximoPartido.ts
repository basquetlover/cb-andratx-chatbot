import type { ProximoPartido } from "@tipos/Partido";

function obtenerFechaActualMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function obtenerHoraActualMadrid(): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function normalizarHora(hora: string | null): string {
  if (!hora) {
    return "23:59";
  }

  const coincidencia = hora.match(/^(\d{1,2}):(\d{2})/);

  if (!coincidencia) {
    return "23:59";
  }

  return `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
}

function crearClavePartido(partido: ProximoPartido): string {
  return `${partido.fecha}T${normalizarHora(partido.hora)}`;
}

export function seleccionarProximoPartido(partidos: ProximoPartido[]): ProximoPartido | null {
  const fechaActual = obtenerFechaActualMadrid();
  const horaActual = obtenerHoraActualMadrid();
  const momentoActual = `${fechaActual}T${horaActual}`;

  const partidosFuturos = partidos
    .filter((partido) => /^\d{4}-\d{2}-\d{2}$/.test(partido.fecha))
    .filter((partido) => crearClavePartido(partido) >= momentoActual)
    .sort((partidoA, partidoB) => crearClavePartido(partidoA).localeCompare(crearClavePartido(partidoB)));

  return partidosFuturos[0] ?? null;
}