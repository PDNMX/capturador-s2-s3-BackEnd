/* Importamos la bibliotecas necesaras para el api del capturador */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const yaml = require('js-yaml');
const fs = require('fs');
var swaggerValidator = require('swagger-object-validator');
var _ = require('underscore');
var jwt = require('jsonwebtoken');
//// Biblioteca yup a consideracion para validaciones
const Yup = require('yup');
const User = require('./schemas/model.user');
const { Validator } = require('jsonschema');
//// Bibliotecas para la nueva version
const { SMTPClient } = require('emailjs');
//// Se importan los esquemas de la base de datos mongodb
//// Old
const Catalog = require('./schemas/model.catalog');
const Bitacora = require('./schemas/model.bitacora');
const proveedorRegistros = require('./schemas/model.proveedorRegistros');
const Provider = require('./schemas/model.proovedor');
//// Schemas definidos para el capturador del s2v2 y s3v2
const {nuevoS2Schema} =  require('./schemas/S2V2/model.new.s2.js');
//// Esquemas definidos v1
const { esquemaS2, schemaUserCreate, schemaUser, schemaProvider } = require('./schemas/yup.esquemas');
/* 
Bibliotecas necesarias para utilizar jsonscheme para generar el modelo de mongoose
*/

//const esquema = require('./schemas/esquema.json');

