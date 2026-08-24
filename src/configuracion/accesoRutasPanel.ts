export interface ReglaAccesoPanel {
  ruta: string;
  permiso: string | null;
  coincidencia: "exacta" | "prefijo";
}

export const reglasAccesoPanel: ReglaAccesoPanel[] = [
  {
    ruta: "/panel",
    permiso: null,
    coincidencia: "exacta",
  },
  {
    ruta: "/panel/usuarios/nuevo",
    permiso: "usuarios.crear",
    coincidencia: "exacta",
  },
  {
    ruta: "/panel/usuarios",
    permiso: "usuarios.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/permisos",
    permiso: "permisos.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/equipos",
    permiso: "equipos.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/entrenamientos",
    permiso: "entrenamientos.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/eventos",
    permiso: "eventos.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/sponsors",
    permiso: "sponsors.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/configuracion",
    permiso: "configuracion.ver",
    coincidencia: "prefijo",
  },
  {
    ruta: "/panel/perfil",
    permiso: null,
    coincidencia: "prefijo",
  },
];

export function obtenerPermisoRutaPanel(ruta: string): string | null {
  const reglasOrdenadas = [...reglasAccesoPanel].sort((primera, segunda) => segunda.ruta.length - primera.ruta.length);

  const regla = reglasOrdenadas.find((reglaActual) => {
    if (reglaActual.coincidencia === "exacta") {
      return ruta === reglaActual.ruta;
    }

    return ruta === reglaActual.ruta || ruta.startsWith(`${reglaActual.ruta}/`);
  });

  return regla?.permiso ?? null;
}