const ProviderModel = require("../../common/models/Provider");

module.exports = {
    createProvider: (req, res) => {
        const {body} = req;
        //console.log(req.body);
        
         ProviderModel.insertProvider(body)
        .then((provider) => {
            //console.log(req);
            return res.status(200).json({
              status: true,
              data: provider.toJSON(),
              message : "proveedor creado correctamente desde proyecto con nombre api"
            });
          })
          .catch((err) => {
            return res.status(500).json({
              status: false,
              error: err,
              message: "hubo un error"
            });
          }); 
      },
      editProvider: (req, res) => {
        const {body} = req;
        const id = req.params.id;
      
        // Validación de datos
        if (!body.name || !body.description) {
          return res.status(400).json({
            status: false,
            error: "Los campos nombre y descripción son obligatorios",
          });
        }
      
        // Actualización del proveedor
        ProviderModel.updateProvider(id, body)
          .then((provider) => {
            //console.log(req);
            return res.status(200).json({
              status: true,
              data: provider.toJSON(),
              message: "Proveedor editado correctamente desde proyecto con nombre api",
            });
          })
          .catch((err) => {
            return res.status(500).json({
              status: false,
              error: err,
              message: "Hubo un error",
            });
          });
      },
      
}