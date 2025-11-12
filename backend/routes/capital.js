import express from "express";

import Capital from "../models/Capital.js";
import Historial from "../models/Historial.js";


const router = express.Router();


//Ruta para conocer el capital disponible
router.get("/", async(req, res)=>{
    try {
      const capital = await Capital.findOne();
    
      if(capital){
        return res.status(400).json({
          capital:capital.saldo
        })
      }
  
  
      
    } catch (error) {
      
    }
  })

//Ruta para inyectar capital al negocio
  router.post("/inyectar", async (req,res)=>{
    try {
        const {monto} = req.body

        if(!monto || monto <=0){
            return res.status(400).json({ error: "El monto debe ser mayor a 0." });

        }
        let capital = await Capital.findOne();
        if(!capital){
            capital = new Capital({ saldo: monto });

        }else{
            capital.saldo+=monto
        }

        await capital.save();

      
        await Historial.create({
            tipoMovimiento: "Inyección de capital",
            descripcion: `Se inyectaron ${monto} al capital principal`,
            monto,
          });

          res.json({
            mensaje:`Se ingresaron ${monto.toLocaleString("es-CO")} pesos colombianos`,
            saldoActual: capital.saldo
        })

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al ingresar dinero al capital." });
        
    }
  })

  router.post("/retirar", async(req,res)=>{
    try {
        const{monto}=req.body;

        if (isNaN(monto) || monto === undefined || monto === "" || monto === null) {
            return res.status(400).json({ error: "El valor del capital debe ser numérico." });
          }
        if(!monto || monto<100000){
            return res.status(400).json({
                error: "El monto debe ser superior a 100 mil pesos"
            })
        }
     

        let capital = await Capital.findOne()

        if(!capital.saldo){{
            return res.status(404).json({
                error: "No existe capital inicial en caja"
            })
        }}

        if(capital.saldo<monto){
            return res.status(400).json({
                error:"No hay suficiente saldo en caja para retirar"
            })
        }

        capital.saldo-=monto
        await capital.save()

        await Historial.create({
            "tipoMovimiento":`Retiro de la caja`,
            "descripcion":`Se retiró un saldo total de ${monto} pesos colombianos`,
            monto,
        })

        res.json({
            mensaje:`Se retiraron ${monto.toLocaleString("es-CO")} pesos de la caja.`,
            saldoActual:capital.saldo
        })

        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Error al retirar dinero de la caja." });
    }
  })

  export default router;