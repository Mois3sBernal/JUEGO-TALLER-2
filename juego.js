/*
 * EL TESORO CONGELADO
 * Juego de dos jugadores hecho solo con HTML, CSS y JavaScript.
 *
 * Reglas del taller que se integraron: B, C y D.
 *   Regla B: cada 4 jugadas exitosas dos cofres se intercambian de posicion.
 *   Regla C: un cofre con hielo no suma puntos, congela el siguiente turno
 *            del jugador y pone el fondo en rojo durante esa ronda.
 *   Regla D: al abrirse la mitad de los cofres la condicion de victoria se invierte.
 *
 * Los requisitos obligatorios estan marcados en los comentarios como [REQ 1] ... [REQ 7].
 */

/* =====================================================================
 * [REQ 1] VARIABLES Y TIPOS PRIMITIVOS
 * ===================================================================== */
const TOTAL_COFRES = 16;                      // number (constante)
const COFRES_CON_HIELO = 2;                   // number
const META_FASE_UNO = 12;                     // number: puntos para ganar en la fase 1
const MITAD_INTENTOS = TOTAL_COFRES / 2;      // number: aqui se invierte la victoria (Regla D)
const JUGADAS_PARA_INTERCAMBIO = 4;           // number: cada cuantas jugadas se intercambia (Regla B)
const NOMBRE_JUEGO = "El Tesoro Congelado";   // string

let juegoActivo = false;            // boolean: true mientras la partida esta en curso
let condicionInvertida = false;     // boolean: pasa a true al llegar a la mitad (Regla D)
let esperandoContinuar = false;     // boolean: true cuando el jugador en turno esta congelado
let turnoActual = 0;                // number: 0 = jugador 1, 1 = jugador 2
let cofresAbiertos = 0;             // number: intentos realizados
let jugadasExitosas = 0;            // number: cofres con puntos abiertos (Regla B)
let ganadorFinal = null;            // null mientras no haya ganador, luego un number (0 o 1) o -1 si hay empate
let textoMensaje = "";              // string: ultimo mensaje mostrado al jugador

/* =====================================================================
 * [REQ 3] ARREGLOS (ARRAYS)
 * ===================================================================== */
// Valores de los cofres con puntos (14 cofres). Los otros 2 son de hielo.
const valoresBase = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5];

// Arreglo logico del tablero: cada posicion guarda un objeto cofre.
let cofres = [];

// Arreglo con los dos jugadores de la partida.
let jugadores = [];

// Arreglo con las posiciones de los cofres que se intercambiaron en la ultima vez (Regla B).
let cofresMovidos = [];

/* =====================================================================
 * [REQ 6] EVENTOS DEL NAVEGADOR (se registran al final del archivo)
 * [REQ 7] MANIPULACION DEL DOM: referencias a los elementos de la pagina
 * ===================================================================== */
const pantallaInicio = document.getElementById("pantalla-inicio");
const pantallaJuego = document.getElementById("pantalla-juego");
const tablero = document.getElementById("tablero");
const textoFase = document.getElementById("fase");
const textoTurno = document.getElementById("turno");
const textoMensajeDom = document.getElementById("mensaje");
const botonContinuar = document.getElementById("btn-continuar");

/* =====================================================================
 * [REQ 4] OBJETOS LITERALES
 * ===================================================================== */
// Objeto con los textos fijos del juego.
const TEXTOS = {
  fase1: "FASE 1: gana el primero que llegue a " + META_FASE_UNO + " puntos",
  fase2: "FASE 2 (victoria invertida): gana quien tenga MENOS puntos",
  inversion: "Se abrio la mitad de los cofres. Ahora gana quien tenga menos puntos.",
  empate: "Empate. Los dos jugadores tienen los mismos puntos."
};

// Cada jugador y cada cofre tambien se representan con objetos literales (ver abajo).

/* =====================================================================
 * [REQ 5] FUNCIONES (declaradas y flecha)
 * ===================================================================== */

// Funcion flecha: numero entero aleatorio entre 0 y limite - 1.
const aleatorio = (limite) => Math.floor(Math.random() * limite);

// Funcion flecha: crea el objeto de un jugador.
const crearJugador = (nombre) => {
  return { nombre: nombre, puntos: 0, congelado: false };
};

// Funcion declarada: arma el arreglo de cofres y lo mezcla.
function crearCofres() {
  const lista = [];

  // Cofres con puntos
  for (let i = 0; i < valoresBase.length; i++) {
    lista.push({ tipo: "puntos", valor: valoresBase[i], abierto: false });
  }
  // Cofres con hielo (Regla C)
  for (let i = 0; i < COFRES_CON_HIELO; i++) {
    lista.push({ tipo: "hielo", valor: 0, abierto: false });
  }

  // Mezcla de Fisher-Yates
  for (let i = lista.length - 1; i > 0; i--) {
    const j = aleatorio(i + 1);
    const guardado = lista[i];
    lista[i] = lista[j];
    lista[j] = guardado;
  }
  return lista;
}

