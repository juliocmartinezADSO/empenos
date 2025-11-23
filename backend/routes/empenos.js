// routes/empenoRoutes.js
import express from "express";
import authJWT from "../middlewares/authJWT.js";
import checkRole from "../middlewares/checkRole.js";
import Capital from "../models/Capital.js";
import Empeno from "../models/Empeno.js";
import Historial from "../models/Historial.js";
import HistorialProcesos from "../models/HistorialProcesos.js";
import fechaOperacion from "../middlewares/fechaOperacion.js";
import { registrarMovimientoCapital } from "../helpers/movimientoCapital.js";

const router = express.Router();

//Inicializar capital
async function inicializarCapital() {
  const timestamp = new Date();
  const existe = await Capital.findOne();
  if (!existe) {
    await new Capital({ saldoInicial: 100000000, saldo: 100000000 }).save(); // 100 millones
    console.log("Capital inicial creado: 100.000.000");

    await Historial.create({
      tipoMovimiento: "Inyección de capital",
      descripcion: `Se registró una inyeccion de capital por valor de $100 millones de pesos`,
      monto: 100000000,
      esCapitalInicial: true,
      fechaReal: timestamp,
    });
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

router.post(
  "/",
  authJWT,
  checkRole("admin", "empleado"),
  fechaOperacion,
  async (req, res) => {
    const fechaOp = req.fechaOperacion;
    const timestamp = req.timestamp;

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
        fechaInicio: fechaOp,
        fechaReal: timestamp,
        contratoPadreId: null, // temporal, se define luego
      });

      await nuevoEmpeno.save();

      // 🔹 Descontar el capital de la caja
      capital.saldo -= valorPrestamo;
      const monto = valorPrestamo;

      nuevoEmpeno.contratoPadreId = nuevoEmpeno._id;
      await nuevoEmpeno.save();

      await capital.save();
      // Registrar movimiento en el historial de capital
      // Después de procesar el empeño...
      await registrarMovimientoCapital({
        tipoMovimiento: "empeno",
        monto: monto,
        descripcion: `Nuevo empeño por ${monto}`,
      });

      //Historial del empeño
      // después de crear el empeño exitosamente
      await HistorialProcesos.create({
        contratoId: nuevoEmpeno._id,
        contratoPadreId: nuevoEmpeno.contratoPadreId,
        cedulaCliente: nuevoEmpeno.cliente.cedula,
        tipoMovimiento: "empeno",
        monto,
        saldoFinal: monto,
        fechaReal: timestamp,
        descripcion: `El cliente ${nuevoEmpeno.cliente.nombre} realizó un empeño por valor de ${monto}`,

        detalle: {
          infoFinanciera: {
            capital: valorPrestamo,
            interes: interesMensual,
            fecha: fechaOp,
          },
          infoContrato: {
            factura: nuevoEmpeno.numeroFactura,
            descripcionPrenda,
            kilataje,
          },
        },
      });

      res.status(201).json({
        mensaje: "Empeño exitoso",
        empeno: nuevoEmpeno,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

/* Obtener todos los empenos con intereses acumulados
 */
router.get("/", authJWT, checkRole("admin", "empleado"), async (req, res) => {
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
router.get(
  "/:id",
  authJWT,
  checkRole("admin", "empleado"),
  async (req, res) => {
    try {
      const emp = await Empeno.findById(req.params.id);
      if (!emp)
        return res.status(404).json({ mensaje: "empeno no encontrado" });

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
  }
);

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
router.post(
  "/:id/abonar",
  authJWT,
  checkRole("admin", "empleado"),
  fechaOperacion,
  async (req, res) => {
    const fechaOp = req.fechaOperacion;
    const timestamp = req.timestamp;
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
        return res
          .status(400)
          .json({ error: "Este contrato ya fue liquidado." });
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
      // 2️⃣ Detectar liquidación TOTAL en un SOLO pago
      // ==========================================
      const capitalPendiente = empeño.valorPrestamo;
      const totalParaLiquidar = interesesPendientes + capitalPendiente;

      // ❌ Bloquear pagos mayores a lo que realmente se debe
      if (abono > totalParaLiquidar) {
        return res.status(400).json({
          message: "El abono excede el valor total pendiente.",
          totalPendiente: totalParaLiquidar,
        });
      }

      if (abono === totalParaLiquidar) {
        // Actualizar capital recibiendo el capital prestado
        const capital = await Capital.findOne();
        capital.saldo += capitalPendiente + interesesPendientes;
        await capital.save();

        // Liquidar contrato
        empeño.estado = "liquidado";
        await empeño.save();

        // Después de procesar el desempeño...
        await registrarMovimientoCapital({
          tipoMovimiento: "liquidacion",
          monto: abono,
          descripcion: `Liquidación total del contrato ${empeño.numeroFactura}`,
        });

        // Historial ÚNICO
        await HistorialProcesos.create({
          contratoId: empeño._id,
          contratoNuevoId: null,
          contratoPadreId: empeño.contratoPadreId,
          cedulaCliente: empeño.cliente.cedula,

          tipoMovimiento: "liquidacion",
          monto: abono,
          saldoFinal: 0,
          descripcion: `Liquidación total del contrato ${empeño.numeroFactura}`,

          detalle: {
            infoFinanciera: {
              capital: 0,
              interes: 0,
              fecha: fechaOp,
            },
            infoContrato: {
              factura: empeño.numeroFactura,
              descripcionPrenda: empeño.descripcionPrenda,
              kilataje: empeño.kilataje,
            },
          },

          fechaReal: timestamp,
        });

        return res.json({
          mensaje: "Contrato liquidado completamente en un solo pago.",
          contrato: empeño,
        });
      }

      // ==========================================
      // 3️⃣ NUEVA VALIDACIÓN — pago mínimo: 1 mes
      // ==========================================
      if (abono < empeño.interesMensual) {
        return res.status(400).json({
          error: `El pago mínimo es 1 mes de interés: ${empeño.interesMensual} pesos.`,
        });
      }

      // ==========================================
      // 4️⃣ Calcular cuántos meses paga realmente
      // ==========================================
      const mesesPagados = Math.floor(abono / empeño.interesMensual);

      // Intereses reales a pagar según lo que debe
      const interesesAPagar = Math.min(
        mesesPagados * empeño.interesMensual,
        interesesPendientes
      );

      // Parte del abono que queda después de pagar los intereses
      let restante = abono - interesesAPagar;

      // Registrar los intereses pagados
      if (interesesAPagar > 0) {
        empeño.abonos.push({
          fecha: fechaOp,
          monto: interesesAPagar,
          tipo: "interes",
        });

        const capital = await Capital.findOne();
        capital.saldo += interesesAPagar;
        await capital.save();

        // Después de procesar el desempeño...
        await registrarMovimientoCapital({
          tipoMovimiento: "abono_interes",
          monto: interesesAPagar,
          descripcion: `Pago de ${mesesPagados} mes(es) de interés del contrato ${empeño.numeroFactura}`,
        });

        // Historial
        await HistorialProcesos.create({
          contratoId: empeño._id,
          contratoNuevoId: null,
          contratoPadreId: empeño.contratoPadreId,
          cedulaCliente: empeño.cliente.cedula,
          tipoMovimiento: "abono_interes",
          monto: interesesAPagar,
          saldoFinal: empeño.valorPrestamo,
          descripcion: `Pago de ${mesesPagados} mes(es) de interés del contrato ${empeño.numeroFactura}`,
          detalle: {
            infoFinanciera: {
              capital: 0,
              interes: interesesAPagar,
              fecha: fechaOp,
            },
            infoContrato: {
              factura: empeño.numeroFactura,
              descripcionPrenda: empeño.descripcionPrenda,
              kilataje: empeño.kilataje,
            },
          },

          fechaReal: timestamp,
        });
      }

      // ==========================================
      // 4️⃣ Si solo se pagaron intereses
      // ==========================================
      if (restante === 0) {
        // Cálculo actualizado de intereses después del pago
        const interesesRestantes = interesesPendientes - interesesAPagar;

        await empeño.save();

        // Caso 1: Pagó solo 1 mes
        if (mesesPagados === 1 && interesesRestantes > 0) {
          return res.json({
            mensaje: "Interés pagado.",
            contrato: empeño,
          });
        }

        // Caso 2: Pagó varios meses pero aún debe
        if (mesesPagados > 1 && interesesRestantes > 0) {
          return res.json({
            mensaje: "Intereses abonados parcialmente.",
            contrato: empeño,
          });
        }

        // Caso 3: Ya quedó al día
        if (interesesRestantes === 0) {
          return res.json({
            mensaje: "Intereses pagados. Contrato al día.",
            contrato: empeño,
          });
        }
      }

      // ==========================================
      // 5️⃣ Registrar abono a capital
      // ==========================================

      const nuevoCapital = empeño.valorPrestamo - restante;

      // ==========================================
      // 6️⃣ Si se pagó todo el capital → liquidar
      // ==========================================
      if (nuevoCapital <= 0) {
        empeño.estado = "liquidado";
        await empeño.save();

        // Después de procesar el desempeño...
        await registrarMovimientoCapital({
          tipoMovimiento: "liquidacion",
          monto: abono,
          descripcion: `Liquidación total del contrato ${empeño.numeroFactura}`,
        });

        // Historial ÚNICO
        await HistorialProcesos.create({
          contratoId: empeño._id,
          contratoNuevoId: null,
          contratoPadreId: empeño.contratoPadreId,
          cedulaCliente: empeño.cliente.cedula,

          tipoMovimiento: "liquidacion",
          monto: abono,
          saldoFinal: 0,
          descripcion: `Liquidación total del contrato ${empeño.numeroFactura}`,

          detalle: {
            infoFinanciera: {
              capital: 0,
              interes: 0,
              fecha: fechaOp,
            },
            infoContrato: {
              factura: empeño.numeroFactura,
              descripcionPrenda: empeño.descripcionPrenda,
              kilataje: empeño.kilataje,
            },
          },

          fechaReal: timestamp,
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
      // 🔹 Sumar capital recuperado en la renovación
      const capital = await Capital.findOne();
      capital.saldo += restante; // este "restante" es el abono a capital
      await capital.save();

      const nuevoContrato = new Empeno({
        cliente: empeño.cliente,
        numeroFactura: await generarNuevaFactura(),
        descripcionPrenda: empeño.descripcionPrenda,
        kilataje: empeño.kilataje,
        valorPrestamo: nuevoCapital,

        // ✅ INTERÉS ACTUALIZADO AQUÍ
        interesMensual: calcularInteresMensual(nuevoCapital),

        fechaInicio: fechaOp,
        fechaReal: timestamp,
        estado: "activo",
        abonos: [],
        contratoPadreId: empeño.contratoPadreId,
      });

      await nuevoContrato.save();

      // Después de procesar la renovación...
      await registrarMovimientoCapital({
        tipoMovimiento: "renovacion",
        monto: restante,
        descripcion: `Renovación del contrato ${empeño.numeroFactura} → nuevo contrato ${nuevoContrato.numeroFactura} por valor ${nuevoCapital}`,
      });

      // 🟢 Historial: renovación de contrato
      await HistorialProcesos.create({
        contratoId: empeño._id,
        contratoNuevoId: nuevoContrato._id,
        contratoPadreId: empeño.contratoPadreId,

        cedulaCliente: empeño.cliente.cedula,
        tipoMovimiento: "renovacion",
        monto: restante,
        saldoFinal: nuevoCapital,
        descripcion: `Renovación del contrato ${empeño.numeroFactura} → nuevo contrato ${nuevoContrato.numeroFactura} por valor ${nuevoCapital}`,
        detalle: {
          infoFinanciera: {
            capital: restante,
            interes: 0,
            fecha: fechaOp,
          },
          infoContrato: {
            factura: nuevoContrato.numeroFactura,
            descripcionPrenda: empeño.descripcionPrenda,
            kilataje: empeño.kilataje,
          },
        },

        fechaReal: timestamp,
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
  }
);

//Empeños activos
router.get(
  "/estado/:estado",
  authJWT,
  checkRole("admin", "empleado"),
  async (req, res) => {
    try {
      const { estado } = req.params;

      const estadosValidos = ["activo", "atrasado", "renovado", "liquidado"];

      if (!estadosValidos.includes(estado.toLowerCase())) {
        return res.status(400).json({
          error: `El estado '${estado}' no es válido. Estados permitidos: ${estadosValidos.join(
            ", "
          )}.`,
        });
      }

      // Buscar los empeños con ese estado
      const empenos = await Empeno.find({ estado }).sort({ fechaInicio: -1 });

      if (!empenos.length) {
        return res.status(404).json({
          mensaje: `No se encontraron empeños con estado '${estado}'.`,
        });
      }

      res.json(empenos);
    } catch (error) {
      console.error("Error al obtener los empeños por estado:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

//Empeños liquidados

export default router;
