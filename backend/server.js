import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import empenoRoutes from "./routes/empenos.js";
import capitalRoutes from "./routes/capital.js"
import historialRoutes from "./routes/historial.js"


dotenv.config();

const app = express();

// 🟢 Agrega esto antes de tus rutas
app.use(express.json());
app.use("/api/empenos", empenoRoutes);
app.use("/api/capital", capitalRoutes);
app.use("/api/historial", historialRoutes)


app.use(
  cors({
    origin: "http://localhost:5173", // permite peticiones desde tu frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Conexión a MongoDB
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
