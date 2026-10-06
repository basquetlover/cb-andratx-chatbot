export type EstadoOpcion =
  | "disponible"
  | "proximamente"
  | "mantenimiento";

export type SiguientePaso =
  | "seleccionar-equipo"
  | "seleccionar-fecha"
  | "mostrar-eventos-club"
  | "consultar-reglamento"
  | "escribir-consulta"
  | "ninguno";

export interface OpcionPrincipal {
  id: string;
  nombre: string;
  estado: EstadoOpcion;
  siguientePaso: SiguientePaso;
}

export const opcionesPrincipales = [
  {
    id: "horarios-entrenamiento",
    nombre: "Horarios de entrenamiento",
    estado: "disponible",
    siguientePaso: "seleccionar-equipo",
  },
  {
    id: "proximo-partido",
    nombre: "Próximo partido",
    estado: "disponible",
    siguientePaso: "seleccionar-equipo",
  },
  {
    id: "partidos-por-fecha",
    nombre: "Partidos por fecha",
    estado: "disponible",
    siguientePaso: "seleccionar-fecha",
  },
  {
    id: "clasificacion",
    nombre: "Clasificación",
    estado: "disponible",
    siguientePaso: "seleccionar-equipo",
  },
  {
    id: "eventos-club",
    nombre: "Eventos del club",
    estado: "disponible",
    siguientePaso: "mostrar-eventos-club",
  },
  {
    id: "reglamento",
    nombre: "Consultar el reglamento",
    estado: "disponible",
    siguientePaso: "consultar-reglamento",
  },
  // {
  //   id: "otra-consulta",
  //   nombre: "Otra consulta",
  //   estado: "proximamente",
  //   siguientePaso: "escribir-consulta",
  // },
] satisfies OpcionPrincipal[];