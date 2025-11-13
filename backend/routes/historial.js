import  express  from "express";
import Historial from "../models/Historial.js";
 
const router = express.Router();


 // Ruta para consultar el historial de un cliente por su cédula
 router.get("/cliente/:cedula", async (req, res) => {
    try {
      const { cedula } = req.params;
  
      // Buscar el historial del cliente por cédula, ordenado de más reciente a más antiguo
      const historial = await Historial.find({ cedulaCliente: cedula }).sort({ fecha: -1 });
  
      // Si no hay registros, responder con un mensaje
      if (!historial || historial.length === 0) {
        return res.status(404).json({
          mensaje: "No se encontró historial para esta cédula",
          cedula
        });
      }
  
      // Si hay historial, devolverlo
      res.status(200).json(historial);
  
    } catch (error) {
      console.error("Error al consultar el historial:", error);
      res.status(500).json({
        mensaje: "Ocurrió un error al consultar el historial del cliente",
        error: error.message
      });
    }
  });

  export default router;
