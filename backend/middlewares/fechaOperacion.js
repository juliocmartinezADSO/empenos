import CierreCaja from "../models/CierreCaja.js";

// 🔹 Fecha real en Colombia (con hora)
function fechaHoraColombia() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" })
  );
}

// 🔹 Para avanzar al siguiente día hábil
function siguienteDiaHabil(fecha) {
  const next = new Date(fecha);
  next.setDate(next.getDate() + 1);

  if (next.getDay() === 0) {
    next.setDate(next.getDate() + 1);
  }

  next.setHours(0, 0, 0, 0);
  return next;
}

export default async function fechaOperacion(req, res, next) {
  try {
    // 🔸 FECHA Y HORA REAL
    const ahoraColombia = fechaHoraColombia();

    // 🔸 FECHA CONTABLE (solo día)
    const hoyFecha = new Date(ahoraColombia);
    hoyFecha.setHours(0, 0, 0, 0);

    // ¿Ya existe un cierre de caja para hoy?
    const cierreHoy = await CierreCaja.findOne({ fecha: hoyFecha });

    let fechaFinal;

    if (!cierreHoy) {
      fechaFinal = hoyFecha; // día normal
    } else {
      fechaFinal = siguienteDiaHabil(hoyFecha); // siguiente día hábil
    }

    // 🔸 GUARDAMOS AMBAS FECHAS EN LA REQUEST
    req.fechaOperacion = fechaFinal;     // solo fecha contable
    req.timestamp = ahoraColombia;       // fecha+hora real

    next();

  } catch (error) {
    console.error("Error en middleware fechaOperacion:", error);
    return res
      .status(500)
      .json({ error: "Error interno al calcular la fecha de operación." });
  }
}
