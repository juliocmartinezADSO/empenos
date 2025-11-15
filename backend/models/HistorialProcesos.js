import mongoose from "mongoose";

const historialSchema = new mongoose.Schema({
  contratoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Empeño",
    required: true,
  },

  contratoNuevoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Empeño",
    default: null,
  },
  contratoPadreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Empeño",
  },

  cedulaCliente: {
    type: String,
    required: true,
  },

  tipoMovimiento: {
    type: String,
    enum: [
      "empeno",
      "abono_interes",
      "abono_capital",
      "renovacion",
      "liquidacion",
      "desempeno",
    ],
    required: true,
  },

  monto: {
    type: Number,
    required: true,
  },

  saldoFinal: {
    type: Number,
    default: null,
  },

  descripcion: {
    type: String,
    required: true,
  },

  detalle: {
    type: Object,
    default: {},
  },

  fecha: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("HistorialProcesos", historialSchema);
