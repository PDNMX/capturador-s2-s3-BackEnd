const router = require("express").Router();

// Controller Imports
const ProviderController = require("./controllers/ProviderController");
// Middleware Imports
const isAuthenticatedMiddleware = require("../common/middlewares/IsAuthenticatedMiddleware");
const SchemaValidationMiddleware = require("../common/middlewares/SchemaValidationMiddleware");

//********************************************************** crear usuario */*********************************************************/

router.post(
    "/probarUsuario",
    (_,res) => {
      console.log("hola desde el router de probar123");
      res.send(' funcionando correctamente desde rutas genericas!')
    }
);


module.exports = router;

//********************************************************** termian crear usuario ****************************************************/

