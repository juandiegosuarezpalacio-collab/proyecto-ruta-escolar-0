(function () {
  const mensajes = {
    alistamiento: {
      cercano: ({ ruta, subtitulo, lista, nota }) => {
        let txt = `🚌 ${ruta}${subtitulo ? " - " + subtitulo : ""}\n\nLa ruta se está alistando.\n\nOrden de recogida:\n`;
        lista.forEach((e) => { txt += `\n${e.ordenRecogida}. ${e.nombre} · ${e.barrio}`; });
        txt += `\n\nPor favor alistar a los estudiantes.`;
        if (nota) txt += `\n\nNota: ${nota}`;
        return txt;
      },
      formal: ({ ruta, subtitulo, lista, nota }) => {
        let txt = `Buen día. Informamos que la ${ruta}${subtitulo ? " - " + subtitulo : ""} se encuentra en alistamiento.\n\nOrden de recogida:`;
        lista.forEach((e) => { txt += `\n${e.ordenRecogida}. ${e.nombre} (${e.barrio})`; });
        txt += `\n\nAgradecemos tener a los estudiantes preparados.`;
        if (nota) txt += `\n\nObservación: ${nota}`;
        return txt;
      },
      breve: ({ ruta }) => `🚌 ${ruta}: la ruta se está alistando. Por favor preparar a los estudiantes.`
    },
    ingreso_barrio: {
      cercano: ({ barrio, estudiante, acudiente }) => `📍 La ruta ingresó a ${barrio}. ${acudiente ? acudiente + ", " : ""}por favor alistar a ${estudiante}.`,
      formal: ({ barrio, estudiante }) => `Informamos que la ruta acaba de ingresar al barrio ${barrio}. Por favor preparar a ${estudiante}.`,
      breve: ({ barrio, estudiante }) => `Ruta en ${barrio}. Preparar a ${estudiante}.`
    },
    cerca: {
      cercano: ({ estudiante, acudiente, minutos, barrio }) => `🚍 Hola ${acudiente}, la ruta ya va cerca de ${barrio} para recoger a ${estudiante}. Tiempo estimado: ${minutos} minutos.`,
      formal: ({ estudiante, minutos, barrio }) => `Informamos que la ruta está próxima al sector ${barrio} para recoger a ${estudiante}. Tiempo estimado: ${minutos} minutos.`,
      breve: ({ estudiante, minutos }) => `Ruta cerca para ${estudiante}. Llegada aprox. ${minutos} min.`
    },
    retraso: {
      cercano: ({ estudiante, minutos, nota }) => `⏳ La ruta presenta un retraso aproximado de ${minutos} minutos para ${estudiante}. ${nota || "Gracias por la comprensión."}`,
      formal: ({ estudiante, minutos }) => `Informamos un retraso aproximado de ${minutos} minutos en la recogida de ${estudiante}.`,
      breve: ({ minutos }) => `Retraso aproximado: ${minutos} min.`
    },
    subio: {
      cercano: ({ estudiante }) => `✅ ${estudiante} ya subió a la ruta sin novedad.`,
      formal: ({ estudiante }) => `Informamos que ${estudiante} abordó correctamente la ruta escolar.`,
      breve: ({ estudiante }) => `${estudiante} ya subió.`
    },
    llegada_colegio: {
      cercano: ({ ruta }) => `🏫 La ${ruta} llegó al colegio. Los estudiantes ingresaron correctamente.`,
      formal: ({ ruta }) => `Informamos que la ${ruta} llegó al colegio y los estudiantes fueron entregados correctamente.`,
      breve: ({ ruta }) => `${ruta}: llegada al colegio confirmada.`
    },
    entrega: {
      cercano: ({ estudiante }) => `🏠 ${estudiante} fue entregado correctamente en su destino.`,
      formal: ({ estudiante }) => `Informamos que ${estudiante} fue entregado correctamente.`,
      breve: ({ estudiante }) => `${estudiante} entregado.`
    },
    personalizado: {
      cercano: ({ nota }) => nota || "Mensaje personalizado.",
      formal: ({ nota }) => nota || "Mensaje personalizado.",
      breve: ({ nota }) => nota || "Mensaje personalizado."
    }
  };

  function pickTone(set, tone) {
    return set[tone] || set.cercano || Object.values(set)[0];
  }

  window.generarMensajeIA = function (tipo, tono, datos) {
    const set = mensajes[tipo] || mensajes.personalizado;
    return pickTone(set, tono)(datos || {});
  };

  window.preguntarIALocal = function ({ pregunta, actual, pendientes, ruta }) {
    const q = (pregunta || "").toLowerCase();
    if (!q.trim()) return "Escribe una pregunta para ayudarte con mensajes, orden de ruta o avisos.";
    if (q.includes("quien sigue") || q.includes("quién sigue")) {
      return actual ? `Sigue ${actual.nombre} en ${actual.barrio}. Teléfono: ${actual.telefono}.` : "No hay estudiante actual.";
    }
    if (q.includes("faltan")) {
      return `Quedan ${pendientes} estudiantes pendientes en ${ruta}.`;
    }
    if (q.includes("alistamiento")) {
      return "Usa un mensaje corto, claro y amable: avisa la ruta, el orden de recogida y pide alistar al estudiante.";
    }
    if (q.includes("mejora") || q.includes("mejorar") || q.includes("redacta")) {
      return "Usa saludo, ruta, barrio o tiempo estimado y una instrucción concreta. Evita mensajes largos.";
    }
    if (q.includes("retraso")) {
      return "Indica el retraso estimado, agradece la paciencia y evita repetir el mensaje varias veces.";
    }
    return "Puedo ayudarte con el orden de la ruta, mensajes de alistamiento, cercanía, retraso, llegada al colegio y textos personalizados.";
  };
})();
