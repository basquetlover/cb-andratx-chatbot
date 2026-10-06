import type { APIRoute } from "astro";

import { supabaseServidor } from "@servicios/supabase/servidor";
import { convertirFilaEventoPanel } from "@servicios/backend/eventos/convertirFilaEventoPanel";

import type {
  EventoChatbot,
  RespuestaEventosChatbot,
} from "@tipos/EventoChatbot";

export const prerender = false;

const cabeceras = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function obtenerMomentoMadrid(): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const valor = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return (
    `${valor("year")}-${valor("month")}-${valor("day")}` +
    `T${valor("hour")}:${valor("minute")}:${valor("second")}`
  );
}

function urlSegura(valor: string): string {
  try {
    const url = new URL(valor);

    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export const GET: APIRoute = async () => {
  try {
    const ahora = obtenerMomentoMadrid();
    const hoy = ahora.slice(0, 10);

    const { data: temporada, error: errorTemporada } =
      await supabaseServidor
        .from("temporadas")
        .select("id")
        .eq("activa", true)
        .limit(1)
        .maybeSingle();

    if (errorTemporada) throw errorTemporada;

    const eventos: EventoChatbot[] = [];
    const tamanoPagina = 500;

    for (let inicio = 0; ; inicio += tamanoPagina) {
      let consulta = supabaseServidor
        .from("eventos")
        .select(`
          id,
          titulo,
          descripcion_corta,
          descripcion,
          fecha_inicio,
          fecha_fin,
          hora_inicio,
          hora_fin,
          todo_el_dia,
          ubicacion,
          direccion,
          imagen,
          url_informacion,
          url_inscripcion,
          requiere_inscripcion
        `)
        .eq("estado", "publicado")
        .eq("alcance", "todo-club")
        .eq("mostrar_calendario", true)
        .or(`fecha_fin.gte.${hoy},fecha_inicio.gte.${hoy}`)
        .order("fecha_inicio", { ascending: true })
        .order("id", { ascending: true })
        .range(inicio, inicio + tamanoPagina - 1);

      consulta = temporada?.id
        ? consulta.or(
            `temporada_id.eq.${temporada.id},temporada_id.is.null`,
          )
        : consulta.is("temporada_id", null);

      const { data, error } = await consulta;

      if (error) throw error;

      const filas = data ?? [];

      for (const fila of filas) {
        const evento = convertirFilaEventoPanel(fila);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(evento.fechaInicio)) {
          continue;
        }

        const fechaFinal =
          evento.fechaFin || evento.fechaInicio;

        const tieneFechaFinal = Boolean(fila.fecha_fin);

        const horaFinal = evento.todoElDia
          ? "23:59:59"
          : evento.horaFin
            ? `${evento.horaFin}:00`
            : tieneFechaFinal
              ? "23:59:59"
              : evento.horaInicio
                ? `${evento.horaInicio}:00`
                : "23:59:59";

        if (`${fechaFinal}T${horaFinal}` <= ahora) {
          continue;
        }

        eventos.push({
          id: evento.id,
          titulo: evento.titulo,
          descripcionCorta: evento.descripcionCorta,
          descripcion: evento.descripcion,
          fechaInicio: evento.fechaInicio,
          fechaFin: fechaFinal,
          horaInicio: evento.horaInicio,
          horaFin: evento.horaFin,
          todoElDia: evento.todoElDia,
          ubicacion: evento.ubicacion,
          direccion: evento.direccion,
          imagen: evento.imagen
            ? urlSegura(evento.imagen) || null
            : null,
          urlInformacion: urlSegura(evento.urlInformacion),
          urlInscripcion: urlSegura(evento.urlInscripcion),
          requiereInscripcion: evento.requiereInscripcion,
        });
      }

      if (filas.length < tamanoPagina) break;
    }

    eventos.sort((primero, segundo) => {
      const inicioPrimero =
        `${primero.fechaInicio}T${primero.todoElDia ? "00:00" : primero.horaInicio || "00:00"}`;

      const inicioSegundo =
        `${segundo.fechaInicio}T${segundo.todoElDia ? "00:00" : segundo.horaInicio || "00:00"}`;

      return (
        inicioPrimero.localeCompare(inicioSegundo) ||
        primero.titulo.localeCompare(segundo.titulo, "es")
      );
    });

    return Response.json(
      {
        ok: true,
        data: eventos,
      } satisfies RespuestaEventosChatbot,
      { headers: cabeceras },
    );
  } catch (error) {
    console.error("Error en GET /api/eventos/proximos:", error);

    return Response.json(
      {
        ok: false,
        data: null,
        error: "No se han podido obtener los eventos del club",
      } satisfies RespuestaEventosChatbot,
      { status: 500, headers: cabeceras },
    );
  }
};

export const ALL: APIRoute = async () =>
  Response.json(
    {
      ok: false,
      data: null,
      error: "Método no permitido",
    } satisfies RespuestaEventosChatbot,
    {
      status: 405,
      headers: {
        ...cabeceras,
        Allow: "GET",
      },
    },
  );