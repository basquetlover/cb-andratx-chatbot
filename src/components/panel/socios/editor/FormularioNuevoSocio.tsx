import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

type EstadoCarnet = "pendiente" | "activo";

interface TemporadaOpcion {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

interface CredencialesCreadas {
  socioId: string;
  email: string;
  numeroSocio: number;
  numeroCarnet: string;
  passwordCarnet: string;
  emailEnviado: boolean;
}

interface ErrorCampo {
  campo: string;
  mensaje: string;
}

interface RespuestaApi {
  ok: boolean;
  data: unknown;
  error: string | null;
  errores?: ErrorCampo[];
}

const TIPOS_SOCIO_INICIALES = [
  "General",
  "Familiar",
  "Jugador/a",
  "Entrenador/a",
  "Colaborador/a",
  "Directiva",
  "Simpatizante",
];

const claseCampo =
  "h-11 w-full rounded-xl border border-outline-variant " +
  "bg-surface-container-low px-3 text-sm text-on-surface " +
  "outline-none focus:border-primary focus:ring-2 " +
  "focus:ring-primary/20 disabled:opacity-60";

const claseEtiqueta =
  "text-sm font-bold text-on-surface";

const claseSeccion =
  "overflow-hidden rounded-2xl border border-outline-variant/60 " +
  "bg-surface-container-lowest shadow-sm";

const claseBotonSecundario =
  "inline-flex min-h-11 items-center justify-center rounded-xl " +
  "border border-outline-variant px-5 py-3 text-sm font-bold " +
  "text-on-surface transition-colors hover:bg-surface-container";

function esObjeto(
  valor: unknown,
): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor)
  );
}

function convertirTexto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number"
    ? String(valor).trim()
    : "";
}

function convertirNumero(valor: unknown): number | null {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isSafeInteger(numero) && numero >= 1
    ? numero
    : null;
}

function obtenerFechaMadrid(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const anio = partes.find(
    (parte) => parte.type === "year",
  )?.value;

  const mes = partes.find(
    (parte) => parte.type === "month",
  )?.value;

  const dia = partes.find(
    (parte) => parte.type === "day",
  )?.value;

  return anio && mes && dia
    ? `${anio}-${mes}-${dia}`
    : "";
}

function formatearFecha(fecha: string): string {
  if (!fecha) {
    return "Se asignará al crear el carnet";
  }

  const fechaConvertida = new Date(
    `${fecha}T12:00:00.000Z`,
  );

  if (!Number.isFinite(fechaConvertida.getTime())) {
    return "Se asignará al crear el carnet";
  }

  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fechaConvertida);
}

function convertirTemporada(
  valor: unknown,
): TemporadaOpcion | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const id = convertirTexto(valor.id);

  if (!id) {
    return null;
  }

  return {
    id,
    nombre: convertirTexto(valor.nombre) || "Temporada",
    fechaInicio: convertirTexto(
      valor.fechaInicio ?? valor.fecha_inicio,
    ),
    fechaFin: convertirTexto(
      valor.fechaFin ?? valor.fecha_fin,
    ),
    activa: valor.activa === true,
  };
}

function extraerOpciones(valor: unknown): {
  temporadas: TemporadaOpcion[];
  temporadaActiva: TemporadaOpcion | null;
  tiposSocio: string[];
} {
  if (!esObjeto(valor)) {
    return {
      temporadas: [],
      temporadaActiva: null,
      tiposSocio: [],
    };
  }

  const opciones = esObjeto(valor.opciones)
    ? valor.opciones
    : valor;

  const temporadas = Array.isArray(opciones.temporadas)
    ? opciones.temporadas.flatMap((elemento) => {
        const temporada = convertirTemporada(elemento);
        return temporada ? [temporada] : [];
      })
    : [];

  const temporadaActiva =
    convertirTemporada(
      opciones.temporadaActiva ?? opciones.temporada_activa,
    ) ??
    temporadas.find((temporada) => temporada.activa) ??
    null;

  const tiposSocio = Array.isArray(opciones.tiposSocio)
    ? opciones.tiposSocio.flatMap((elemento) => {
        if (typeof elemento === "string") {
          const tipo = elemento.trim();
          return tipo ? [tipo] : [];
        }

        if (esObjeto(elemento)) {
          const tipo = convertirTexto(
            elemento.valor ?? elemento.nombre,
          );

          return tipo ? [tipo] : [];
        }

        return [];
      })
    : [];

  return {
    temporadas,
    temporadaActiva,
    tiposSocio: [...new Set(tiposSocio)],
  };
}

