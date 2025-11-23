import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registrar = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(400).json({ error: "El email ya está registrado." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      nombre,
      email,
      password: hashed,
      rol: rol || "empleado",
    });

    await user.save();

    res.status(201).json({ mensaje: "Usuario creado con éxito." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Login de usuario
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Usuario no encontrado." });

    const valido = await bcrypt.compare(password, user.password);
    if (!valido) return res.status(400).json({ error: "Contraseña incorrecta." });

    const token = jwt.sign(
      {
        id: user._id,
        rol: user.rol
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: user._id,
        nombre: user.nombre,
        rol: user.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

