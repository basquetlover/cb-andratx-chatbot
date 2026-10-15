
import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  DatosCreacionPartidoCba,
} from "@servicios/backend/designaciones/obtenerDatosCreacionPartidoCba";

// ======================================================
// CONFIGURACIÓN
// ======================================================

const API_CREAR_PARTIDO =
  "/api/panel/designaciones/crear-partido";

const RUTA_DESIGNACIONES =
  "/panel/designaciones";

const NIVELES = [
  "Escuela",
  "Iniciación",
  "Auxiliar",
  "Entrenador",
  "Técnico",
  "Responsable",
] as const;

const CLASE_CAMPO =
  "min-h-11 w-full rounded-xl border border-outline-variant " +
  "bg-surface-container-lowest px-3 py-2 text-sm text-on-surface " +
  "outline-none transition-colors focus:border-primary " +
  "focus:ring-2 focus:ring-primary/15 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

const REGEX_FECHA =
  /^\d{4}-\d{2}-\d{2}$/;

const REGEX_HORA =
  /^([01]\d|2[0-3]):[0-5]\d$/;

// ======================================================
// TIPOS
// ======================================================

type PosicionEquipo =
  | "local"
  | "visitante";

interface Props {
  datosIniciales: DatosCreacionPartidoCba;
}

interface FormularioPartido {
  equipoId: string;
  posicionEquipoCba: PosicionEquipo;

  nombreRival: string;

  fecha: string;
  hora: string;

  categoria: string;
  grupo: string;
  jornada: string;
  competicion: string;

  instalacionId: string;

  nivelMinimoPista: string;
  nivelMinimoMesa: string;

  anotaciones: string;
}

interface RespuestaCrearPartido {
  ok: boolean;

  data?: {
    id: string;
    numeroPartido: string;
    creado: boolean;
    url: string;
  } | null;

  error?: string | null;
}

// ======================================================
// UTILIDADES
// ======================================================

function crearFormularioVacio(): FormularioPartido {
  return {
    equipoId: "",
    posicionEquipoCba: "local",

    nombreRival: "",

    fecha: "",
    hora: "",

    categoria: "",
    grupo: "",
    jornada: "",
    competicion: "",

    instalacionId: "",

    nivelMinimoPista: "",
    nivelMinimoMesa: "",

    anotaciones: "",
  };
}

