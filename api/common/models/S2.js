const mongoose = require("mongoose");

// Definir un esquema de Mongoose para el modelo de producto
const S2Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  }
});

// Crear el modelo de producto utilizando el esquema
const S2 = mongoose.connection.useDb("S2").model("spic", S2Schema);

// Exportar las funciones del modelo de producto
module.exports = {
  createS2: (data) => {
    const s2 = new S2(data);
    return s2.save();
  },
};