/* Validaciones de las variables de entorno referentes al email  */
if (typeof process.env.EMAIL === 'undefined') {
    console.log('no existe el valor de EMAIL en las variables de entorno');
    process.exit(1);
  }
  
  if (typeof process.env.PASS_EMAIL === 'undefined') {
    console.log('no existe el valor de PASS_EMAIL en las variables de entorno');
    process.exit(1);
  }
  
  if (typeof process.env.HOST_EMAIL === 'undefined') {
    console.log('no existe el valor de HOST_EMAIL en las variables de entorno');
    process.exit(1);
  }

  /* Conexiones a la base de datos de mongodb */
  const db = mongoose
  .connect('mongodb://' + process.env.USERMONGO + ':' + process.env.PASSWORDMONGO + '@' + process.env.HOSTMONGO + '/' + process.env.DATABASE+ '?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .then(() => console.log('Connect to MongoDB..'))
  .catch(err => console.error('Could not connect to MongoDB..', err));
mongoose.set('useFindAndModify', false);
//// Se configuran las conexiones las distinas bases de datos
let S2 = mongoose.connection.useDb('S2');
let S3S = mongoose.connection.useDb('S3_Servidores');
let S3P = mongoose.connection.useDb('S3_Particulares');

//// Puerto por el que se escucha el api del capturador
let port = process.env.PORT || 3004;
let app = express();
app.use(cors(), bodyParser.urlencoded({ extended: true }), bodyParser.json());

//// Se levanta el servidor de express
let server = app.listen(port, function () {
    let host = server.address().address;
    let port = server.address().port;
    console.log(' function cloud Server is listening at http://%s:%s', host, port);
  });

/* La función getArrayFormatTipoProcedimiento toma un arreglo como entrada 
y lo modifica. Para cada elemento p del arreglo, 
la función convierte el valor de la propiedad clave de p 
en un número entero utilizando la función parseInt. */

function getArrayFormatTipoProcedimiento(array) {
    _.each(array, function (p) {
      p.clave = parseInt(p.clave);
    });
    return array;
  }

//// funcion para validar los tokens
var validateToken = function (req) {
    var inToken = null;
    var auth = req.headers['authorization'];
  
    if (auth && auth.toLowerCase().indexOf('bearer') == 0) {
      inToken = auth.slice('bearer '.length);
    } else if (req.body && req.body.access_token) {
      inToken = req.body.access_token;
    } else if (req.query && req.query.access_token) {
      inToken = req.query.access_token;
    }
    // invalid token - synchronous
    try {
      var decoded = jwt.verify(inToken, process.env.SEED);
      return { code: 200, message: decoded };
    } catch (err) {
      // err
      let error = '';
      if (err.message === 'jwt must be provided') {
        error = 'Error el token de autenticación (JWT) es requerido en el header, favor de verificar';
      } else if (err.message === 'invalid signature' || err.message.includes('Unexpected token')) {
        error = 'Error token inválido, el token probablemente ha sido modificado favor de verificar';
      } else if (err.message === 'jwt expired') {
        error = 'Sesión expirada';
      } else {
        error = err.message;
      }
      let obj = { code: 401, message: error };
      return obj;
    }
  };

//// Funcion para cifrar la contraseña  
// Encrypts the password using SHA256 Algorithm, for enhanced security of the password
const encryptPassword = (password) => {
  // We will hash the password using SHA256 Algorithm before storing in the DB
  // Creating SHA-256 hash object
  const hash = crypto.createHash("sha256");
  // Update the hash object with the string to be encrypted
  hash.update(password);
  // Get the encrypted value in hexadecimal format
  return hash.digest("hex");
};


var validateToken = function (req) {
  var inToken = null;
  var auth = req.headers['authorization'];

  if (auth && auth.toLowerCase().indexOf('bearer') == 0) {
    inToken = auth.slice('bearer '.length);
  } else if (req.body && req.body.access_token) {
    inToken = req.body.access_token;
  } else if (req.query && req.query.access_token) {
    inToken = req.query.access_token;
  }
  // invalid token - synchronous
  try {
    var decoded = jwt.verify(inToken, process.env.SEED);
    return { code: 200, message: decoded };
  } catch (err) {
    // err
    let error = '';
    if (err.message === 'jwt must be provided') {
      error = 'Error el token de autenticación (JWT) es requerido en el header, favor de verificar';
    } else if (err.message === 'invalid signature' || err.message.includes('Unexpected token')) {
      error = 'Error token inválido, el token probablemente ha sido modificado favor de verificar';
    } else if (err.message === 'jwt expired') {
      error = 'Sesión expirada';
    } else {
      error = err.message;
    }
    let obj = { code: 401, message: error };
    return obj;
  }
};

/* 
    Funcioion para validarr la contraseña
*/
app.post('/validationpassword', async (req, res) => {
  var code = validateToken(req);
  if (code.code == 401) {
    res.status(401).json({ code: '401', message: code.message });
  } else if (code.code == 200) {
    try {
      let id_usuario = req.body.id_usuario;

      if (id_usuario == '') {
        res.status(200).json({ message: 'Id Usuario requerido.', Status: 500 });
        return false;
      }

      const result = await User.findById(id_usuario).exec();

      if (result.contrasenaNueva === true) {
        res.status(200).json({ message: 'Necesitas cambiar tu contraseña', Status: 500, contrasenaNueva: true, rol: result.rol, sistemas: result.sistemas, proveedor: result.proveedorDatos, estatus: result.estatus });
      } else {
        res.status(200).json({ message: 'Tu contraseña está al día.', Status: 200, contrasenaNueva: false, rol: result.rol, sistemas: result.sistemas, proveedor: result.proveedorDatos, estatus: result.estatus });
      }
    } catch (e) {
      console.log(e);
    }
  }
});

////%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% Inicio endpoints para proveedores %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% */
/* 
    Endpoint para crear un nuevo proveedor
*/
app.post('/create/provider', async (req, res) => {
  try {
    var code = validateToken(req);

    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      try {
        await schemaProvider.validate({
          dependencia: req.body.dependencia,
          sistemas: req.body.sistemas,
          estatus: true,
          fechaAlta: moment().format()
        });
        req.body['estatus'] = true;

        const nuevoProovedor = new Provider(req.body);
        let responce;
        responce = await nuevoProovedor.save();

        res.status(200).json(responce);
      } catch (e) {
        let errorMessage = {};
        errorMessage['errores'] = e.errors;
        errorMessage['campo'] = e.path;
        errorMessage['tipoError'] = e.type;
        errorMessage['mensaje'] = e.message;
        res.status(400).json(errorMessage);
      }
    }
  } catch (e) {
    console.log(e);
  }
});
/* 
    Endpoint para editar los datos de proveedores
*/
app.put('/edit/provider', async (req, res) => {
  try {
    var code = validateToken(req);

    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      try {
        await Yup.object().shape({ fechaActualizacion: Yup.string().required() }).concat(schemaProvider).validate({
          dependencia: req.body.dependencia,
          sistemas: req.body.sistemas,
          estatus: req.body.estatus,
          fechaActualizacion: moment().format()
        });

        const nuevoProovedor = new Provider(req.body);
        let responce;

        if (req.body._id) {
          if (req.body.estatus == false) {
            User.updateMany({ proveedorDatos: req.body._id }, { estatus: false }).exec();
          }
          var id = req.body._id.toString();
          var sistemasproveedor = req.body.sistemas;
          var usuarios = await User.find({ proveedorDatos: id });
          var nuevoSistemas = [];

          usuarios.map(async row => {
            if (sistemasproveedor.length < row.sistemas.length) {
              nuevoSistemas = [];
              row.sistemas.map(sistemasusuario => {
                sistemasproveedor.map(sistema => {
                  if (sistema == sistemasusuario) {
                    nuevoSistemas.push(sistema);
                  }
                });
              });
              await User.updateOne({ _id: row._id }, { sistemas: nuevoSistemas });
            } else if ((sistemasproveedor.length == 2 || sistemasproveedor.length == 1) && (row.sistemas.length == 1 || row.sistemas.length == 2)) {
              nuevoSistemas = [];
              row.sistemas.map(sistemasusuario => {
                sistemasproveedor.map(sistema => {
                  if (sistema == sistemasusuario) {
                    nuevoSistemas.push(sistema);
                  }
                });
              });
              await User.updateOne({ _id: row._id }, { sistemas: nuevoSistemas });
            }
          });

          responce = await Provider.findByIdAndUpdate(req.body._id, nuevoProovedor).exec();
          res.status(200).json(responce);
        } else {
          res.status(500).json({ message: 'Error : Datos incompletos', Status: 500 });
        }
      } catch (e) {
        let errorMessage = {};
        errorMessage['errores'] = e.errors;
        errorMessage['campo'] = e.path;
        errorMessage['tipoError'] = e.type;
        errorMessage['mensaje'] = e.message;
        res.status(400).json(errorMessage);
      }
    }
  } catch (e) {
    console.log(e);
  }
});
/* 
    Endpoint para borrar los proveedores
*/
app.delete('/deleteProvider', async (req, res) => {
  try {
    var code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      if (req.body.request._id) {
        let fechabaja = moment().format();
        let response = await Provider.findByIdAndUpdate(req.body.request._id, { $set: { fechaBaja: fechabaja, estatus: false } }).exec();
        let users = await User.updateMany({ proveedorDatos: req.body.request._id }, { $set: { estatus: false } });
        res.status(200).json({ message: 'OK', Status: 200, response: response });
      } else {
        res.status(500).json({ message: 'Error : Datos incompletos', Status: 500 });
      }
    }
  } catch (e) {
    console.log(e);
  }
});

