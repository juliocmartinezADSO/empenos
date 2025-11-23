import express from "express";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import authJWT from "../middlewares/authJWT.js";
import checkRole from "../middlewares/checkRole.js";
import { registrar, login } from "../controllers/AuthController.js";

const router = express.Router();

// ===============================
// 🔐 REGISTRO DE USUARIOS
// ===============================
router.post("/register", authJWT, checkRole("admin"), registrar);

// ===============================
// 🔐 LOGIN DE USUARIO
// ===============================
router.post("/login", login);
   
export default router;
