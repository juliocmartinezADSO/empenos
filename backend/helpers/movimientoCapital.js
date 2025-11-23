import Historial from "../models/Historial.js";

export const registrarMovimientoCapital = async ({
  tipoMovimiento,
  monto,
  descripcion,
}) => {
  await Historial.create({
    tipoMovimiento,
    monto,
    descripcion,
    fechaReal: new Date(),
  });
};
