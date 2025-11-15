import express from "express";
import HistorialProcesos from "../models/HistorialProcesos.js";

const router = express.Router();

/**
 * Historial completo del cliente
 * Si envías solo la cédula → trae todo mezclado (útil para ver todo)
 * Si envías también el contratoPadreId → trae solo un empeño específico
 */
router.get("/cliente/:cedula", async (req, res) => {
  try {
    const { cedula } = req.params;
    const { padre } = req.query; // ← opcional

    let filtro = { cedulaCliente: cedula };

    // Si se envía contratoPadreId por query, filtra solo esa cadena
    if (padre) {
      filtro.contratoPadreId = padre;
    }

    const historial = await HistorialProcesos.find(filtro).sort({ fecha: -1 });

    if (!historial || historial.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontró historial para esta búsqueda",
        filtro
      });
    }

    res.status(200).json(historial);

  } catch (error) {
    console.error("Error al consultar el historial:", error);
    res.status(500).json({
      mensaje: "Ocurrió un error al consultar el historial del cliente",
      error: error.message,
    });
  }
});

export default router;
