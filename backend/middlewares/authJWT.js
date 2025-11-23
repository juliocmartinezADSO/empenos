import jwt from "jsonwebtoken";
import User from "../models/User.js";
export default async function authJWT(req, res, next) {
  try {
    // 1️⃣ Leer el token desde headers
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    // 2️⃣ Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Buscar el usuario que pertenece a ese token
    const usuario = await User.findById(decoded.id).select("-password");

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 4️⃣ Guardar info del usuario dentro del request
    req.user = usuario;

    next();

  } catch (error) {
    console.error("Error en authJWT:", error);

    return res.status(401).json({
      error:
        error.name === "TokenExpiredError"
          ? "Token vencido, inicia sesión nuevamente"
          : "Token inválido",
    });
  }
}
