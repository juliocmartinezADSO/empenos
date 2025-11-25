import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Importación de rutas
import empenoRoutes from "./routes/empenos.js";
import capitalRoutes from "./routes/capital.js"
import historialRoutes from "./routes/historial.js"
import contabilidadRoutes from "./routes/contabilidad.js"
import cierreCajaRoutes from "./routes/cierrecaja.js"
import authRoutes from "./routes/auth.js"


dotenv.config();

const app = express();

//Middlewares globales
app.use(
  cors({
    origin: "http://localhost:5173", // permite peticiones desde tu frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// 🟢 Agrega esto antes de tus rutas
app.use(express.json());

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/empenos", empenoRoutes);
app.use("/api/capital", capitalRoutes);
app.use("/api/historial", historialRoutes)
app.use("/api/contabilidad", contabilidadRoutes)
app.use("/api/cierrecaja", cierreCajaRoutes)




// Conexión a MongoDB

  // if (!process.env.MONGO_URI) {
  //   console.error("❌ ERROR: falta MONGO_URI en el archivo .env");
  //   process.exit(1);
  // }

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.log(err));


// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor funcionando 🔥");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
