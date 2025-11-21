import mongoose from "mongoose";

const empenoSchema = new mongoose.Schema({
  contratoPadreId: {
  type: mongoose.Schema.Types.ObjectId,
  required: false,
},

  numeroFactura: {
    type: Number,
    required: true,
    unique: true,
  },
  cliente: {
    nombre: { type: String, required: true },
    cedula: { type: String, required: true },
    telefono: { type: String },
  },
  descripcionPrenda: {
    type: String,
    required: true,
  },
  kilataje: {
    type: String,
    enum: ["14K", "18K"],
    required: true,
  },
  valorPrestamo: {
    type: Number,
    required: true,
  },
  interesMensual: {
    type: Number,
    required: true,
  },
    fechaReal: { type: Date, required: true },        // ← hora real

  fechaInicio: {
    type: Date,
    default: Date.now,
  },
  fechaVencimiento: {
    type: Date,
  },
  abonos: [
    {
      fecha: { type: Date, default: Date.now },
      monto: { type: Number },
      tipo: { type: String, enum: ["interes", "capital"], default: "interes" },
    },
  ],
  estado: {
    type: String,
    enum: ["activo", "atrasado", "renovado", "liquidado"],
    default: "activo",
  },
});

const Empeno = mongoose.model("Empeno", empenoSchema);

export default Empeno;
