import mongoose from "mongoose";

const empenoSchema = new mongoose.Schema({
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

// 🔹 Calcular el interés y la fecha de vencimiento automáticamente
// empenoSchema.pre("save", function (next) {
//   if (this.isNew) {
//     // Asignar interés mensual según el valor del préstamo
//     if (this.valorPrestamo >= 100000 && this.valorPrestamo <= 900000) {
//       this.interesMensual = 10; // 10%
//     } else if (this.valorPrestamo > 900000 && this.valorPrestamo <= 1300000) {
//       this.interesMensual = 7; // 7%
//     } else if (this.valorPrestamo > 1300000) {
//       this.interesMensual = 5; // 5%
//     }

//     // Calcular fecha de vencimiento (5 meses después)
//     const fecha = new Date(this.fechaInicio);
//     fecha.setMonth(fecha.getMonth() + 5);
//     this.fechaVencimiento = fecha;
//   }
//   next();
// });

const Empeno = mongoose.model("Empeno", empenoSchema);

export default Empeno;