function extraerCredenciales(
  valor: unknown,
): CredencialesCreadas | null {
  if (!esObjeto(valor)) {
    return null;
  }

  const socio = esObjeto(valor.socio)
    ? valor.socio
    : null;

  const credenciales = esObjeto(valor.credenciales)
    ? valor.credenciales
    : null;

  if (!socio || !credenciales) {
    return null;
  }

  const socioId = convertirTexto(socio.id);
  const email = convertirTexto(credenciales.email);

  const numeroSocio = convertirNumero(
    credenciales.numeroSocio ?? credenciales.numero_socio,
  );

  const numeroCarnet = convertirTexto(
    credenciales.numeroCarnet ?? credenciales.numero_carnet,
  );

  const passwordCarnet = convertirTexto(
    credenciales.passwordCarnet ??
      credenciales.password_carnet,
  );

  if (
    !socioId ||
    !email ||
    numeroSocio === null ||
    !numeroCarnet ||
    !passwordCarnet
  ) {
    return null;
  }

  return {
    socioId,
    email,
    numeroSocio,
    numeroCarnet,
    passwordCarnet,
    emailEnviado:
      valor.emailEnviado === true ||
      valor.email_enviado === true,
  };
}

function extraerErroresCampo(valor: unknown): ErrorCampo[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor.flatMap((elemento) => {
    if (!esObjeto(elemento)) {
      return [];
    }

    const campo = convertirTexto(elemento.campo);
    const mensaje = convertirTexto(elemento.mensaje);

    return campo && mensaje ? [{ campo, mensaje }] : [];
  });
}

