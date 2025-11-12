// routes/empenoRoutes.js
import express from "express";
import Capital from "../models/Capital.js";
import Empeno from "../models/Empeno.js";
import Historial from "../models/Historial.js";

const router = express.Router();

//Inicializar capital
async function inicializarCapital() {
  const existe = await Capital.findOne();
  if (!existe) {
    await new Capital({ saldo: 100000000 }).save(); // 100 millones
    console.log("Capital inicial creado: 100.000.000");
  }
}
inicializarCapital();

/**
 * Función para calcular los meses transcurridos entre dos fechas
 */
function calcularMeses(fechaInicio, fechaFin = new Date()) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  let meses =
    (fin.getFullYear() - inicio.getFullYear()) * 12 +
    (fin.getMonth() - inicio.getMonth());

  if (fin.getDate() < inicio.getDate()) meses -= 1;
  return meses < 0 ? 0 : meses;
}

/**
 * Calcula el interés mensual en pesos según el monto del préstamo
 */
function calcularInteresMensual(valorPrestamo) {
  let tasa;
  if (valorPrestamo <= 900000) tasa = 10;
  else if (valorPrestamo <= 1300000) tasa = 7;
  else tasa = 5;

  return Math.round((valorPrestamo * tasa) / 100); // monto en pesos
}

/*Crear nuevo empeño*/