////%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% Final endpoints para proveedores %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% */

////************************************************** Inicio endpoints para usuarios   **************************************************** */
/* 
  Endpoint para crear un usuario
*/

app.post('/create/user', async (req, res) => {
  try {
    var code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      try {
        var correoexiste = await User.find({ correoElectronico: { $regex: new RegExp('^' + req.body.correoElectronico, 'i') } }, { fechaBaja: { $eq: null } }).countDocuments();
        if (correoexiste === undefined) {
          correoexiste = 0;
        }

        var usuarioexiste = await User.find({ usuario: { $regex: new RegExp('^' + req.body.usuario, 'i') } }, { fechaBaja: { $eq: null } }).countDocuments();
        if (usuarioexiste === undefined) {
          ucreatesuarioexiste = 0;
        }

        if (correoexiste > 0 || usuarioexiste > 0) {
          res.status(500).json({ message: 'El correo electrónico y/o nombre de usuario ya existe.Debes ingresar otro.', Status: 500 });
        } else {
          var generator = require('generate-password');
          var pass = '';
          function generatepassword() {
            pass = generator.generate({
              length: 8,
              numbers: true,
              symbols: true,
              lowercase: true,
              uppercase: true,
              strict: true,
              exclude: '_[]<>~´¬@^⌐«»°√α±÷©§'
            });
          }

          generatepassword();
          
          //// Aqui se crea el objeto json que se va a insertar en la base de datos
          let fechaActual = moment();
          let passHash = encryptPassword(pass);
          console.log(passHash);
          let newBody = { ...req.body, contrasena: passHash, fechaAlta: fechaActual.format(), vigenciaContrasena: fechaActual.add(3, 'months').format().toString(), estatus: true };

          await schemaUserCreate.concat(schemaUser).validate({
            nombre: newBody.nombre,
            apellidoUno: newBody.apellidoUno,
            apellidoDos: newBody.apellidoDos,
            cargo: newBody.cargo,
            correoElectronico: newBody.correoElectronico,
            telefono: newBody.telefono,
            extension: newBody.extension,
            usuario: newBody.usuario,
            constrasena: newBody.contrasena,
            sistemas: newBody.sistemas,
            proveedorDatos: newBody.proveedorDatos,
            estatus: true,
            fechaAlta: newBody.fechaAlta,
            vigenciaContrasena: newBody.vigenciaContrasena,
            rol: '2'
          });
          if (newBody.passwordConfirmation) {
            delete newBody.passwordConfirmation;
          }

          delete newBody.constrasena;
          newBody['constrasena'] = passHash;
          newBody['contrasenaNueva'] = true;
          newBody['rol'] = 2;
          if (req.body.apellidoDos == '' || req.body.apellidoDos === undefined) {
            newBody['apellidoDos'] = '';
          }

          const client = new SMTPClient({
            user: process.env.EMAIL,
            password: process.env.PASS_EMAIL,
            host: process.env.HOST_EMAIL,
            ssl: true
          });

          const message = {
            text: 'Bienvenido al Sistema de Captura de Información - PDN',
            from: process.env.EMAIL,
            to: newBody.correoElectronico,
            subject: 'Bienvenido al Sistema de Captura de Información - PDN',
            attachment: [{ data: '<html><p>Buen día, anexamos tu credenciales para acceder al Sistema de Captura de Información:</p><br><p>Usuario: <code>' + newBody.usuario + '</code></p><br><p>Contraseña: <code>' + pass + '</code></p><br><br><p>Al iniciar sesión por primera vez deberás establecer una nueva contraseña</p></html>', alternative: true }]
          };

          client.send(message, function (err, message) {
            if (err != null) {
              res.status(200).json({ message: 'Hay errores al enviar tu nueva contraseña. Ponte en contacto con el administrador.', Status: 500 });
            }
          });

          const nuevoUsuario = new User(newBody);
          let response;
          response = await nuevoUsuario.save();
          res.status(200).json(response);
        }
      } catch (e) {
        let errorMessage = {};
        errorMessage['errores'] = e.errors;
        errorMessage['campo'] = e.path;
        errorMessage['tipoError'] = e.type;
        errorMessage['mensaje'] = e.message;
        res.status(400).json(errorMessage);
      }
    }
  } catch (e) {
    console.log(e);
  }
});

