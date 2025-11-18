//Aqui medio funcionaba el cierre de caja pero el saldo anterior estaba mal calculado
import express from "express";
import CierreCaja from "../models/CierreCaja.js";
import HistorialProcesos from "../models/HistorialProcesos.js";
import Empeno from "../models/Empeno.js";
import Capital from "../models/Capital.js";
import Historial from "../models/Historial.js";


const router = express.Router();

router.post("/generar", async (req, res) => {
  try {
    const { 
      dineroReal = 0,
      gastosGenerales = 0,
      prestamosEmpleados = 0,
      otrosIngresos = 0,
      otrosEgresos = 0,
      observaciones = ""
    } = req.body;

    // Rango del día: [hoy, mañana) para evitar problemas de zona horaria
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // ❌ Evitar doble cierre
    const existeCierre = await CierreCaja.findOne({ fecha: hoy });
    if (existeCierre) {
      return res.status(400).json({ error: "Ya realizaste el cierre de caja del día de hoy." });
    }

// =============================
// SALDO ANTERIOR CORREGIDO
// =============================

// =============================
// SALDO ANTERIOR CORREGIDO
// =============================

// Buscar cierre anterior
const ultimoCierre = await CierreCaja.findOne().sort({ fecha: -1 });

let saldoAnterior;

// Caso 1: hay cierre anterior → usar su saldo final
if (ultimoCierre) {
  saldoAnterior = ultimoCierre.nuevoSaldoCalculado;
}
// Caso 2: primer cierre de la vida → usar capital de arranque + sumas de inyecciones posteriores - retiros
else {
  const capital = await Capital.findOne();
  if (!capital) {
    return res.status(500).json({ error: "Capital no inicializado" });
  }

  // Movimientos de capital posteriores a la inicial
  const movimientosCapital = await Historial.find({
  tipoMovimiento: { $regex: /inyeccion de capital|retiro de la caja/i },
    esCapitalInicial: { $ne: true } // excluye la inyección inicial
  }).lean();

  let totalInyecciones = 0;
  let totalRetiros = 0;

  movimientosCapital.forEach(mov => {
    if (mov.tipoMovimiento === "Inyeccion de capital") {
      totalInyecciones += mov.monto || 0;
      console.log("Total inyecciones: ", totalInyecciones);
      
    } else if (mov.tipoMovimiento === "Retiro de la caja") {
      totalRetiros += mov.monto || 0;
    }
  });

  saldoAnterior = capital.saldoInicial + totalInyecciones - totalRetiros;
}



    // 2️⃣ Movimientos del día desde HistorialProcesos (fuente de verdad para flujos de caja)
    const movimientosHoy = await HistorialProcesos.find({
      fecha: { $gte: hoy, $lt: manana }
    }).lean();

    // INGRESOS REALES DEL DÍA (liquidaciones y abonos de interes)
    const capitalDesempenado = movimientosHoy
      .filter(m => m.tipoMovimiento === "liquidacion")
      .reduce((a, b) => a + (b.monto || 0), 0);

    const facturasDesempenadas = movimientosHoy.filter(m => m.tipoMovimiento === "liquidacion").length;

    const interesesGenerados = movimientosHoy
      .filter(m => m.tipoMovimiento === "abono_interes")
      .reduce((a, b) => a + (b.monto || 0), 0);

    const abonosIntereses = interesesGenerados;

    // -------------------------
    // EGRESOS REALES: PRÉSTAMOS (EMPEÑOS)
    // Prevención de doble conteo:
    // - Usamos HistorialProcesos tipo "empeno" y deduplicamos por contratoId.
    // - Si no existen registros "empeno" en historial, fallback a Empeno (por seguridad).
    // -------------------------
    // 2.a) Agregar desde historial (deduplicado por contratoId)
    const empeñosHistorial = movimientosHoy.filter(m => m.tipoMovimiento === "empeno");

    // mapa para deduplicar por contratoId
    const seenContrato = new Set();
    let capitalPrestado_fromHist = 0;
    let numeroEmpeños_fromHist = 0;

    for (const m of empeñosHistorial) {
      const contratoId = m.contratoId ? String(m.contratoId) : null;
      // si no hay contratoId, aún podemos sumar el monto, pero preferimos ignorarlo por seguridad
      if (!contratoId) continue;
      if (!seenContrato.has(contratoId)) {
        seenContrato.add(contratoId);
        capitalPrestado_fromHist += m.monto || 0;
        numeroEmpeños_fromHist += 1;
      }
    }

    // 2.b) Fallback: si no hay registros 'empeno' en historial, tomamos Empeno.find
    let capitalPrestado = capitalPrestado_fromHist;
    let numeroEmpeños = numeroEmpeños_fromHist;

    if (numeroEmpeños === 0) {
      // no hay empeños en historial hoy, usar Empeno como respaldo
      const empenosHoy = await Empeno.find({ fechaInicio: { $gte: hoy, $lt: manana } }).lean();
      capitalPrestado = empenosHoy.reduce((a, b) => a + (b.valorPrestamo || 0), 0);
      numeroEmpeños = empenosHoy.length;
    }

    // 3️⃣ Totales (manteniendo tu estructura)
    const totalIngresos =
      capitalDesempenado +
      interesesGenerados +
      otrosIngresos;

    const totalEgresos =
      capitalPrestado +
      gastosGenerales +
      prestamosEmpleados +
      otrosEgresos;

    // 4️⃣ Fórmula REAL del nuevo saldo
    const nuevoSaldoCalculado = saldoAnterior + totalIngresos - totalEgresos;

    // 5️⃣ Comparar nuevo saldo con el efectivo real
    let sobrante = 0;
    let faltante = 0;

    if (dineroReal > nuevoSaldoCalculado) {
      sobrante = dineroReal - nuevoSaldoCalculado;
    } else if (dineroReal < nuevoSaldoCalculado) {
      faltante = nuevoSaldoCalculado - dineroReal;
    }

    // 6️⃣ Guardar cierre en la base de datos (misma estructura que tenías)
    const cierre = await CierreCaja.create({
      fecha: hoy,
      saldoAnterior,
      capitalDesempenado,
      facturasDesempenadas,
      interesesGenerados,
      abonosIntereses,
      otrosIngresos,
      totalIngresos,
      capitalPrestado,
      numeroEmpeños,
      gastosGenerales,
      prestamosEmpleados,
      otrosEgresos,
      totalEgresos,
      nuevoSaldoCalculado,
      dineroReal,
      sobrante,
      faltante,
      observaciones
    });

    return res.json({
      mensaje: "Cierre de caja generado correctamente",
      cierre
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
