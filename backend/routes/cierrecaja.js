// routes/cierreCaja.js

import express from "express";
import authJWT from "../middlewares/authJWT.js";
import checkRole from "../middlewares/checkRole.js";
import CierreCaja from "../models/CierreCaja.js";
import HistorialProcesos from "../models/HistorialProcesos.js";
import Empeno from "../models/Empeno.js";
import Capital from "../models/Capital.js";
import Historial from "../models/Historial.js";
import fechaOperacion from "../middlewares/fechaOperacion.js";

const router = express.Router();

router.post(
  "/generar",
  authJWT,
  checkRole("admin", "empleado"),
  fechaOperacion,
  async (req, res) => {
    const fechaOp = req.fechaOperacion;
    const timestamp = req.timestamp;

    try {
      const {
        dineroReal = 0,
        gastosGenerales = 0,
        prestamosEmpleados = 0,
        otrosIngresos = 0,
        otrosEgresos = 0,
        observaciones = "",
      } = req.body;

      // === 1. Definir rango del día ===
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      // === 2. Evitar doble cierre ===
      const existeCierre = await CierreCaja.findOne({ fecha: hoy });
      if (existeCierre) {
        return res
          .status(400)
          .json({ error: "Ya realizaste el cierre de caja del día de hoy." });
      }

      // =============================
      // SALDO ANTERIOR CORRECTO
      // =============================

      const ultimoCierre = await CierreCaja.findOne().sort({ fecha: -1 });
      let saldoAnterior;

      if (ultimoCierre) {
        // 🟢 Caso normal: usar el saldo del cierre anterior
        saldoAnterior = ultimoCierre.nuevoSaldoCalculado;
      } else {
        // 🟢 Primer cierre de la historia
        const capital = await Capital.findOne();
        if (!capital) {
          return res
            .status(500)
            .json({ error: "Capital no inicializado en el sistema." });
        }

        const movimientosCapital = await Historial.find({
          tipoMovimiento: {
            $in: [/inyeccion de capital/i, /retiro de la caja/i],
          },
          esCapitalInicial: { $ne: true },
        }).lean();

        const totalInyecciones = movimientosCapital
          .filter((m) => m.tipoMovimiento === "Inyeccion de capital")
          .reduce((a, b) => a + (b.monto || 0), 0);

        const totalRetiros = movimientosCapital
          .filter((m) => m.tipoMovimiento === "Retiro de la caja")
          .reduce((a, b) => a + (b.monto || 0), 0);

        // saldoAnterior = capital.saldoInicial + totalInyecciones - totalRetiros;
        saldoAnterior = capital.saldoInicial;
      }

      // =============================
      //  MOVIMIENTOS DEL DÍA
      // =============================

      // 🟢 Movimientos de empeños, renovaciones, intereses, liquidaciones
      const movimientosHoy = await HistorialProcesos.find({
        fecha: { $gte: hoy, $lt: manana },
      }).lean();

      // INGRESOS
      const capitalDesempenado = movimientosHoy
        .filter((m) => m.tipoMovimiento === "liquidacion")
        .reduce((a, b) => a + (b.monto || 0), 0);

      const interesesdeDesempeño = movimientosHoy
        .filter((m) => m.tipoMovimiento === "liquidacion")
        .reduce((a, b) => a + (b.interesesdeDesempeño || 0), 0);

      const facturasDesempenadas = movimientosHoy.filter(
        (m) => m.tipoMovimiento === "liquidacion"
      ).length;

      const interesesGenerados = movimientosHoy
        .filter((m) => m.tipoMovimiento === "abono_interes")
        .reduce((a, b) => a + (b.monto || 0), 0);

      // const abonosCapital = movimientosHoy
      //   .filter((m) => m.tipoMovimiento === "renovacion" || m.tipoMovimiento === "abono_capital")
      //   .reduce((a, b) => a + (b.monto || 0), 0);

      const abonosIntereses = interesesGenerados;

      // 🟢 EGRESO: préstamos del día (empeños)
      const empenosHoy = movimientosHoy.filter(
        (m) =>
          m.tipoMovimiento === "empeno" || m.tipoMovimiento === "renovacion"
      );

      const seen = new Set();
      let capitalPrestado = 0;
      let numeroEmpeños = 0;

      for (const m of empenosHoy) {
        // Elegir id único del registro: nuevo contrato si existe
        const uniqueId = m.contratoNuevoId
          ? String(m.contratoNuevoId)
          : String(m.contratoId);

        if (!seen.has(uniqueId)) {
          seen.add(uniqueId);

          if (m.tipoMovimiento === "empeno") {
            capitalPrestado += m.monto || 0;
          } else if (m.tipoMovimiento === "renovacion") {
            capitalPrestado += m.saldoFinal || 0;
          }

          numeroEmpeños++;
        }
      }

      // =============================
      //  INYECCIONES Y RETIROS DEL DÍA
      // =============================
      const movimientosCapitalHoy = await Historial.find({
        fecha: { $gte: hoy, $lt: manana },
        tipoMovimiento: { $in: ["Inyeccion de capital", "Retiro de la caja"] },
      }).lean();

      const totalInyeccionesHoy = movimientosCapitalHoy
        .filter((m) => /inyeccion de capital/i.test(m.tipoMovimiento))
        .reduce((a, b) => a + (b.monto || 0), 0);

      const totalRetirosHoy = movimientosCapitalHoy
        .filter((m) => /retiro de la caja/i.test(m.tipoMovimiento))
        .reduce((a, b) => a + (b.monto || 0), 0);

      // =============================
      //  TOTALES DEL DÍA
      // =============================

      // INGRESOS
      const totalIngresos =
        capitalDesempenado +
        interesesdeDesempeño +
        abonosIntereses +
        otrosIngresos +
        totalInyeccionesHoy;

        // EGRESOS 
      const totalEgresos =
        capitalPrestado +
        gastosGenerales +
        prestamosEmpleados +
        otrosEgresos +
        totalRetirosHoy;

      const nuevoSaldoCalculado = saldoAnterior + totalIngresos - totalEgresos;

      let sobrante = 0;
      let faltante = 0;

      if (dineroReal > nuevoSaldoCalculado) {
        sobrante = dineroReal - nuevoSaldoCalculado;
      } else if (dineroReal < nuevoSaldoCalculado) {
        faltante = nuevoSaldoCalculado - dineroReal;
      }

      // =============================
      //  GUARDAR CIERRE
      // =============================

      const cierre = await CierreCaja.create({
        fecha: hoy,
        fechaReal: timestamp,
        saldoAnterior,
        capitalDesempenado,
        interesesdeDesempeño,
        facturasDesempenadas,
        abonosIntereses,
        otrosIngresos,
        totalIngresos,
        capitalPrestado,
        numeroEmpeños,
        gastosGenerales,
        prestamosEmpleados,
        otrosEgresos,
        totalRetirosHoy,
        totalInyeccionesHoy,
        totalEgresos,
        nuevoSaldoCalculado,
        dineroReal,
        sobrante,
        faltante,
        observaciones,
      });

      return res.json({
        mensaje: "Cierre de caja generado correctamente",
        cierre,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Error interno del servidor al generar el cierre." });
    }
  }
);

export default router;