/* 
  Endpoint para editar 
*/
app.put('/edit/user', async (req, res) => {
  try {
    var code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      try {
        var correoexiste = await User.find({ correoElectronico: { $eq: req.body.correoElectronico }, usuario: { $ne: req.body.usuario }, fechaBaja: { $eq: null } }).countDocuments();
        if (correoexiste === undefined) {
          correoexiste = 0;
        }

        var proveedorvigente = await Provider.findById(req.body.proveedorDatos);
        let arrsistemas = [];
        for (let sistemaproveedor of proveedorvigente.sistemas) {
          for (let sistemauser of req.body.sistemas) {
            if (sistemaproveedor == sistemauser) {
              arrsistemas.push(sistemaproveedor);
            }
          }
        }

        if (correoexiste > 0) {
          res.status(500).json({ message: 'Error: El correo electrónico ya existe.', tipo: 'Error.', Status: 500 });
        } else if (proveedorvigente.fechaBaja != undefined) {
          res.status(500).json({ message: 'Error: El campo proveedor de datos es requerido.', tipo: 'Error.', Status: 500 });
        } else if (proveedorvigente.estatus == false && req.body.estatus == true) {
          res.status(500).json({ message: 'Error: El estatus del proveedor es no vigente.', tipo: 'Error.', Status: 500 });
        } else {
          let newBody = { ...req.body };
          newBody['sistemas'] = arrsistemas;
          await schemaUser.validate({
            nombre: newBody.nombre,
            apellidoUno: newBody.apellidoUno,
            apellidoDos: newBody.apellidoDos,
            cargo: newBody.cargo,
            correoElectronico: newBody.correoElectronico,
            telefono: newBody.telefono,
            extension: newBody.extension,
            usuario: newBody.usuario,
            constrasena: newBody.constrasena,
            sistemas: newBody.sistemas,
            proveedorDatos: newBody.proveedorDatos,
            estatus: newBody.estatus
          });
          if (req.body.apellidoDos == '' || req.body.apellidoDos === undefined) {
            newBody['apellidoDos'] = '';
          }

          const nuevoUsuario = new User(newBody);
          let response;
          if (req.body._id) {
            response = await User.findByIdAndUpdate(req.body._id, nuevoUsuario).exec();
            res.status(200).json(response);
          } else {
            res.status(500).json({ message: 'Error : Datos incompletos', tipo: 'Error.', Status: 500 });
          }
        }
      } catch (e) {
        let errorMessage = {};
        errorMessage['errores'] = e.errors;
        errorMessage['campo'] = e.path;
        errorMessage['tipoError'] = e.type;
        errorMessage['mensaje'] = e.message;
        res.status(400).json(errorMessage);
      }
    }
  } catch (e) {
    console.log(e);
  }
});

