
import {
  useEffect,
  useRef,
  useState,
} from "react";

import MensajeIA from "@components/MensajeIA";
import MensajeUsuario from "@components/MensajeUsuario";
import SeleccionEquipo from "@components/formularios/SeleccionEquipo";
import RespuestaHorariosEntrenamiento from "@components/resultados/RespuestaHorariosEntrenamiento";

import type {
  EquipoDisponible,
} from "@tipos/Equipo";

import type {
  RespuestaEntrenamientosApi,
  ResultadoEntrenamientos,
} from "@tipos/Entrenamiento";

interface Propiedades {
  alCompletar: () => void;
}

interface EquipoConError {
  id: string;
  nombre: string;
}

type EstadoAcceso =
  | "comprobando"
  | "autorizado"
  | "sin-sesion"
  | "carnet-no-valido"
  | "error-comprobacion";

class ErrorAccesoEntrenamientos extends Error {
  estadoHttp: 401 | 403;

  constructor(
    estadoHttp: 401 | 403,
  ) {
    super("Acceso restringido a socios");

    this.name =
      "ErrorAccesoEntrenamientos";

    this.estadoHttp = estadoHttp;
  }
}

export default function HorariosEntrenamiento({
  alCompletar,
}: Propiedades) {
  const [
    estadoAcceso,
    setEstadoAcceso,
  ] = useState<EstadoAcceso>(
    "comprobando",
  );

  const [
    revisionAcceso,
    setRevisionAcceso,
  ] = useState(0);

  const [
    equiposSeleccionados,
    setEquiposSeleccionados,
  ] = useState<EquipoDisponible[]>([]);

  const [
    seleccionConfirmada,
    setSeleccionConfirmada,
  ] = useState(false);

  const [
    resultados,
    setResultados,
  ] = useState<
    ResultadoEntrenamientos[]
  >([]);

  const [
    equiposConError,
    setEquiposConError,
  ] = useState<
    EquipoConError[]
  >([]);

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    intento,
    setIntento,
  ] = useState(0);

  const alCompletarRef =
    useRef(alCompletar);

  const flujoFinalizadoRef =
    useRef(false);

  useEffect(() => {
    alCompletarRef.current =
      alCompletar;
  }, [alCompletar]);

  function finalizarFlujo() {
    if (
      flujoFinalizadoRef.current
    ) {
      return;
    }

    flujoFinalizadoRef.current =
      true;

    alCompletarRef.current();
  }

  function denegarAcceso(
    estadoHttp: 401 | 403,
  ) {
    setEstadoAcceso(
      estadoHttp === 401
        ? "sin-sesion"
        : "carnet-no-valido",
    );

    setResultados([]);
    setEquiposConError([]);
    setCargando(false);

    finalizarFlujo();
  }

  // Comprobar acceso antes de
  // permitir seleccionar equipos.

  useEffect(() => {
    const controlador =
      new AbortController();

    async function comprobarSesion() {
      setEstadoAcceso(
        "comprobando",
      );

      try {
        // La API comprueba primero
        // la sesión del socio.
        //
        // Sin equipoId:
        // 400 = socio autorizado
        // 401 = sesión no válida
        // 403 = carnet no válido

        const respuesta =
          await fetch(
            "/api/entrenamientos/semana",
            {
              method: "GET",

              credentials:
                "same-origin",

              cache: "no-store",

              headers: {
                Accept:
                  "application/json",
              },

              signal:
                controlador.signal,
            },
          );

        if (
          controlador.signal.aborted
        ) {
          return;
        }

        if (
          respuesta.status === 401 ||
          respuesta.status === 403
        ) {
          denegarAcceso(
            respuesta.status,
          );

          return;
        }

        if (
          respuesta.status === 400
        ) {
          setEstadoAcceso(
            "autorizado",
          );

          return;
        }

        throw new Error(
          "No se ha podido comprobar el acceso.",
        );
      } catch (error) {
        if (
          controlador.signal.aborted
        ) {
          return;
        }

        console.error(
          "Error comprobando el acceso a los entrenamientos:",
          error,
        );

        setEstadoAcceso(
          "error-comprobacion",
        );
      }
    }

    void comprobarSesion();

    return () => {
      controlador.abort();
    };
  }, [revisionAcceso]);

  // Consultar entrenamientos
  // únicamente cuando existe
  // una sesión autorizada.

  useEffect(() => {
    if (
      estadoAcceso !==
        "autorizado" ||
      !seleccionConfirmada ||
      equiposSeleccionados.length === 0
    ) {
      return;
    }

    const controlador =
      new AbortController();

    async function cargarEntrenamientos() {
      setCargando(true);
      setResultados([]);
      setEquiposConError([]);

      const consultas =
        equiposSeleccionados.map(
          async (equipo) => {
            const parametros =
              new URLSearchParams({
                equipoId: equipo.id,
              });

            const respuesta =
              await fetch(
                `/api/entrenamientos/semana?${parametros.toString()}`,
                {
                  method: "GET",

                  credentials:
                    "same-origin",

                  cache: "no-store",

                  headers: {
                    Accept:
                      "application/json",
                  },

                  signal:
                    controlador.signal,
                },
              );

            if (
              respuesta.status === 401 ||
              respuesta.status === 403
            ) {
              throw new ErrorAccesoEntrenamientos(
                respuesta.status,
              );
            }

            const contenido =
              (await respuesta.json()) as
                RespuestaEntrenamientosApi;

            if (
              !respuesta.ok ||
              !contenido.ok ||
              !contenido.data
            ) {
              throw new Error(
                contenido.error ??
                  "No se han podido obtener los entrenamientos",
              );
            }

            return contenido.data;
          },
        );

      const respuestas =
        await Promise.allSettled(
          consultas,
        );

      if (
        controlador.signal.aborted
      ) {
        return;
      }

      const errorAcceso =
        respuestas.find(
          (respuesta) =>
            respuesta.status ===
              "rejected" &&
            respuesta.reason instanceof
              ErrorAccesoEntrenamientos,
        );

      if (
        errorAcceso?.status ===
          "rejected" &&
        errorAcceso.reason instanceof
          ErrorAccesoEntrenamientos
      ) {
        denegarAcceso(
          errorAcceso.reason
            .estadoHttp,
        );

        return;
      }

      const resultadosCorrectos:
        ResultadoEntrenamientos[] =
        [];

      const errores:
        EquipoConError[] = [];

      respuestas.forEach(
        (respuesta, indice) => {
          const equipo =
            equiposSeleccionados[
              indice
            ];

          if (
            respuesta.status ===
            "fulfilled"
          ) {
            resultadosCorrectos.push(
              respuesta.value,
            );

            return;
          }

          console.error(
            `Error al consultar los entrenamientos de ${
              equipo.nombre ??
              equipo.nombreCorto ??
              "Equipo"
            }:`,
            respuesta.reason,
          );

          errores.push({
            id: equipo.id,

            nombre:
              equipo.nombre ??
              equipo.nombreCorto ??
              "Equipo",
          });
        },
      );

      setResultados(
        resultadosCorrectos,
      );

      setEquiposConError(
        errores,
      );

      setCargando(false);

      if (
        errores.length === 0
      ) {
        finalizarFlujo();
      }
    }

    void cargarEntrenamientos();

    return () => {
      controlador.abort();
    };
  }, [
    estadoAcceso,
    seleccionConfirmada,
    equiposSeleccionados,
    intento,
  ]);

  return (
    <>
      {estadoAcceso ===
        "comprobando" && (
        <MensajeIA>
          <div
            className="flex items-center gap-3"
            role="status"
          >
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-secondary"
              aria-hidden="true"
            />

            <p className="text-sm text-on-surface-variant">
              Comprobando acceso
              de socio...
            </p>
          </div>
        </MensajeIA>
      )}

      {(estadoAcceso ===
        "sin-sesion" ||
        estadoAcceso ===
          "carnet-no-valido") && (
        <MensajeIA>
          <div role="alert">
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                  />

                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>

              <div className="min-w-0">
                <p className="font-bold text-on-secondary-fixed">
                  Información exclusiva
                  para socios
                </p>

                {estadoAcceso ===
                  "sin-sesion" ? (
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Los horarios de
                    entrenamiento,
                    modificaciones y
                    cancelaciones solo
                    están disponibles
                    para los socios
                    del club.
                    Para consultarlos,
                    inicia sesión con
                    tu cuenta de socio.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    Esta información
                    está reservada para
                    socios con un carnet
                    activo de la
                    temporada actual.
                    No hemos podido
                    validar tu carnet.
                    Si crees que se
                    trata de un error,
                    contacta con
                    el club.
                  </p>
                )}
              </div>
            </div>

            <a
              href="/socios/iniciar-sesion"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:opacity-90"
            >
              Iniciar sesión como socio
            </a>
          </div>
        </MensajeIA>
      )}

      {estadoAcceso ===
        "error-comprobacion" && (
        <MensajeIA>
          <div role="alert">
            <p className="font-bold text-error">
              No se ha podido comprobar
              tu acceso
            </p>

            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Ha ocurrido un error
              al comprobar tu sesión
              de socio.
            </p>

            <button
              type="button"
              onClick={() =>
                setRevisionAcceso(
                  (valor) =>
                    valor + 1,
                )
              }
              className="mt-4 rounded-xl border border-primary px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary-container"
            >
              Volver a intentarlo
            </button>
          </div>
        </MensajeIA>
      )}

      {estadoAcceso ===
        "autorizado" && (
        <>
          <SeleccionEquipo
            modo="multiple"
            equiposSeleccionados={
              equiposSeleccionados
            }
            seleccionConfirmada={
              seleccionConfirmada
            }
            maximo={5}
            alCambiarSeleccion={
              setEquiposSeleccionados
            }
            alConfirmar={() =>
              setSeleccionConfirmada(
                true,
              )
            }
          />

          {seleccionConfirmada && (
            <MensajeUsuario>
              <p className="text-sm text-secondary-fixed">
                Equipos seleccionados:
              </p>

              <ul className="mt-1 flex flex-col gap-1">
                {equiposSeleccionados.map(
                  (equipo) => (
                    <li
                      key={
                        equipo.id
                      }
                      className="font-semibold"
                    >
                      {equipo.nombre ??
                        equipo.nombreCorto ??
                        "Equipo"}
                    </li>
                  ),
                )}
              </ul>
            </MensajeUsuario>
          )}

          {cargando && (
            <MensajeIA>
              <div
                className="flex items-center gap-3"
                role="status"
              >
                <span
                  className="h-5 w-5 animate-spin rounded-full border-2 border-outline-variant border-t-secondary"
                  aria-hidden="true"
                />

                <p className="text-sm text-on-surface-variant">
                  {equiposSeleccionados.length ===
                  1
                    ? "Consultando los entrenamientos de esta semana..."
                    : `Consultando los entrenamientos de ${equiposSeleccionados.length} equipos...`}
                </p>
              </div>
            </MensajeIA>
          )}

          {!cargando &&
            resultados.map(
              (resultado) => (
                <RespuestaHorariosEntrenamiento
                  key={
                    resultado.equipo.id
                  }
                  resultado={
                    resultado
                  }
                />
              ),
            )}

          {!cargando &&
            equiposConError.length >
              0 && (
              <MensajeIA>
                <div role="alert">
                  <p className="font-semibold text-error">
                    {equiposConError.length ===
                    1
                      ? "No se han podido cargar los entrenamientos de un equipo"
                      : "No se han podido cargar los entrenamientos de algunos equipos"}
                  </p>

                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-on-surface-variant">
                    {equiposConError.map(
                      (equipo) => (
                        <li key={equipo.id}>
                          {
                            equipo.nombre
                          }
                        </li>
                      ),
                    )}
                  </ul>

                  <button
                    type="button"
                    onClick={() =>
                      setIntento(
                        (valor) =>
                          valor + 1,
                      )
                    }
                    className="mt-4 rounded-xl border border-error px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container"
                  >
                    Volver a intentarlo
                  </button>
                </div>
              </MensajeIA>
            )}
        </>
      )}
    </>
  );
}
