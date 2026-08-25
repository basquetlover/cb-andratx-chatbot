import { supabaseServidor } from "../../../supabase/servidor";

import type { RedSocialPatrocinador } from "../../../../types/PatrocinadorPanel";

interface DatosEntrada {
  redes?: unknown;
}

interface RedEntrada {
  id?: unknown;
  nombre?: unknown;
  usuario?: unknown;
  url?: unknown;
  icono?: unknown;
  activo?: unknown;
  orden?: unknown;
}

export class ErrorActualizarRedesPatrocinador extends Error {
  status: number;
  campo?: string;

  constructor(mensaje: string, status = 400, campo?: string) {
    super(mensaje);
    this.name = "ErrorActualizarRedesPatrocinador";
    this.status = status;
    this.campo = campo;
  }
}

function validarUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);
}

function convertirTexto(valor: unknown): string | null {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto.length > 0 ? texto : null;
}

function validarUrl(valor: string): boolean {
  try {
    const url = new URL(valor);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validarRedes(contenido: unknown): RedSocialPatrocinador[] {
  if (typeof contenido !== "object" || contenido === null || Array.isArray(contenido)) {
    throw new ErrorActualizarRedesPatrocinador("Los datos enviados no son válidos.");
  }

  const datos = contenido as DatosEntrada;

  if (!Array.isArray(datos.redes)) {
    throw new ErrorActualizarRedesPatrocinador("La lista de redes sociales no es válida.", 400, "redes");
  }

  if (datos.redes.length > 20) {
    throw new ErrorActualizarRedesPatrocinador("No se pueden añadir más de 20 redes sociales.", 400, "redes");
  }

  const idsUtilizados = new Set<string>();

  return datos.redes.map((elemento, indice): RedSocialPatrocinador => {
    if (typeof elemento !== "object" || elemento === null || Array.isArray(elemento)) {
      throw new ErrorActualizarRedesPatrocinador(`La red social ${indice + 1} no es válida.`, 400, "redes");
    }

    const red = elemento as RedEntrada;
    const id = convertirTexto(red.id);
    const nombre = convertirTexto(red.nombre);
    const usuario = convertirTexto(red.usuario);
    const url = convertirTexto(red.url);
    const icono = convertirTexto(red.icono);

    if (!id) {
      throw new ErrorActualizarRedesPatrocinador(`Falta el identificador de la red social ${indice + 1}.`, 400, "redes");
    }

    if (idsUtilizados.has(id)) {
      throw new ErrorActualizarRedesPatrocinador(`La plataforma ${id} está repetida.`, 400, "redes");
    }

    idsUtilizados.add(id);

    if (!nombre) {
      throw new ErrorActualizarRedesPatrocinador(`Falta el nombre de la red social ${indice + 1}.`, 400, "redes");
    }

    if (!url || !validarUrl(url)) {
      throw new ErrorActualizarRedesPatrocinador(`La URL de ${nombre} no es válida.`, 400, "redes");
    }

    return {
      id,
      nombre,
      usuario,
      url,
      icono,
      activo: red.activo !== false,
      orden: indice + 1,
    };
  });
}

export async function actualizarRedesPatrocinador(patrocinadorId: string, contenido: unknown): Promise<RedSocialPatrocinador[]> {
  const idNormalizado = patrocinadorId.trim();

  if (!validarUuid(idNormalizado)) {
    throw new ErrorActualizarRedesPatrocinador("El identificador del patrocinador no es válido.");
  }

  const redes = validarRedes(contenido);

  const { data: patrocinador, error } = await supabaseServidor
    .from("patrocinadores")
    .update({
      redes,
    })
    .eq("id", idNormalizado)
    .select("id, redes")
    .maybeSingle();

  if (error) {
    throw new Error(`No se han podido actualizar las redes sociales: ${error.message}`);
  }

  if (!patrocinador?.id) {
    throw new ErrorActualizarRedesPatrocinador("El patrocinador no existe.", 404);
  }

  return redes;
}