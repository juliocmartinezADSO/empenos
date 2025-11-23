import express from "express";
import authJWT from "../middlewares/authJWT.js";
import Historial from "../models/HistorialProcesos.js";
const router = express.Router();

// ---------------------------------------------
// FUNCION PARA CALCULAR LA CONTABILIDAD
// ---------------------------------------------
function calcularContabilidad(historial) {
  const totalPrestado = historial
    .filter(h => h.tipoMovimiento === "empeno")
    .reduce((a, b) => a + b.monto, 0);

  const intereses = historial
    .filter(h => h.tipoMovimiento === "abono_interes")
    .reduce((a, b) => a + b.monto, 0);

  const abonosCapital = historial
    .filter(h => h.tipoMovimiento === "abono_capital")
    .reduce((a, b) => a + b.monto, 0);

  const renovaciones = historial
    .filter(h => h.tipoMovimiento === "renovacion")
    .reduce((a, b) => a + b.monto, 0);

  const liquidaciones = historial
    .filter(h => h.tipoMovimiento === "liquidacion")
    .reduce((a, b) => a + b.monto, 0);

  const totalEntradas = intereses + abonosCapital + renovaciones + liquidaciones;

  const totalSalidas = totalPrestado;

  const gananciaNeta = totalEntradas - totalSalidas;

  return {
    totalPrestado,
    intereses,
    abonosCapital,
    renovaciones,
    liquidaciones,
    totalEntradas,
    totalSalidas,
    gananciaNeta
  };
}

// ---------------------------------------------
// RUTA: CONTABILIDAD POR CLIENTE + ID PADRE
// ---------------------------------------------
// GET /contabilidad/:cedula/:idPadre
router.get("/:cedula/:idPadre", authJWT, async (req, res) => {
  try {
    const { cedula, idPadre } = req.params;

    // Filtrar SOLO los movimientos de ese contrato padre
    const historial = await Historial.find({
      cedulaCliente: cedula,
      contratoPadreId: idPadre
    }).sort({ fecha: 1 });

    if (!historial.length) {
      return res.status(404).json({
        mensaje: "No hay movimientos para ese contratoPadreId",
        cedula,
        idPadre
      });
    }

    // Calcular contabilidad
    const resumen = calcularContabilidad(historial);

    return res.json({
      cedulaCliente: cedula,
      contratoPadreId: idPadre,
      movimientos: historial.length,
      resumen,
      historial
    });

  } catch (error) {
    console.error("Error en contabilidad:", error);
    res.status(500).json({ error: "Error interno en el cálculo de contabilidad" });
  }
});

// Exportar
export default router;
