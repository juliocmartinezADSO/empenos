// models/Historial.js
import mongoose from "mongoose";

const historialSchema = new mongoose.Schema({
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
  fecha: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Historial", historialSchema);
