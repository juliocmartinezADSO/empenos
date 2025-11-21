// models/Historial.js
import mongoose from "mongoose";

const historialSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Empeño",
  },

  cedulaCliente: {
    type: String,
    ref: "Empeño",
  },
  tipoMovimiento: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
    required: true,
  },
  monto: {
    type: Number,
    required: true,
  },
  fechaReal: { type: Date, required: true }, // ← hora real de Colombia

  fecha: {
    type: Date,
    default: Date.now,
  },
  esCapitalInicial: {
    type: Boolean,
    default: false, // por defecto es false; solo true cuando es la inyección inicial
  },
});

export default mongoose.model("Historial", historialSchema);
