const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongoose = require('mongoose');

const proveedorRegistrosSchema = new Schema({
  proveedorId: mongoose.ObjectId,
  registroSistemaId: mongoose.ObjectId,
  sistema: String
});

proveedorRegistrosSchema.plugin(mongoosePaginate);

let proveedorRegistros = model('proveedorRegistros', proveedorRegistrosSchema, 'proveedorRegistros');

module.exports = proveedorRegistros;
