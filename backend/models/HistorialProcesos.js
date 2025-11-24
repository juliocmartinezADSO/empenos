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
      "interesesDesempeno",
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
  interesesdeDesempeño: {
    type: Number,
    default: 0,
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
  infoFinanciera: {
    capital: { type: Number, default: 0 },
    interes: { type: Number, default: 0 },
    fecha: { type: Date, default: null }
  },
  infoContrato: {
    factura: { type: Number, default: null },
    descripcionPrenda: { type: String, default: "" },
    kilataje: { type: String, default: "" }
  }
},



  fechaReal: { type: Date, required: true },       // ← hora real de Colombia

  fecha: {
    type: Date,
    default: Date.now
    },
});

export default mongoose.model("HistorialProcesos", historialSchema);