/* 
  Endpoint para obtener los usuarios
*/

app.post('/getUsers', async (req, res) => {
  try {
    var code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      let sortObj = req.body.sort === undefined ? {} : req.body.sort;
      let page = req.body.page === undefined ? 1 : req.body.page; //numero de pagina a mostrar
      let pageSize = req.body.pageSize === undefined ? 10 : req.body.pageSize;
      let query = req.body.query === undefined ? {} : req.body.query;

      const paginationResult = await User.paginate(query, { page: page, limit: pageSize, sort: sortObj, rol: '2' }).then();
      let objpagination = { hasNextPage: paginationResult.hasNextPage, page: paginationResult.page, pageSize: paginationResult.limit, totalRows: paginationResult.totalDocs };
      let objresults = paginationResult.docs;

      let objResponse = {};
      objResponse['pagination'] = objpagination;
      objResponse['results'] = objresults;

      res.status(200).json(objResponse);
    }
  } catch (e) {
    console.log(e);
  }
});
/* 
  Endpoint para obtener todos los usuario
*/
app.post('/getUsersFull', async (req, res) => {
  try {
    var code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      const result = await User.find({ fechaBaja: null, rol: '2' }).then();
      let objResponse = {};
      objResponse['results'] = result;
      res.status(200).json(objResponse);
    }
  } catch (e) {
    console.log(e);
  }
});
/* 
  Endpoint para borrar usuarios
*/
app.delete('/deleteUser', async (req, res) => {
  try {
    var code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
    } else if (code.code == 200) {
      if (req.body.request._id) {
        var data = [];

        let fechabaja = moment().format();
        let response = await User.findByIdAndUpdate(req.body.request._id, { $set: { fechaBaja: fechabaja } }).exec();
        res.status(200).json({ message: 'OK', Status: 200, response: response });
      } else {
        res.status(500).json([{ Error: 'Datos incompletos' }]);
      }
    }
  } catch (e) {
    console.log(e);
  }
});
////************************************************** Final endpoints para usuarios    ******************************************************* */
//// Endpoint para revisarla conexion del api del capturador
app.post('/prueba', async (req, res) => {
     try {
      var code = validateToken(req);
      if (code.code == 401) {
        res.status(401).json({ code: '401', message: code.message });
      } else if (code.code == 200) {
        res.status(200).json({ message: 'prueba con resultado correcto para el s3 y el s2 desde el archivo limpio.', Status: 200 });
        console.log("prueba ejecutada correctamente desde newserverjs")
      }
    } catch (e) {
      console.log(e);
    }
  /* } 
  res.status(200).json({ message: 'prueba desde archivo limpio con resultado correcto para el s3 y el s2. Borrar este endpoint', Status: 200 });
 */
});
//------------------------------ Inicio de los endpoints para el api del capturador S2  ------------------------------------------------------
//************************************ Inicio API S2 V2.1 ****************************************************/
// Validar el JSON recibido
app.post('/', (req, res) => {
  const data = req.body;

  // Validar el JSON
  const validationResult = jsonschema.validate(data, schema);

  if (validationResult.errors) {
    // Manejar el error
    res.status(400).json({ error: validationResult.errors[0] });
  } else {
    // El JSON es válido
    res.status(200).json(data);
  }
});

