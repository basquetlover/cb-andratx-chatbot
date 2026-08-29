import {
  obtenerDatosEsbFbib,
} from "@servicios/fbib/cliente/obtenerDatosEsbFbib";

import type {
  RivalFbibPublicacion,
} from "@tipos/PublicacionPartidosPanel";

interface ClubFbib {
  id: string;
  nombre: string;
  localidad: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  escudo: string | null;
}

interface CacheClubes {
  clubes: ClubFbib[];
  expiraEn: number;
}

const DURACION_CACHE_MS =
  30 * 60 * 1000;

let cacheClubes:
  CacheClubes | null = null;

let cargaClubesEnCurso:
  Promise<ClubFbib[]> | null =
    null;

export class ErrorBuscarRivalesPublicacion
  extends Error {
  status: number;

  constructor(
    mensaje: string,
    status: number,
  ) {
    super(mensaje);

    this.name =
      "ErrorBuscarRivalesPublicacion";

    this.status = status;
  }
}

function esObjeto(
  valor: unknown,
): valor is Record<
  string,
  unknown
> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(
  valor: unknown,
): string {
  if (
    typeof valor === "string" ||
    typeof valor === "number"
  ) {
    return String(valor).trim();
  }

  return "";
}

function convertirTextoNullable(
  valor: unknown,
): string | null {
  const texto =
    convertirTexto(valor);

  return texto || null;
}

function normalizarBusqueda(
  valor: string,
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim();
}

function normalizarEscudo(
  valor: unknown,
): string | null {
  if (esObjeto(valor)) {
    const propiedades = [
      valor.url,
      valor.src,
      valor.data,
      valor.base64,
      valor.path,
      valor.image,
      valor.logo,
    ];

    for (
      const propiedad
      of propiedades
    ) {
      const imagen =
        normalizarEscudo(
          propiedad,
        );

      if (imagen) {
        return imagen;
      }
    }

    return null;
  }

  if (typeof valor !== "string") {
    return null;
  }

  const imagen =
    valor.trim();

  if (!imagen) {
    return null;
  }

  if (
    imagen.startsWith(
      "data:image/",
    )
  ) {
    return imagen;
  }

  if (
    imagen.startsWith(
      "https://",
    )
  ) {
    return imagen;
  }

  if (
    imagen.startsWith(
      "http://",
    )
  ) {
    return imagen.replace(
      "http://",
      "https://",
    );
  }

  if (imagen.startsWith("/")) {
    return `https://www.fbib.es${imagen}`;
  }

  const base64 =
    imagen.replace(/\s/g, "");

  if (
    base64.length > 100 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(
      base64,
    )
  ) {
    return `data:image/png;base64,${base64}`;
  }

  return null;
}

function buscarEscudoEnClub(
  club: Record<string, unknown>,
): string | null {
  const propiedadesConocidas = [
    club.image,
    club.img,
    club.logo,
    club.shield,
    club.escudo,
    club.clubImage,
    club.imageClub,
    club.clubImg,
    club.urlImage,
    club.imageUrl,
    club.pathImage,
  ];

  for (
    const propiedad
    of propiedadesConocidas
  ) {
    const escudo =
      normalizarEscudo(
        propiedad,
      );

    if (escudo) {
      return escudo;
    }
  }

  for (
    const [
      nombrePropiedad,
      valor,
    ] of Object.entries(club)
  ) {
    const nombreNormalizado =
      normalizarBusqueda(
        nombrePropiedad,
      );

    const pareceImagen =
      nombreNormalizado.includes(
        "image",
      ) ||
      nombreNormalizado.includes(
        "imagen",
      ) ||
      nombreNormalizado.includes(
        "logo",
      ) ||
      nombreNormalizado.includes(
        "escudo",
      ) ||
      nombreNormalizado.includes(
        "shield",
      );

    if (!pareceImagen) {
      continue;
    }

    const escudo =
      normalizarEscudo(
        valor,
      );

    if (escudo) {
      return escudo;
    }
  }

  return null;
}

