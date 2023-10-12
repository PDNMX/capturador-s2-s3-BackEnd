/* 
URL del swaggerhub
https://app.swaggerhub.com/apis/RBalan21/pdn-s3p-v2/1.0.0#/psancionados/post_psancionados
*/

const { Schema, model } = require('mongoose');
const mongoosePaginate = require("mongoose-paginate-v2");

const datosGeneralesS3Pn = new Schema({
    tipoPersona: { type: String },
});

const personaFisica = new Schema({
    nombres: { type: String, required: true },
    primerApellido: { type: String, required: true },
    segundoApellido: { 
        valor: { type: String },
        sinSegundoApellido: { type: Boolean, required:true },
       },
    curp: { type: String, required: true },
    rfc: { type: String, required: true },
    telefono: { type: Number, requiered: true },
    objetoSocial: { type: String, required: true },
 
        
});

const p3SancionadosSchemaV2 = new Schema({
    id: { type: String },
    fechaCaptura: { type: Date },
    fechaActualizacion: { type: Date },
    expdiente: { type: String },
    personaFisica:{
        type: personaFisica,
    }
}); 

p3SancionadosSchemaV2.plugin(mongoosePaginate);
module.exports = { p3SancionadosSchemaV2 };