app.post('/insertS2v2', async (req, res) => {
    try {
      var code = validateToken(req);
      if (code.code == 401) {
        res.status(401).json({ code: '401', message: code.message });
      } else if (code.code == 200) {
  /* 
   En este bloque de codigo se inserta en la base de datos S2 en la coleccion de SPIC
  */
       ///// Se obtiene el id del usuario que esta realizando la peticion
       let usuario = req.body.usuario;
       delete req.body.usuario;
       let newdocument = req.body;
       // let newdocument = convertLevels(req.body);
       // console.log(newdocument['fechaCaptura']);
       let fecha = moment().tz("America/Mexico_City").format();
       newdocument['fechaCaptura'] = fecha;
       newdocument['fechaActualizacion'] = fecha;
       // let n = newdocument['fechaCaptura'];
       // console.log(newdocument);
       /* if (newdocument.segundoApellido == null || newdocument.segundoApellido == '' || newdocument.segundoApellido == 'undefined') {
         newdocument['segundoApellido'] = false;
       }  */
       // Se guarda el registro ssancionados en la base de datos
       let Spic = S2.model('Spic', nuevoS2Schema, 'spic');      
       let esquema = new Spic(newdocument);
       //console.log(esquema);
       const result = await esquema.save();
       // const result = await Spic.create(newdocument);ñ
       ///// Hasta este punto se inserta en spin de S2
       // const result = await esquema.insertOne(newdocument);
       let objResponse = {};
       objResponse['results'] = result; 
  /*
   En este bloque de codigo se inserta en la base de datos administracionUsuarios en la coleccion de proveedorDatos
  */
       let datausuario = await User.findById(usuario);
       const proveedorRegistros1 = new proveedorRegistros({ proveedorId: datausuario.proveedorDatos, registroSistemaId: result._id, sistema: 'S2', fechaCaptura:fecha, fechaActualizacion:fecha });
       let resp = await proveedorRegistros1.save();
       // console.log(result._id,);
       // console.log(datausuario.proveedorDatos);      
  /* 
       
  */     
       
       //recibidos:newdocument});
       //res.status(200).json({code:200,message:"se inserto correctamente", resultado:proveedorRegistros1}); 
       res.status(200).json({objResponse});
       //res.status(200).json({code:200,message:"se inserto correctamente esta prueba", recibidos:newdocument});
      }
    } catch (e) {
      console.log(e);
    }
  });

//// Endpoint para obtener todos los registros de la coleccion de S2
app.post('/getAllS2v2', async (req, res) => {
    try {
      const Spic = S2.model('Spic', nuevoS2Schema, 'spic'); 
      const registros = await Spic.find().exec();
      res.status(200).json(registros);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener los registros' });
    }
  });
  //// Endpoint list s2v2 from s2
app.post('/lists2v2', async (req, res) => {
    try {
      //const token = req.headers.authorization;
      //var code = validateToken(req);
      let code = validateToken(req);
      if (code.code == 401) {
        res.status(401).json({ code: '401', message: code.message });
      } else if (code.code == 200) {
        // Deshabilitar estas líneas debido a que las variables usuario y proveedorDatos no se utilizan
        let usuario = await User.findById(req.body.usuario);
        let proveedorDatos = usuario.proveedorDatos;
        let sistema = 'S2';
  
        ///let proveedorRegistros = S2.model('proveedorRegistros', proveedorRegistrosSchemaV2, 'proveedorRegistros');
  
        const result = await proveedorRegistros.find({ sistema: sistema, proveedorId: proveedorDatos }).then();
        let arrs2 = [];
        _.map(result, row => {
          arrs2.push(row.registroSistemaId);
        });
        let Spic = S2.model('Spic', nuevoS2Schema, 'spic');
        let sortObj = req.body.sort === undefined ? {} : req.body.sort;
        let page = req.body.page === undefined ? 1 : req.body.page; //numero de pagina a mostrar
        let pageSize = req.body.pageSize === undefined ? 10 : req.body.pageSize;
        let query = req.body.query === undefined ? {} : req.body.query;
  
        if (!query._id) {
          if (arrs2.length > 0) {
            query = { ...query, _id: { $in: arrs2 } };
          } else {
            query = { _id: { $in: arrs2 } };
          }
        }
  
        const paginationResult = await Spic.paginate(query, { page: page, limit: pageSize, sort: sortObj }).then();
        let objpagination = { hasNextPage: paginationResult.hasNextPage, page: paginationResult.page, pageSize: paginationResult.limit, totalRows: paginationResult.totalDocs };
        let objresults = paginationResult.docs;
  
        let objResponse = {};
        objResponse['pagination'] = objpagination;
        objResponse['results'] = objresults;
  
        res.status(200).json(objResponse);
        
        //const result2 = await Spic.find(arrs2[0]).then();
        ///let res2 = await Spic.findById(arrs2[0]).then();
        //console.log(arrs2[0]);
        // Crear un objeto con las propiedades relevantes del objeto req
        /* const requestData = {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          query: req.query,
          body: req.body
        }; */
        //res.status(200).json({ code: '200', message: 'Listando desde s2v2', requestData, ususario: usuario, proveedorDatos, sistema, result });
        //res.status(200).json({ code: '200', message: 'Listando desde s2v2', requestData, ususario: usuario });
        //res.status(200).json({ code: '200', message: 'Listando desde s2v2', result, arrs2, res2 });
      }
    } catch (e) {
      console.log(e);
    }
});
  //// update s2v2 from s2 // updateS2v2

