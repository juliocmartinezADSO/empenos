import Capital from "../models/Capital.js";

export async function obtenerCapital() {
  const capital = await Capital.findOne();
  if (!capital) throw new Error("Capital no inicializado");
  return capital;
}