router.post("/", async (req, res) => {
  try {
    const {
      cliente,
      descripcionPrenda,
      kilataje,
      articulo,
      valorPrestamo,
      fechaInicio,
    } = req.body;

    // 🔹 Obtener capital actual
    const capital = await Capital.findOne();
    if (!capital) {
      return res
        .status(500)
        .json({ error: "No se ha inicializado el capital" });
    }

    // 🔹 Validar si hay suficiente saldo
    if (capital.saldo < valorPrestamo) {
      return res.status(400).json({
        error: `No hay suficiente efectivo en caja. Saldo disponible: ${capital.saldo}`,
      });
    }

    // 🔹 Generar automáticamente el nuevo numeroFactura
    const ultimo = await Empeno.findOne().sort({ numeroFactura: -1 }).lean();
    const nuevoNumeroFactura = ultimo ? ultimo.numeroFactura + 1 : 1;

    // 🔹 Calcular interés mensual
    const interesMensual = calcularInteresMensual(valorPrestamo);

    // 🔹 Crear el nuevo empeño
    const nuevoEmpeno = new Empeno({
      numeroFactura: nuevoNumeroFactura,
      cliente,
      descripcionPrenda,
      kilataje,
      articulo,
      valorPrestamo,
      interesMensual,
      fechaInicio,
    });

    await nuevoEmpeno.save();

    // 🔹 Descontar el capital de la caja
    capital.saldo -= valorPrestamo;
    const monto = valorPrestamo;
    await capital.save();

    //Historial del empeño
    // después de crear el empeño exitosamente
    await Historial.create({
      tipoMovimiento: "Nuevo empeño",
      descripcion: `Se registró un nuevo empeño por valor de ${monto}`,
      monto,
    });

    res.status(201).json({
      mensaje: "Empeño creado y capital actualizado",
      empeno: nuevoEmpeno,
      capitalActual: capital.saldo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* Obtener todos los empenos con intereses acumulados
 */
router.get("/", async (req, res) => {
  try {
    const empenos = await Empeno.find();

    const conIntereses = empenos.map((emp) => {
      const meses = calcularMeses(emp.fechaInicio);
      const interesAcumulado = emp.interesMensual * meses;
      const totalAdeudado = emp.valorPrestamo + interesAcumulado;

      return {
        ...emp._doc,
        mesesTranscurridos: meses,
        interesAcumulado,
        totalAdeudado,
      };
    });

    res.json(conIntereses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener un empeno por ID con interés acumulado
 */
router.get("/:id", async (req, res) => {
  try {
    const emp = await Empeno.findById(req.params.id);
    if (!emp) return res.status(404).json({ mensaje: "empeno no encontrado" });

    const meses = calcularMeses(emp.fechaInicio);
    const interesAcumulado = emp.interesMensual * meses;
    const totalAdeudado = emp.valorPrestamo + interesAcumulado;

    res.json({
      ...emp._doc,
      mesesTranscurridos: meses,
      interesAcumulado,
      totalAdeudado,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// helpers arriba de las rutas
async function generarNuevaFactura() {
  const ultimo = await Empeno.findOne().sort({ numeroFactura: -1 }).lean();
  return ultimo && typeof ultimo.numeroFactura === "number"
    ? ultimo.numeroFactura + 1
    : 1;
}

// ==========================================================
//  RUTA ABONAR A UN EMPEÑO
//  Lógica real: NO permite intereses incompletos
//  Solo abona capital si todos los intereses están al día
//  Crea contrato nuevo al abonar capital
// ==========================================================
// POST /api/empenos/:id/abonar
router.post("/:id/abonar", async (req, res) => {
  try {
    const { id } = req.params;
    const { abono } = req.body;

    if (!abono || abono <= 0) {
      return res.status(400).json({ error: "El abono debe ser mayor a 0." });
    }

    let empeño = await Empeno.findById(id);
    if (!empeño) {
      return res.status(404).json({ error: "Contrato no encontrado." });
    }

    if (empeño.estado === "liquidado") {
      return res.status(400).json({ error: "Este contrato ya fue liquidado." });
    }

    // ==========================================
    // 1️⃣ Cálculo de meses transcurridos
    // ==========================================
    const ms = Date.now() - new Date(empeño.fechaInicio).getTime();
    const dias = ms / (1000 * 60 * 60 * 24);
    const mesesTranscurridos = Math.max(1, Math.floor(dias / 30));

    const interesesTotales = mesesTranscurridos * empeño.interesMensual;

    const interesesPagados = empeño.abonos
      .filter((a) => a.tipo === "interes")
      .reduce((sum, a) => sum + a.monto, 0);

    const interesesPendientes = interesesTotales - interesesPagados;

    // ==========================================
    // 2️⃣ Validación de interés completo
    // ==========================================
    if (abono < interesesPendientes) {
      return res.status(400).json({
        error: `Debes pagar intereses completos: ${interesesPendientes}`,
      });
    }

    // ==========================================
    // 3️⃣ Registrar interés
    // ==========================================
    let restante = abono;

    if (interesesPendientes > 0) {
      empeño.abonos.push({
        fecha: new Date(),
        monto: interesesPendientes,
        tipo: "interes",
      });

      restante -= interesesPendientes;

      // 🔹 Actualizar capital general con intereses
      const capital = await Capital.findOne();
      if (!capital) throw new Error("Capital no inicializado");
      capital.saldo += interesesPendientes;
      await capital.save();

      // 🟢 Historial: pago de intereses
      await Historial.create({
        tipoMovimiento: "Pago de intereses",
        descripcion: `El cliente ${empeño.cliente} pagó ${interesesPendientes} en intereses del contrato ${empeño.numeroFactura}`,
        monto: interesesPendientes,
      });
    }

    // ==========================================
    // 4️⃣ Si solo se pagó interés
    // ==========================================
    if (restante === 0) {
      await empeño.save();
      return res.json({
        mensaje: "Intereses pagados. Contrato al día.",
        contrato: empeño,
      });
    }

    // ==========================================
    // 5️⃣ Registrar abono a capital
    // ==========================================
    if (restante > 0) {
      empeño.abonos.push({
        fecha: new Date(),
        monto: restante,
        tipo: "capital",
      });

      // 🔹 Actualizar capital general con capital abonado
      const capital = await Capital.findOne();
      if (!capital) throw new Error("Capital no inicializado");
      capital.saldo += restante;
      await capital.save();

      // 🟢 Historial: abono a capital
      await Historial.create({
        tipoMovimiento: "Abono a capital",
        descripcion: `El cliente ${empeño.cliente} abonó ${restante} al capital del contrato ${empeño.numeroFactura}`,
        monto: restante,
      });
    }
    const nuevoCapital = empeño.valorPrestamo - restante;

    // ==========================================
    // 6️⃣ Si se pagó todo el capital → liquidar
    // ==========================================
    if (nuevoCapital <= 0) {
      empeño.estado = "liquidado";
      await empeño.save();
      await Historial.create({
        tipoMovimiento: "Liquidación total",
        descripcion: `El cliente ${empeño.cliente} liquidó completamente el contrato ${empeño.numeroFactura}`,
        monto: abono,
      });
      return res.json({
        mensaje: "Contrato liquidado completamente.",
        contrato: empeño,
      });
    }

    // ==========================================
    // 7️⃣ Crear nuevo contrato (renovación)
    // ==========================================
    empeño.estado = "liquidado";
    await empeño.save();

    const nuevoContrato = new Empeno({
      cliente: empeño.cliente,
      numeroFactura: await generarNuevaFactura(),
      descripcionPrenda: empeño.descripcionPrenda,
      kilataje: empeño.kilataje,
      valorPrestamo: nuevoCapital,

      // ✅ INTERÉS ACTUALIZADO AQUÍ
      interesMensual: calcularInteresMensual(nuevoCapital),

      fechaInicio: new Date(),
      estado: "activo",
      abonos: [],
    });

    await nuevoContrato.save();

    // 🟢 Historial: renovación de contrato
    await Historial.create({
      tipoMovimiento: "Renovación de contrato",
      descripcion: `El cliente ${empeño.cliente} renovó su contrato ${empeño.numeroFactura} con nuevo préstamo de ${nuevoCapital}`,
      monto: nuevoCapital,
    });

    return res.json({
      mensaje: "Capital abonado. Contrato renovado.",
      contratoAnterior: empeño,
      nuevoContrato,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

/**
 * Eliminar un empeno
 */
router.delete("/:id", async (req, res) => {
  try {
    const eliminado = await Empeno.findByIdAndDelete(req.params.id);
    if (!eliminado)
      return res.status(404).json({ mensaje: "empeno no encontrado" });

    res.json({ mensaje: "empeno eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
