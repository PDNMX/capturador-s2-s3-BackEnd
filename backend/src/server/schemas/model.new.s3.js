// importar mongoose
const { Mongoose } = require('mongoose');
const { Schema, model } = require('mongoose');
// Define el esquema de Mongoose para "faltaCometida" (elemento del array)

const faltaCometidaSchema = new Schema({
  clave: {
    type: String,
    enum: [
      "CAUSAR_DAÑOS",
      "COHECHO",
      "PECULADO",
      "DESVIO_RECURSOS",
      "UTILIZACION_INF",
      "CONFLICTO_INTERES",
      "CONTRATACION_INDEBIDA",
      "ENRIQUECIMIENTO",
      "SIMULACION",
      "TRAFICO_INFLUENCIAS",
      "ENCUBRIMIENTO",
      "DESACATO",
      "NEPOTISMO",
      "OBSTRUCCION",
      "OTRO"
    ],
    required: true
  },
  valor: { type: String, required: true },
  nombreNormatividadInfringida: { type: String, required: true },
  articuloNormatividadInfringida: { type: [Number], required: true }, // Arreglo de números
  fraccionNormatividadInfringida: { type: [Number], required: true } // Arreglo de números
});

// Define el esquema de Mongoose para "faltaGrave" (propiedad del objeto principal)
const faltaGraveSchema = new Schema({
  // Define las propiedades y tipos de datos para cada propiedad del objeto "faltaGrave"
  // Asegúrate de que los nombres y tipos coincidan con el JSON Schema
  id: {
    type: String, required: true,
  },
  fechaCaptura: {
    type: String,
  },
  expediente: {
    type: String,
  },
  nombres: {
    type: String,
  },
  primerApellido: {
    type: String,
  },
  segundoApellido: {
    type: String,
  },
  curp: {
    type: String,
  },
  rfc: {
    type: String,
  },
  sexo: {
    type: String,
  },
  entePublico: {
    type: Object,
    // Si hay propiedades y restricciones específicas para "entePublico", puedes definirlas aquí
  },
  empleoCargoComision: {
    type: Object,
    // Si hay propiedades y restricciones específicas para "empleoCargoComision", puedes definirlas aquí
  },
  origenInvestigacion: {
    type: Object,
    // Si hay propiedades y restricciones específicas para "origenInvestigacion", puedes definirlas aquí
  },
  faltaCometida: {
    type: [faltaCometidaSchema], // Es un array que contiene objetos definidos por faltaCometidaSchema
  },
});

// Define el esquema de Mongoose para el objeto principal (con "tipoDeFalta" y "faltaGrave")
const sSancionadosSchemaV2 = new Schema({
  tipoDeFalta: {
    type: String, required: true,
  },
  faltaGrave: {
    type: faltaGraveSchema, required: true// Es un objeto definido por faltaGraveSchema
  },
});
//sSancionadosSchemaV2.plugin(MongoosePaginate);
module.exports = {sSancionadosSchemaV2};
// Exporta el modelo de mongoose basado en el esquema
//module.exports = mongoose.model('Ssancionados', sSancionadosSchemaV2);
/* const sSancionadosS3V2 = model('Ssancionados', sSancionadosSchemaV2);
module.exports = sSancionadosS3V2; */