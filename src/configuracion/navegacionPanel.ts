export type EstadoEnlacePanel = "activo" | "proximamente";

export interface EnlacePanel {
  id: string;
  nombre: string;
  nombreCorto?: string;
  descripcion?: string;
  enlace: string;
  icono: string;
  permiso?: string;
  estado: EstadoEnlacePanel;
  seccion: "principal" | "administracion" | "cuenta";
  orden: number;
  rutasRelacionadas?: string[];
}

export const navegacionPanel: EnlacePanel[] = [
  {
    id: "resumen",
    nombre: "Resumen",
    nombreCorto: "Inicio",
    descripcion: "Vista general del panel",
    enlace: "/panel",
    icono: "resumen",
    estado: "activo",
    seccion: "principal",
    orden: 1,
  },
  {
    id: "usuarios",
    nombre: "Usuarios",
    descripcion: "Crear y gestionar usuarios",
    enlace: "/panel/usuarios",
    icono: "usuarios",
    permiso: "usuarios.ver",
    estado: "activo",
    seccion: "principal",
    orden: 2,
  },
  // {
  //   id: "permisos",
  //   nombre: "Permisos",
  //   descripcion: "Gestionar el catálogo de permisos",
  //   enlace: "/panel/permisos",
  //   icono: "permisos",
  //   permiso: "permisos.ver",
  //   estado: "activo",
  //   seccion: "principal",
  //   orden: 3,
  // },
  {
    id: "socios",
    nombre: "Socios",
    descripcion: "Gestionar socios y asignaciones",
    enlace: "/panel/socios",
    icono: "socios",
    permiso: "socios.ver",
    estado: "activo",
    seccion: "principal",
    orden: 7,
  },
  {
    id: "equipos",
    nombre: "Equipos",
    descripcion: "Gestionar equipos del club",
    enlace: "/panel/equipos",
    icono: "equipos",
    permiso: "equipos.ver",
    estado: "activo",
    seccion: "principal",
    orden: 4,
  },
  {
    id: "publicaciones",
    nombre: "Publicaciones",
    nombreCorto: "Publicaciones",
    descripcion: "Gestionar publicaciones pregeneradas",
    enlace: "/panel/publicaciones/partidos",
    icono: "publicaciones",
    permiso: "publicaciones.ver",
    estado: "activo",
    seccion: "principal",
    orden: 5,
  },
  {
    id: "eventos",
    nombre: "Eventos",
    descripcion: "Gestionar eventos del club",
    enlace: "/panel/eventos",
    icono: "eventos",
    permiso: "eventos.ver",
    estado: "activo",
    seccion: "principal",
    orden: 6,
  },
  {
    id: "sponsors",
    nombre: "Sponsors",
    descripcion: "Gestionar sponsors y asignaciones",
    enlace: "/panel/sponsors",
    icono: "sponsors",
    permiso: "sponsors.ver",
    estado: "activo",
    seccion: "principal",
    orden: 7,
  },
  {
    id: "configuracion",
    nombre: "Configuración",
    nombreCorto: "Ajustes",
    descripcion: "Configuración general del club",
    enlace: "/panel/configuracion",
    icono: "configuracion",
    permiso: "configuracion.ver",
    estado: "proximamente",
    seccion: "administracion",
    orden: 8,
  },
  {
    id: "perfil",
    nombre: "Mi perfil",
    nombreCorto: "Perfil",
    descripcion: "Datos personales y seguridad",
    enlace: "/panel/perfil",
    icono: "perfil",
    estado: "proximamente",
    seccion: "cuenta",
    orden: 9,
  },
  {
    id: "web",
    nombre: "Volver a la web",
    nombreCorto: "Web",
    descripcion: "Salir del panel y volver a la web",
    enlace: "/",
    icono: "web",
    estado: "activo",
    seccion: "cuenta",
    orden: 10,
  },
];

export const navegacionPanelOrdenada = [...navegacionPanel].sort((primerEnlace, segundoEnlace) => primerEnlace.orden - segundoEnlace.orden);

export const navegacionPrincipalPanel = navegacionPanelOrdenada.filter((enlace) => enlace.seccion === "principal");

export const navegacionAdministracionPanel = navegacionPanelOrdenada.filter((enlace) => enlace.seccion === "administracion");

export const navegacionCuentaPanel = navegacionPanelOrdenada.filter((enlace) => enlace.seccion === "cuenta");