// Funcion declarada: devuelve el indice del otro jugador usando un ternario.
function otroJugador(indice) {
  return indice === 0 ? 1 : 0;
}

/* ---------- Inicio de la partida ---------- */
function iniciarPartida() {
  const nombre0 = document.getElementById("nombre-0").value.trim();
  const nombre1 = document.getElementById("nombre-1").value.trim();

  // [REQ 2] Condicional: si el campo esta vacio se usa un nombre por defecto
  jugadores = [
    crearJugador(nombre0 === "" ? "Jugador 1" : nombre0),
    crearJugador(nombre1 === "" ? "Jugador 2" : nombre1)
  ];

  cofres = crearCofres();
  cofresMovidos = [];
  juegoActivo = true;
  condicionInvertida = false;
  esperandoContinuar = false;
  turnoActual = 0;
  cofresAbiertos = 0;
  jugadasExitosas = 0;
  ganadorFinal = null;
  textoMensaje = "Empieza " + jugadores[0].nombre + ". Elige un cofre.";

  pantallaInicio.classList.add("oculto");
  pantallaJuego.classList.remove("oculto");
  dibujarTodo();
}

function volverAlInicio() {
  juegoActivo = false;
  pantallaJuego.classList.add("oculto");
  pantallaInicio.classList.remove("oculto");
  document.body.classList.remove("alerta-roja");
  document.body.classList.remove("invertido");
}

/* ---------- Logica de una jugada ---------- */
function abrirCofre(indice) {
  // [REQ 2] Condiciones de proteccion: no se puede jugar si el juego termino,
  // si hay un turno congelado pendiente o si el cofre ya estaba abierto.
  if (!juegoActivo || esperandoContinuar) {
    return;
  }
  const cofre = cofres[indice];
  if (cofre.abierto) {
    return;
  }

  const jugador = jugadores[turnoActual];
  cofre.abierto = true;
  cofresAbiertos++;
  cofresMovidos = [];

  // [REQ 2] if / else if / else segun el tipo de cofre
  if (cofre.tipo === "hielo") {
    // Regla C: no suma puntos, congela el siguiente turno del jugador
    jugador.congelado = true;
    textoMensaje = jugador.nombre + " abrio un cofre con HIELO. No suma puntos y perdera su siguiente turno.";
  } else if (cofre.tipo === "puntos") {
    jugador.puntos += cofre.valor;
    jugadasExitosas++;
    textoMensaje = jugador.nombre + " abrio un cofre y suma " + cofre.valor + " punto(s).";

    // Regla B: cada 4 jugadas exitosas se intercambian dos cofres
    if (jugadasExitosas % JUGADAS_PARA_INTERCAMBIO === 0) {
      intercambiarDosCofres();
    }
  } else {
    textoMensaje = "Cofre desconocido.";
  }

  // Fase 1: se gana al llegar a la meta de puntos (solo antes de invertirse la condicion)
  if (!condicionInvertida && jugador.puntos >= META_FASE_UNO) {
    terminarPartida(turnoActual);
    return;
  }

  // Regla D: al llegar a la mitad de los intentos se invierte la condicion de victoria
  if (!condicionInvertida && cofresAbiertos >= MITAD_INTENTOS) {
    condicionInvertida = true;
    textoMensaje += " " + TEXTOS.inversion;
  }

  // Fin del tablero: ya no quedan cofres por abrir
  if (cofresAbiertos === TOTAL_COFRES) {
    terminarPorTablero();
    return;
  }

  pasarTurno();
  dibujarTodo();
}

// Regla B: intercambia dos posiciones aleatorias del arreglo logico.
function intercambiarDosCofres() {
  const a = aleatorio(cofres.length);
  let b = aleatorio(cofres.length);
  while (b === a) {
    b = aleatorio(cofres.length);
  }

  const guardado = cofres[a];
  cofres[a] = cofres[b];
  cofres[b] = guardado;

  cofresMovidos = [a, b];
  textoMensaje += " Los cofres " + (a + 1) + " y " + (b + 1) + " se intercambiaron de lugar.";
}

// Cambia el turno. Si el siguiente jugador esta congelado, queda esperando "Continuar".
function pasarTurno() {
  turnoActual = otroJugador(turnoActual);

  if (jugadores[turnoActual].congelado) {
    esperandoContinuar = true;
    textoMensaje += " " + jugadores[turnoActual].nombre + " esta congelado y pierde este turno.";
  }
}

// Se llama al pulsar "Continuar": el jugador congelado pierde su turno y pasa al otro.
function continuarTurnoCongelado() {
  if (!esperandoContinuar) {
    return;
  }
  const congelado = jugadores[turnoActual];
  congelado.congelado = false;
  esperandoContinuar = false;
  textoMensaje = congelado.nombre + " perdio su turno. ";

  pasarTurno();
  if (!esperandoContinuar) {
    textoMensaje += "Juega " + jugadores[turnoActual].nombre + ".";
  }
  dibujarTodo();
}