export default function FormularioNuevoSocio() {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [socioActivo, setSocioActivo] = useState(true);

  const [temporadaId, setTemporadaId] = useState("");
  const [tipoSocio, setTipoSocio] = useState("General");

  const [estadoCarnet, setEstadoCarnet] =
    useState<EstadoCarnet>("activo");

  const [fechaAlta, setFechaAlta] = useState("");
  const [fechaCaducidad, setFechaCaducidad] = useState("");

  const [temporadas, setTemporadas] =
    useState<TemporadaOpcion[]>([]);

  const [tiposSocio, setTiposSocio] =
    useState<string[]>(TIPOS_SOCIO_INICIALES);

  const [cargandoOpciones, setCargandoOpciones] =
    useState(true);

  const [errorOpciones, setErrorOpciones] =
    useState<string | null>(null);

  const [intentoOpciones, setIntentoOpciones] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [erroresCampo, setErroresCampo] =
    useState<ErrorCampo[]>([]);

  const [credenciales, setCredenciales] =
    useState<CredencialesCreadas | null>(null);

  const [textoCopiado, setTextoCopiado] =
    useState<string | null>(null);

  const enviandoRef = useRef(false);
  const temporizadorCopiadoRef = useRef<number | null>(null);

  const temporadaSeleccionada = temporadas.find(
    (temporada) => temporada.id === temporadaId,
  );

  useEffect(() => {
    function actualizarFecha() {
      setFechaAlta(obtenerFechaMadrid());
    }

    actualizarFecha();

    const intervalo = window.setInterval(
      actualizarFecha,
      60_000,
    );

    window.addEventListener("focus", actualizarFecha);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizarFecha);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (temporizadorCopiadoRef.current !== null) {
        window.clearTimeout(temporizadorCopiadoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarOpciones() {
      setCargandoOpciones(true);
      setErrorOpciones(null);

      try {
        const respuesta = await fetch(
          "/api/panel/socios/opciones",
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
            signal: controlador.signal,
          },
        );

        const contenido =
          (await respuesta.json()) as RespuestaApi;

        if (
          !respuesta.ok ||
          !contenido.ok ||
          !contenido.data
        ) {
          throw new Error(
            contenido.error ||
              "No se han podido cargar las opciones.",
          );
        }

        const opciones = extraerOpciones(contenido.data);

        if (controlador.signal.aborted) {
          return;
        }

        setTemporadas(opciones.temporadas);

        if (opciones.tiposSocio.length > 0) {
          setTiposSocio(opciones.tiposSocio);
          setTipoSocio(opciones.tiposSocio[0]);
        }

        const temporadaInicial = opciones.temporadaActiva;

        setTemporadaId(temporadaInicial?.id ?? "");
        setFechaCaducidad(temporadaInicial?.fechaFin ?? "");
      } catch (errorCarga) {
        if (controlador.signal.aborted) {
          return;
        }

        setErrorOpciones(
          errorCarga instanceof Error
            ? errorCarga.message
            : "No se han podido cargar las opciones.",
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCargandoOpciones(false);
        }
      }
    }

    void cargarOpciones();

    return () => {
      controlador.abort();
    };
  }, [intentoOpciones]);

  function cambiarTemporada(nuevaTemporadaId: string) {
    setTemporadaId(nuevaTemporadaId);

    const temporada = temporadas.find(
      (elemento) => elemento.id === nuevaTemporadaId,
    );

    setFechaCaducidad(temporada?.fechaFin ?? "");
    setErroresCampo([]);
    setError(null);
  }

  function obtenerErrorCampo(campo: string): string | null {
    return (
      erroresCampo.find(
        (elemento) =>
          elemento.campo === campo ||
          elemento.campo.endsWith(`.${campo}`),
      )?.mensaje ?? null
    );
  }

  function mostrarErrorCampo(campo: string) {
    const mensaje = obtenerErrorCampo(campo);

    return mensaje ? (
      <span className="text-xs text-error">
        {mensaje}
      </span>
    ) : null;
  }

  async function guardarSocio(
    evento: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    evento.preventDefault();

    if (
      enviandoRef.current ||
      credenciales ||
      cargandoOpciones ||
      errorOpciones
    ) {
      return;
    }

    if (!temporadaId) {
      setError("Debes seleccionar una temporada.");
      return;
    }

    enviandoRef.current = true;
    setGuardando(true);
    setError(null);
    setErroresCampo([]);

    const fechaActual = obtenerFechaMadrid();
    setFechaAlta(fechaActual);

    try {
      const respuesta = await fetch("/api/panel/socios", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono.trim() || null,
          observaciones: observaciones.trim() || null,
          activo: socioActivo,
          carnet: {
            temporadaId,
            tipoSocio,
            estado: estadoCarnet,

            // Se mantiene la estructura actual de la petición.
            // El servidor calcula su propia fecha al guardar.
            fechaAlta: fechaActual,

            fechaCaducidad,
          },
        }),
      });

      const contenido =
        (await respuesta.json()) as RespuestaApi;

      if (
        !respuesta.ok ||
        !contenido.ok ||
        !contenido.data
      ) {
        setErroresCampo(
          extraerErroresCampo(contenido.errores),
        );

        throw new Error(
          contenido.error ||
            "No se ha podido crear el socio.",
        );
      }

      const nuevasCredenciales =
        extraerCredenciales(contenido.data);

      if (!nuevasCredenciales) {
        throw new Error(
          "El socio se ha creado, pero no se han podido mostrar sus credenciales. Revisa el listado antes de volver a enviarlo.",
        );
      }

      setCredenciales(nuevasCredenciales);
    } catch (errorGuardado) {
      setError(
        errorGuardado instanceof Error
          ? errorGuardado.message
          : "No se ha podido crear el socio.",
      );
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  }

  async function copiarTexto(
    valor: string,
    identificador: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(valor);
      setError(null);
      setTextoCopiado(identificador);

      if (temporizadorCopiadoRef.current !== null) {
        window.clearTimeout(temporizadorCopiadoRef.current);
      }

      temporizadorCopiadoRef.current = window.setTimeout(
        () => {
          setTextoCopiado(null);
          temporizadorCopiadoRef.current = null;
        },
        1800,
      );
    } catch {
      setError(
        "No se ha podido copiar el texto. Selecciónalo y cópialo manualmente.",
      );
    }
  }

  if (credenciales) {
    const camposCredenciales = [
      {
        id: "email",
        etiqueta: "Usuario",
        valor: credenciales.email,
      },
      {
        id: "numero-socio",
        etiqueta: "Número de socio de la temporada",
        valor: String(credenciales.numeroSocio),
      },
      {
        id: "carnet",
        etiqueta: "Número de carnet",
        valor: credenciales.numeroCarnet,
      },
      {
        id: "password",
        etiqueta: "Contraseña del carnet",
        valor: credenciales.passwordCarnet,
      },
    ];

    return (
      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-success/40 bg-surface-container-lowest shadow-sm">
        <header className="bg-success px-6 py-6 text-on-success">
          <p className="text-sm font-bold uppercase tracking-wider opacity-80">
            Socio creado
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            Credenciales del carnet
          </h2>
          <p className="mt-2 text-sm leading-6 opacity-90">
            Estas credenciales pertenecen al carnet de la
            temporada seleccionada.
          </p>
        </header>

        <div className="grid gap-5 p-6">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-error/40 bg-error-container p-4 text-sm text-on-error-container"
            >
              {error}
            </p>
          )}

          <div className="rounded-2xl border border-primary/30 bg-primary-fixed p-5 text-on-primary-fixed">
            <dl className="divide-y divide-on-primary-fixed/20">
              {camposCredenciales.map((campo) => (
                <div
                  key={campo.id}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <dt className="text-xs font-bold uppercase tracking-wide opacity-70">
                    {campo.etiqueta}
                  </dt>
                  <dd className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all font-mono text-lg font-bold">
                      {campo.valor}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        void copiarTexto(campo.valor, campo.id)
                      }
                      aria-label={`Copiar ${campo.etiqueta.toLowerCase()}`}
                      className="w-fit shrink-0 rounded-lg border border-on-primary-fixed/30 px-3 py-1.5 text-xs font-bold"
                    >
                      {textoCopiado === campo.id
                        ? "Copiado"
                        : "Copiar"}
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              credenciales.emailEnviado
                ? "border-success/30 bg-success/10 text-success"
                : "border-outline-variant bg-surface-container-low text-on-surface-variant"
            }`}
          >
            {credenciales.emailEnviado
              ? "El correo con las credenciales de este carnet se ha enviado correctamente."
              : "El correo todavía no se ha enviado. Conserva estas credenciales para poder facilitárselas al socio."}
          </p>

          <p className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-xs leading-5 text-on-surface-variant">
            Cada temporada tendrá su propio número de socio,
            carnet y contraseña. Los carnets anteriores se
            conservarán como historial.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <a
              href="/panel/socios"
              className={claseBotonSecundario}
            >
              Volver al listado
            </a>
            <a
              href={`/panel/socios/${encodeURIComponent(
                credenciales.socioId,
              )}`}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim"
            >
              Abrir ficha del socio
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={guardarSocio}
      className="grid gap-5"
      aria-busy={guardando}
    >
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container"
        >
          <p className="font-bold">No se ha podido guardar</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {errorOpciones && (
        <div
          role="alert"
          className="rounded-2xl border border-error/40 bg-error-container p-5 text-on-error-container"
        >
          <p className="font-bold">
            No se han podido cargar las opciones
          </p>
          <p className="mt-1 text-sm">{errorOpciones}</p>
          <button
            type="button"
            onClick={() =>
              setIntentoOpciones((valor) => valor + 1)
            }
            disabled={cargandoOpciones}
            className="mt-3 rounded-lg border border-current px-4 py-2 text-sm font-bold disabled:opacity-50"
          >
            Volver a intentarlo
          </button>
        </div>
      )}

      <section className={claseSeccion}>
        <header className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-on-surface">
            Datos del socio
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Estos datos identifican a la persona y se mantienen
            entre temporadas.
          </p>
        </header>

        <fieldset
          disabled={guardando}
          className="grid min-w-0 gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>Nombre</span>
            <input
              type="text"
              value={nombre}
              onChange={(evento) =>
                setNombre(evento.target.value)
              }
              required
              maxLength={100}
              autoComplete="given-name"
              className={claseCampo}
            />
            {mostrarErrorCampo("nombre")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>Apellidos</span>
            <input
              type="text"
              value={apellidos}
              onChange={(evento) =>
                setApellidos(evento.target.value)
              }
              required
              maxLength={150}
              autoComplete="family-name"
              className={claseCampo}
            />
            {mostrarErrorCampo("apellidos")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Correo electrónico
            </span>
            <input
              type="email"
              value={email}
              onChange={(evento) =>
                setEmail(evento.target.value)
              }
              required
              maxLength={254}
              autoComplete="email"
              className={claseCampo}
            />
            {mostrarErrorCampo("email")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>Teléfono</span>
            <input
              type="tel"
              value={telefono}
              onChange={(evento) =>
                setTelefono(evento.target.value)
              }
              maxLength={30}
              autoComplete="tel"
              className={claseCampo}
            />
            {mostrarErrorCampo("telefono")}
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={claseEtiqueta}>
              Observaciones internas
            </span>
            <textarea
              value={observaciones}
              onChange={(evento) =>
                setObservaciones(evento.target.value)
              }
              maxLength={2000}
              rows={4}
              className="resize-y rounded-xl border border-outline-variant bg-surface-container-low px-3 py-3 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {mostrarErrorCampo("observaciones")}
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 sm:col-span-2">
            <span>
              <span className="block text-sm font-bold text-on-surface">
                Socio activo
              </span>
              <span className="mt-1 block text-xs text-on-surface-variant">
                Si se desactiva, no podrá utilizar ningún carnet.
              </span>
            </span>
            <input
              type="checkbox"
              checked={socioActivo}
              onChange={(evento) =>
                setSocioActivo(evento.target.checked)
              }
              className="h-5 w-5 accent-primary"
            />
          </label>
        </fieldset>
      </section>

      <section className={claseSeccion}>
        <header className="border-b border-outline-variant/60 px-5 py-5 sm:px-6">
          <h2 className="text-xl font-bold text-on-surface">
            Primer carnet
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Se asignará automáticamente el siguiente número
            disponible de la temporada.
          </p>
          <p className="mt-2 text-xs leading-5 text-on-surface-variant">
            El número de carnet será también su contraseña
            de acceso.
          </p>
        </header>

        <fieldset
          disabled={
            guardando ||
            cargandoOpciones ||
            Boolean(errorOpciones)
          }
          className="grid min-w-0 gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="grid gap-1.5 sm:col-span-2">
            <span className={claseEtiqueta}>Temporada</span>
            <select
              value={temporadaId}
              onChange={(evento) =>
                cambiarTemporada(evento.target.value)
              }
              required
              className={claseCampo}
            >
              <option value="">
                {cargandoOpciones
                  ? "Cargando temporadas..."
                  : "Selecciona una temporada"}
              </option>
              {temporadas.map((temporada) => (
                <option
                  key={temporada.id}
                  value={temporada.id}
                >
                  {temporada.nombre}
                  {temporada.activa ? " · Activa" : ""}
                </option>
              ))}
            </select>
            {mostrarErrorCampo("temporadaId")}

            {!cargandoOpciones &&
              !errorOpciones &&
              temporadas.length === 0 && (
                <span className="text-xs text-error">
                  No hay temporadas disponibles para crear
                  el carnet.
                </span>
              )}

            {temporadaSeleccionada && (
              <span className="text-xs text-on-surface-variant">
                Del{" "}
                {formatearFecha(
                  temporadaSeleccionada.fechaInicio,
                )}{" "}
                al{" "}
                {formatearFecha(
                  temporadaSeleccionada.fechaFin,
                )}
                .
              </span>
            )}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Tipo de socio
            </span>
            <select
              value={tipoSocio}
              onChange={(evento) =>
                setTipoSocio(evento.target.value)
              }
              required
              className={claseCampo}
            >
              {tiposSocio.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            {mostrarErrorCampo("tipoSocio")}
          </label>

          <label className="grid gap-1.5">
            <span className={claseEtiqueta}>
              Estado inicial
            </span>
            <select
              value={estadoCarnet}
              onChange={(evento) => {
                const estado = evento.target.value;

                if (
                  estado === "activo" ||
                  estado === "pendiente"
                ) {
                  setEstadoCarnet(estado);
                }
              }}
              className={claseCampo}
            >
              <option value="activo">Activo</option>
              <option value="pendiente">Pendiente</option>
            </select>
            {mostrarErrorCampo("estado")}
          </label>

          <div className="grid content-start gap-1.5">
            <span
              id="etiqueta-fecha-alta-socio"
              className={claseEtiqueta}
            >
              Fecha de alta
            </span>
            <output
              aria-labelledby="etiqueta-fecha-alta-socio"
              className="flex min-h-11 items-center rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm font-semibold text-on-surface"
            >
              {formatearFecha(fechaAlta)}
            </output>
            <p className="text-xs leading-5 text-on-surface-variant">
              Se asignará automáticamente el día en que
              crees el carnet.
            </p>
            {mostrarErrorCampo("fechaAlta")}
          </div>

          <label className="grid content-start gap-1.5">
            <span className={claseEtiqueta}>
              Fecha de caducidad
            </span>
            <input
              type="date"
              value={fechaCaducidad}
              onChange={(evento) =>
                setFechaCaducidad(evento.target.value)
              }
              max={
                temporadaSeleccionada?.fechaFin || undefined
              }
              required
              className={claseCampo}
            />
            {mostrarErrorCampo("fechaCaducidad")}
          </label>
        </fieldset>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <a
          href="/panel/socios"
          className={claseBotonSecundario}
        >
          Cancelar
        </a>

        <button
          type="submit"
          disabled={
            guardando ||
            cargandoOpciones ||
            Boolean(errorOpciones) ||
            !temporadaId
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition-colors hover:bg-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando
            ? "Creando socio..."
            : "Crear socio y carnet"}
        </button>
      </div>
    </form>
  );
}