function extraerColeccion(
  valor: unknown,
): Record<string, unknown>[] {
  if (Array.isArray(valor)) {
    return valor.filter(
      esObjeto,
    );
  }

  if (esObjeto(valor)) {
    return Object.values(
      valor,
    ).filter(
      esObjeto,
    );
  }

  return [];
}

function convertirClub(
  valor: unknown,
): ClubFbib | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id =
    convertirTexto(valor.id);

  const nombre =
    convertirTexto(valor.name);

  if (!id || !nombre) {
    return null;
  }

  return {
    id,
    nombre,

    localidad:
      convertirTextoNullable(
        valor.town,
      ),

    direccion:
      convertirTextoNullable(
        valor.direction,
      ),

    codigoPostal:
      convertirTextoNullable(
        valor.postalCode,
      ),

    escudo:
      buscarEscudoEnClub(
        valor,
      ),
  };
}

function extraerClubes(
  valor: unknown,
): ClubFbib[] {
  const clubes =
    extraerColeccion(valor)
      .flatMap((elemento) => {
        const club =
          convertirClub(
            elemento,
          );

        return club
          ? [club]
          : [];
      });

  const ids =
    new Set<string>();

  return clubes
    .filter((club) => {
      if (ids.has(club.id)) {
        return false;
      }

      ids.add(club.id);

      return true;
    })
    .sort(
      (
        clubA,
        clubB,
      ) =>
        clubA.nombre.localeCompare(
          clubB.nombre,
          "es",
          {
            sensitivity:
              "base",
          },
        ),
    );
}

async function cargarClubesFbib(): Promise<
  ClubFbib[]
> {
  if (
    cacheClubes &&
    cacheClubes.expiraEn >
      Date.now()
  ) {
    return cacheClubes.clubes;
  }

  if (cargaClubesEnCurso) {
    return cargaClubesEnCurso;
  }

  cargaClubesEnCurso =
    (async () => {
      let resultado: unknown;

      try {
        resultado =
          await obtenerDatosEsbFbib(
            "/Clubs/getActiveWeb",
          );
      } catch (error) {
        console.error(
          "Error obteniendo los clubes activos de la FBIB:",
          error,
        );

        throw new ErrorBuscarRivalesPublicacion(
          "No se han podido consultar los clubes de la FBIB.",
          502,
        );
      }

      const clubes =
        extraerClubes(
          resultado,
        );

      if (clubes.length === 0) {
        throw new ErrorBuscarRivalesPublicacion(
          "La FBIB no ha devuelto ningún club activo.",
          502,
        );
      }

      cacheClubes = {
        clubes,

        expiraEn:
          Date.now() +
          DURACION_CACHE_MS,
      };

      return clubes;
    })();

  try {
    return await cargaClubesEnCurso;
  } finally {
    cargaClubesEnCurso =
      null;
  }
}

function convertirClubEnRival(
  club: ClubFbib,
): RivalFbibPublicacion {
  return {
    id: club.id,

    nombre:
      club.nombre,

    nombreCorto:
      club.localidad,

    clubId:
      club.id,

    clubNombre:
      null,

    escudo:
      club.escudo,
  };
}

function filtrarClubes(
  clubes: ClubFbib[],
  consulta: string,
): ClubFbib[] {
  const consultaNormalizada =
    normalizarBusqueda(
      consulta,
    );

  if (!consultaNormalizada) {
    return clubes;
  }

  return clubes.filter(
    (club) => {
      const contenido =
        normalizarBusqueda(
          [
            club.nombre,
            club.localidad,
            club.direccion,
            club.codigoPostal,
          ]
            .filter(Boolean)
            .join(" "),
        );

      return contenido.includes(
        consultaNormalizada,
      );
    },
  );
}

export async function buscarRivalesPublicacion(
  consulta = "",
): Promise<
  RivalFbibPublicacion[]
> {
  const consultaLimpia =
    consulta.trim();

  if (
    consultaLimpia.length >
    100
  ) {
    throw new ErrorBuscarRivalesPublicacion(
      "El filtro no puede superar los 100 caracteres.",
      400,
    );
  }

  const clubes =
    await cargarClubesFbib();

  return filtrarClubes(
    clubes,
    consultaLimpia,
  ).map(
    convertirClubEnRival,
  );
}