function fechaValida(
  valor: string,
): boolean {
  if (!REGEX_FECHA.test(valor)) {
    return false;
  }

  const fecha = new Date(
    `${valor}T12:00:00Z`,
  );

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function nombreEquipo(
  valor: string,
): string {
  return valor.trim() || "Equipo sin nombre";
}

function Campo({
  titulo,
  children,
  obligatorio = false,
}: {
  titulo: string;
  children: ReactNode;
  obligatorio?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {titulo}

        {obligatorio && (
          <span
            className="ml-1 text-error"
            aria-label="Obligatorio"
          >
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

function SelectorNivel({
  titulo,
  valor,
  disabled,
  onChange,
}: {
  titulo: string;
  valor: string;
  disabled: boolean;
  onChange: (valor: string) => void;
}) {
  return (
    <Campo titulo={titulo}>
      <select
        value={valor}
        disabled={disabled}
        onChange={(evento) =>
          onChange(evento.target.value)
        }
        className={CLASE_CAMPO}
      >
        <option value="">
          Sin nivel mínimo
        </option>

        {NIVELES.map((nivel, indice) => (
          <option
            key={nivel}
            value={nivel}
          >
            {indice + 1}. {nivel}
          </option>
        ))}
      </select>
    </Campo>
  );
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function FormularioNuevoPartidoCba({
  datosIniciales,
}: Props) {
  const {
    temporada,
    equipos,
    instalaciones,
    siguienteNumeroOrientativo,
  } = datosIniciales;

  const [formulario, setFormulario] =
    useState<FormularioPartido>(
      crearFormularioVacio,
    );

  const [guardando, setGuardando] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  // ====================================================
  // EQUIPO SELECCIONADO
  // ====================================================

  const equipoSeleccionado = useMemo(
    () =>
      equipos.find(
        (equipo) =>
          equipo.id === formulario.equipoId,
      ) ?? null,
    [
      equipos,
      formulario.equipoId,
    ],
  );

  // ====================================================
  // VISTA PREVIA
  // ====================================================

  const equipoLocal =
    formulario.posicionEquipoCba === "local"
      ? equipoSeleccionado?.nombre ?? ""
      : formulario.nombreRival.trim();

  const equipoVisitante =
    formulario.posicionEquipoCba === "visitante"
      ? equipoSeleccionado?.nombre ?? ""
      : formulario.nombreRival.trim();

  const puedeEnviar =
    !guardando &&
    Boolean(equipoSeleccionado) &&
    formulario.nombreRival.trim().length > 0 &&
    fechaValida(formulario.fecha) &&
    REGEX_HORA.test(formulario.hora);

  // ====================================================
  // MODIFICAR FORMULARIO
  // ====================================================

  function cambiarCampo<
    K extends keyof FormularioPartido
  >(
    campo: K,
    valor: FormularioPartido[K],
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    if (error) {
      setError(null);
    }
  }

  // ====================================================
  // VALIDACIONES
  // ====================================================

  function validarFormulario(): string | null {
    if (!equipoSeleccionado) {
      return "Selecciona el equipo CBA que disputará el partido.";
    }

    const rival =
      formulario.nombreRival.trim();

    if (!rival || rival.length > 200) {
      return "Introduce el nombre del rival (máximo 200 caracteres).";
    }

    if (
      rival.localeCompare(
        equipoSeleccionado.nombre,
        "es",
        {
          sensitivity: "base",
        },
      ) === 0
    ) {
      return "El rival no puede tener el mismo nombre que el equipo CBA.";
    }

    if (!fechaValida(formulario.fecha)) {
      return "Introduce una fecha válida.";
    }

    if (!REGEX_HORA.test(formulario.hora)) {
      return "Introduce una hora válida en formato HH:MM.";
    }

    const instalacionId =
      formulario.instalacionId;

    if (instalacionId) {
      const instalacion =
        instalaciones.find(
          (elemento) =>
            elemento.id === instalacionId &&
            elemento.activa,
        );

      if (!instalacion) {
        return "Selecciona una instalación activa.";
      }
    }

    for (const nivel of [
      formulario.nivelMinimoPista,
      formulario.nivelMinimoMesa,
    ]) {
      if (
        nivel &&
        !NIVELES.some(
          (permitido) => permitido === nivel,
        )
      ) {
        return "Selecciona uno de los seis niveles permitidos.";
      }
    }

    return null;
  }

  // ====================================================
  // GUARDAR
  // ====================================================

  async function crearPartido(
    evento: FormEvent<HTMLFormElement>,
  ) {
    evento.preventDefault();

    if (guardando) {
      return;
    }

    const errorValidacion =
      validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setGuardando(true);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch(
        API_CREAR_PARTIDO,
        {
          method: "POST",
          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            origen: "cba",

            equipoId:
              formulario.equipoId,

            posicionEquipoCba:
              formulario.posicionEquipoCba,

            nombreRival:
              formulario.nombreRival.trim(),

            fecha:
              formulario.fecha,

            hora:
              formulario.hora,

            categoria:
              formulario.categoria.trim() || null,

            grupo:
              formulario.grupo.trim() || null,

            jornada:
              formulario.jornada.trim() || null,

            competicion:
              formulario.competicion.trim() || null,

            instalacionId:
              formulario.instalacionId || null,

            nivelMinimoPista:
              formulario.nivelMinimoPista || null,

            nivelMinimoMesa:
              formulario.nivelMinimoMesa || null,

            anotaciones:
              formulario.anotaciones.trim() || null,
          }),
        },
      );

      let resultado: RespuestaCrearPartido;

      try {
        resultado =
          await respuesta.json() as RespuestaCrearPartido;
      } catch {
        throw new Error(
          "El servidor no ha devuelto una respuesta válida.",
        );
      }

      if (
        !respuesta.ok ||
        !resultado.ok ||
        !resultado.data?.id ||
        !resultado.data.creado
      ) {
        throw new Error(
          resultado.error ||
          "No se ha podido crear el partido.",
        );
      }

      // La respuesta debe contener una ruta interna
      // válida de la ficha del partido.

      const rutaEsperada =
        "/panel/designaciones/partido";

      const urlDestino = new URL(
        resultado.data.url,
        window.location.origin,
      );

      if (
        urlDestino.origin !== window.location.origin ||
        urlDestino.pathname !== rutaEsperada ||
        urlDestino.searchParams.get("idPartido") !==
          resultado.data.id
      ) {
        // Si la URL recibida no cumple el contrato,
        // construimos una ruta interna desde el UUID
        // devuelto por el backend.

        const parametros =
          new URLSearchParams({
            idPartido: resultado.data.id,
          });

        window.location.assign(
          `${rutaEsperada}?${parametros.toString()}`,
        );

        return;
      }

      setMensaje(
        `Partido ${resultado.data.numeroPartido} creado correctamente.`,
      );

      window.location.assign(
        urlDestino.pathname + urlDestino.search,
      );
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "Ha ocurrido un error inesperado al crear el partido.",
      );
    } finally {
      setGuardando(false);
    }
  }

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <form
      onSubmit={crearPartido}
      className="space-y-6"
    >
      {/* ERRORES */}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/40 bg-error-container p-4 text-sm font-medium text-on-error-container"
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          className="rounded-xl border border-primary/30 bg-primary-fixed p-4 text-sm font-medium text-on-primary-fixed"
        >
          {mensaje}
        </div>
      )}

      {/* EQUIPOS */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-extrabold text-on-surface">
          1. Equipos del partido
        </h3>

        <p className="mt-2 text-sm text-on-surface-variant">
          Selecciona el equipo del C.B. Andratx y
          especifica si juega como local o visitante.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Campo
            titulo="Equipo CBA"
            obligatorio
          >
            <select
              required
              disabled={guardando}
              value={formulario.equipoId}
              onChange={(evento) => {
                const id = evento.target.value;

                const equipo = equipos.find(
                  (elemento) =>
                    elemento.id === id,
                );

                setFormulario((anterior) => ({
                  ...anterior,
                  equipoId: id,
                  categoria:
                    equipo?.categoria ||
                    anterior.categoria,
                }));

                setError(null);
              }}
              className={CLASE_CAMPO}
            >
              <option value="">
                Selecciona un equipo
              </option>

              {equipos.map((equipo) => (
                <option
                  key={equipo.id}
                  value={equipo.id}
                >
                  {nombreEquipo(equipo.nombre)}
                </option>
              ))}
            </select>
          </Campo>

          <Campo titulo="Condición del equipo CBA">
            <select
              value={formulario.posicionEquipoCba}
              disabled={guardando}
              onChange={(evento) =>
                cambiarCampo(
                  "posicionEquipoCba",
                  evento.target.value as PosicionEquipo,
                )
              }
              className={CLASE_CAMPO}
            >
              <option value="local">
                Juega como local
              </option>

              <option value="visitante">
                Juega como visitante
              </option>
            </select>
          </Campo>

          <div className="md:col-span-2">
            <Campo
              titulo="Nombre del equipo rival"
              obligatorio
            >
              <input
                type="text"
                required
                maxLength={200}
                disabled={guardando}
                value={formulario.nombreRival}
                onChange={(evento) =>
                  cambiarCampo(
                    "nombreRival",
                    evento.target.value,
                  )
                }
                placeholder="Nombre completo del rival"
                className={CLASE_CAMPO}
              />
            </Campo>
          </div>
        </div>

        {/* VISTA PREVIA */}

        <div className="mt-5 rounded-xl bg-surface-container-low p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            Vista previa del partido
          </p>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
            <p className="break-words text-right text-sm font-extrabold text-on-surface sm:text-base">
              {equipoLocal || "Equipo local"}
            </p>

            <span className="rounded-lg bg-primary-fixed px-3 py-2 text-xs font-extrabold text-on-primary-fixed">
              VS
            </span>

            <p className="break-words text-left text-sm font-extrabold text-on-surface sm:text-base">
              {equipoVisitante || "Equipo visitante"}
            </p>
          </div>
        </div>
      </section>

      {/* FECHA E INSTALACIÓN */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-extrabold text-on-surface">
          2. Fecha e instalación
        </h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Campo
            titulo="Fecha"
            obligatorio
          >
            <input
              type="date"
              required
              disabled={guardando}
              value={formulario.fecha}
              onChange={(evento) =>
                cambiarCampo(
                  "fecha",
                  evento.target.value,
                )
              }
              className={CLASE_CAMPO}
            />
          </Campo>

          <Campo
            titulo="Hora"
            obligatorio
          >
            <input
              type="time"
              required
              step={60}
              disabled={guardando}
              value={formulario.hora}
              onChange={(evento) =>
                cambiarCampo(
                  "hora",
                  evento.target.value,
                )
              }
              className={CLASE_CAMPO}
            />
          </Campo>

          <div className="md:col-span-2">
            <Campo titulo="Instalación">
              <select
                value={formulario.instalacionId}
                disabled={guardando}
                onChange={(evento) =>
                  cambiarCampo(
                    "instalacionId",
                    evento.target.value,
                  )
                }
                className={CLASE_CAMPO}
              >
                <option value="">
                  Sin instalación asignada
                </option>

                {instalaciones
                  .filter(
                    (instalacion) =>
                      instalacion.activa,
                  )
                  .map((instalacion) => (
                    <option
                      key={instalacion.id}
                      value={instalacion.id}
                    >
                      {instalacion.etiqueta}
                    </option>
                  ))}
              </select>
            </Campo>
          </div>
        </div>
      </section>

      {/* COMPETICIÓN */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-extrabold text-on-surface">
          3. Datos de competición
        </h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Campo titulo="Categoría">
            <input
              type="text"
              maxLength={150}
              disabled={guardando}
              value={formulario.categoria}
              onChange={(evento) =>
                cambiarCampo(
                  "categoria",
                  evento.target.value,
                )
              }
              placeholder="Ej. Mini"
              className={CLASE_CAMPO}
            />
          </Campo>

          <Campo titulo="Grupo">
            <input
              type="text"
              maxLength={150}
              disabled={guardando}
              value={formulario.grupo}
              onChange={(evento) =>
                cambiarCampo(
                  "grupo",
                  evento.target.value,
                )
              }
              placeholder="Ej. Grupo A"
              className={CLASE_CAMPO}
            />
          </Campo>

          <Campo titulo="Jornada">
            <input
              type="text"
              maxLength={100}
              disabled={guardando}
              value={formulario.jornada}
              onChange={(evento) =>
                cambiarCampo(
                  "jornada",
                  evento.target.value,
                )
              }
              placeholder="Ej. 12"
              className={CLASE_CAMPO}
            />
          </Campo>

          <Campo titulo="Competición">
            <input
              type="text"
              maxLength={200}
              disabled={guardando}
              value={formulario.competicion}
              onChange={(evento) =>
                cambiarCampo(
                  "competicion",
                  evento.target.value,
                )
              }
              placeholder="Ej. Torneo amistoso"
              className={CLASE_CAMPO}
            />
          </Campo>
        </div>
      </section>

      {/* NIVELES MÍNIMOS */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-extrabold text-on-surface">
          4. Requisitos de arbitraje
        </h3>

        <p className="mt-2 text-sm text-on-surface-variant">
          Los niveles mínimos son orientativos.
          No impedirán realizar una designación
          si decides seleccionar otra persona.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectorNivel
            titulo="Nivel mínimo de pista"
            valor={formulario.nivelMinimoPista}
            disabled={guardando}
            onChange={(valor) =>
              cambiarCampo(
                "nivelMinimoPista",
                valor,
              )
            }
          />

          <SelectorNivel
            titulo="Nivel mínimo de mesa"
            valor={formulario.nivelMinimoMesa}
            disabled={guardando}
            onChange={(valor) =>
              cambiarCampo(
                "nivelMinimoMesa",
                valor,
              )
            }
          />
        </div>
      </section>

      {/* ANOTACIONES */}

      <section className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-extrabold text-on-surface">
          5. Anotaciones
        </h3>

        <p className="mt-2 text-sm text-on-surface-variant">
          Añade información interna que resulte
          útil para la organización del partido.
        </p>

        <textarea
          rows={4}
          maxLength={5000}
          disabled={guardando}
          value={formulario.anotaciones}
          onChange={(evento) =>
            cambiarCampo(
              "anotaciones",
              evento.target.value,
            )
          }
          placeholder="Observaciones sobre el partido..."
          className={`${CLASE_CAMPO} mt-4`}
        />
      </section>

      {/* CONFIRMACIÓN */}

      <section className="rounded-2xl border border-primary/30 bg-surface-container-lowest p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Temporada {temporada.nombre}
            </p>

            <p className="mt-1 text-lg font-extrabold text-on-surface">
              {siguienteNumeroOrientativo}
            </p>

            <p className="mt-1 text-xs text-on-surface-variant">
              Numeración orientativa. El backend
              asignará el número definitivo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={RUTA_DESIGNACIONES}
              aria-disabled={guardando}
              onClick={(evento) => {
                if (guardando) {
                  evento.preventDefault();
                }
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-outline-variant px-5 text-sm font-bold text-on-surface hover:border-primary hover:text-primary"
            >
              Cancelar
            </a>

            <button
              type="submit"
              disabled={!puedeEnviar}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando
                ? "Creando partido..."
                : "Crear partido CBA"}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
