const mongoose = require("mongoose");

const HistorialSchema = new mongoose.Schema({
  idEmpeño: { type: mongoose.Schema.Types.ObjectId, ref: "Empeno", required: true },
  cliente: {
    nombre: String,
    cedula: String,
    telefono: String
  },
  monto: { type: Number, required: true },
  abonoInteres: { type: Number, required: true },
  abonoCapital: { type: Number, required: true },
  saldoAnterior: { type: Number, required: true },
  nuevoSaldo: { type: Number, required: true },
  contratoNuevo: { type: mongoose.Schema.Types.ObjectId, ref: "Empeno", default: null },
  fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model("HistorialAbono", HistorialSchema);
