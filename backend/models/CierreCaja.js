import mongoose from "mongoose";

const cierreCajaSchema = new mongoose.Schema({
    fechaReal: { type: Date, required: true },       // ← cuando se hizo realmente

  fecha: {
    type: Date,
    required: true,
    unique: true
  },

  // INGRESOS
  saldoAnterior: { type: Number, default: 0 },

  capitalDesempenado: { type: Number, default: 0 },
  facturasDesempenadas: { type: Number, default: 0 },

  interesesGenerados: { type: Number, default: 0 },
  abonosIntereses: { type: Number, default: 0 },

  otrosIngresos: { type: Number, default: 0 },

  totalIngresos: { type: Number, default: 0 },

  // EGRESOS
  capitalPrestado: { type: Number, default: 0 },
  numeroEmpeños: { type: Number, default: 0 },

  gastosGenerales: { type: Number, default: 0 },
  prestamosEmpleados: { type: Number, default: 0 },
  otrosEgresos: { type: Number, default: 0 },

  totalEgresos: { type: Number, default: 0 },

  // RESULTADO FINAL DEL SISTEMA
  nuevoSaldoCalculado: { type: Number, default: 0 },

  // RESULTADO REAL EN CAJA
  dineroReal: { type: Number, default: 0 },

  // DESCARGUE DEL CUADRE
  sobrante: { type: Number, default: 0 },
  faltante: { type: Number, default: 0 },

  observaciones: { type: String }
});

export default mongoose.model("CierreCaja", cierreCajaSchema);
