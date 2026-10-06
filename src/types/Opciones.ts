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

  // Necesita que el equipo tenga id_equipo_fbib configurado.
  requiereFbib: boolean;
}

export const opcionesPrincipales = [
  {
    id: "horarios-entrenamiento",
    nombre: "Horarios de entrenamiento",
    estado: "disponible",
    siguientePaso: "seleccionar-equipo",
    requiereFbib: false,
  },
  {
    id: "proximo-partido",
    nombre: "Próximo partido",
    estado: "disponible",
    siguientePaso: "seleccionar-equipo",
    requiereFbib: true,
  },
  {
    id: "partidos-por-fecha",
    nombre: "Partidos por fecha",
    estado: "disponible",
    siguientePaso: "seleccionar-fecha",
    requiereFbib: true,
  },
  {
    id: "clasificacion",
    nombre: "Clasificación",
    estado: "disponible",
    siguientePaso: "seleccionar-equipo",
    requiereFbib: true,
  },
  {
    id: "eventos-club",
    nombre: "Eventos del club",
    estado: "disponible",
    siguientePaso: "mostrar-eventos-club",
    requiereFbib: false,
  },
  {
    id: "reglamento",
    nombre: "Consultar el reglamento",
    estado: "disponible",
    siguientePaso: "consultar-reglamento",
    requiereFbib: false,
  },
  // {
  //   id: "otra-consulta",
  //   nombre: "Otra consulta",
  //   estado: "proximamente",
  //   siguientePaso: "escribir-consulta",
  // },
] satisfies OpcionPrincipal[];