/* ---------- Final de la partida ---------- */
function terminarPartida(indiceGanador) {
  juegoActivo = false;
  ganadorFinal = indiceGanador;
  textoMensaje = "Gana " + jugadores[indiceGanador].nombre + " al llegar a " + META_FASE_UNO + " puntos.";
  dibujarTodo();
}

function terminarPorTablero() {
  juegoActivo = false;
  const p0 = jugadores[0].puntos;
  const p1 = jugadores[1].puntos;

  // Regla D: con la condicion invertida gana el que tenga MENOS puntos
  if (p0 === p1) {
    ganadorFinal = -1;
    textoMensaje = TEXTOS.empate;
  } else if (condicionInvertida) {
    ganadorFinal = p0 < p1 ? 0 : 1;
    textoMensaje = "Se abrieron todos los cofres. Gana " + jugadores[ganadorFinal].nombre + " por tener menos puntos.";
  } else {
    ganadorFinal = p0 > p1 ? 0 : 1;
    textoMensaje = "Se abrieron todos los cofres. Gana " + jugadores[ganadorFinal].nombre + " por tener mas puntos.";
  }
  dibujarTodo();
}

/* ---------- Dibujo en el DOM ---------- */
// [REQ 7] El DOM solo muestra el estado. Los datos reales viven en las variables y arreglos de arriba.
function dibujarTablero() {
  tablero.replaceChildren();

  for (let i = 0; i < cofres.length; i++) {
    const cofre = cofres[i];
    const boton = document.createElement("button");
    boton.classList.add("cofre");

    // [REQ 2] Texto y estilo segun el estado del cofre
    if (!cofre.abierto) {
      boton.textContent = "?";
    } else if (cofre.tipo === "hielo") {
      boton.textContent = "HIELO";
      boton.classList.add("abierto-trampa");
    } else {
      boton.textContent = String(cofre.valor);
      boton.classList.add("abierto-puntos");
    }

    if (cofresMovidos.includes(i)) {
      boton.classList.add("movido");
    }

    boton.disabled = cofre.abierto || !juegoActivo || esperandoContinuar;

    // [REQ 6] Evento click de cada cofre
    boton.addEventListener("click", () => abrirCofre(i));

    tablero.appendChild(boton);
  }
}

function dibujarMarcador() {
  for (let i = 0; i < jugadores.length; i++) {
    const tarjeta = document.getElementById("tarjeta-" + i);
    document.getElementById("nombre-tarjeta-" + i).textContent = jugadores[i].nombre;
    document.getElementById("puntos-" + i).textContent = String(jugadores[i].puntos);

    let estado = "";
    if (jugadores[i].congelado) {
      estado = "Congelado";
    } else if (juegoActivo && i === turnoActual) {
      estado = "En turno";
    } else if (ganadorFinal === i) {
      estado = "Ganador";
    }
    document.getElementById("estado-" + i).textContent = estado;

    tarjeta.classList.toggle("activo", juegoActivo && i === turnoActual);
  }
}

function dibujarTodo() {
  dibujarMarcador();
  dibujarTablero();

  textoFase.textContent = condicionInvertida ? TEXTOS.fase2 : TEXTOS.fase1;

  if (juegoActivo) {
    textoTurno.textContent = "Turno de " + jugadores[turnoActual].nombre
      + " | Cofres abiertos: " + cofresAbiertos + "/" + TOTAL_COFRES;
  } else {
    textoTurno.textContent = "Partida terminada | Cofres abiertos: " + cofresAbiertos + "/" + TOTAL_COFRES;
  }

  textoMensajeDom.textContent = textoMensaje;
  botonContinuar.classList.toggle("oculto", !esperandoContinuar);

  // Regla C: fondo rojo mientras exista un turno congelado pendiente
  const hayCongelado = jugadores[0].congelado || jugadores[1].congelado;
  document.body.classList.toggle("alerta-roja", hayCongelado);
  // Regla D: el fondo cambia de tono cuando la victoria esta invertida
  document.body.classList.toggle("invertido", condicionInvertida);
}

/* =====================================================================
 * [REQ 6] EVENTOS DEL NAVEGADOR
 * ===================================================================== */
document.getElementById("btn-iniciar").addEventListener("click", iniciarPartida);
document.getElementById("btn-continuar").addEventListener("click", continuarTurnoCongelado);
document.getElementById("btn-reiniciar").addEventListener("click", volverAlInicio);

// Con la tecla Enter dentro de los campos de nombre tambien se inicia la partida.
const alPresionarTecla = (evento) => {
  if (evento.key === "Enter") {
    iniciarPartida();
  }
};
document.getElementById("nombre-0").addEventListener("keydown", alPresionarTecla);
document.getElementById("nombre-1").addEventListener("keydown", alPresionarTecla);

// El titulo de la pestana usa la constante string del inicio.
document.title = NOMBRE_JUEGO;