/* app.post('/updatezS2v2/:id', async (req, res) => {
    try {
      //const token = req.headers.authorization;
      //var code = validateToken(req);
      let code = validateToken(req);
      if (code.code == 401) {
        res.status(401).json({ code: '401', message: code.message });
      } else if (code.code == 200) {
      ///// Se obtiene el id del usuario que esta realizando la peticion
      const id = req.params.id.toString();
      delete req.params.id;
      let newdocument = req.body;
      //delete newdocument.id;
      // let newdocument = convertLevels(req.body);
      // console.log(newdocument['fechaCaptura']);
      let fecha = moment().tz("America/Mexico_City").format();
      //newdocument['fechaCaptura'] = fecha;
      newdocument['fechaActualizacion'] = fecha;
      ///// Se instancia el modelo de la coleccion de spic
      let Spic = S2.model('Spic', nuevoS2Schema, 'spic');      
      let esquema = new Spic(newdocument);

      // await Spic.findByIdAndDelete(values._id);
      response = await Spic.findByIdAndUpdate(id, esquema, { upsert: true, new: true }).exec();

      res.status(200).json({ code: '200', message: 'Actualizando desde s2v2', id, newdocument });
      }
    } catch (e) {
      console.log(e);
    }
}); */
   
  /* 
      Endpoint para actualizar un documento de la coleccion ssancionados
  */
app.post('/updatezS2v2/:id', async (req, res) => {
  try {
    // const token = req.headers.authorization;
    // var code = validateToken(req);
    let code = validateToken(req);
    if (code.code == 401) {
      res.status(401).json({ code: '401', message: code.message });
        } else if (code.code == 200) {
    // Se obtiene el id del usuario que esta realizando la peticion
    const id = req.params.id.toString();
    // Se eliminan los campos innecesarios de la solicitud
    delete req.params.id;
    // Se obtiene el nuevo documento a actualizar
            let newdocument = req.body;
      
            // Se establece la fecha de actualización
            newdocument['fechaActualizacion'] = moment().tz("America/Mexico_City").format();
      
            // Se instancia el modelo de la colección de spic
            let Spic = S2.model('Spic', nuevoS2Schema, 'spic');
      
            // Se actualiza el documento
            const response = await Spic.findByIdAndUpdate(id, newdocument, { upsert: true, new: true }).exec();
      
            // Se devuelve la respuesta
            res.status(200).json({ code: '200', message: 'Actualizando desde s2v2', id, newdocument });
          }
        } catch (e) {
          console.log(e);
        }
});
      
  //************************************ Final API S2 V2.1 ****************************************************/  
//------------------------------ final de los endpoints para el api del capturador S2  ------------------------------------------------------
//++++++++++++++++++++++++++++++++++++++ Inicio API S3 V2  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
///////////////////////////////////////////// S3S


//++++++++++++++++++++++++++++++++++++++ Fin API S3 V2  +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//