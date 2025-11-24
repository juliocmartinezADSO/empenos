import Historial from "../models/Historial.js";

export const registrarMovimientoCapital = async ({
  tipoMovimiento,
  monto,
  interesesdeDesempeño =  0,
  descripcion,
}) => {
  await Historial.create({
    tipoMovimiento,
    monto,
    descripcion,
    fechaReal: new Date(),
    interesesdeDesempeño,
    fechaReal: new Date(),
  });
};
