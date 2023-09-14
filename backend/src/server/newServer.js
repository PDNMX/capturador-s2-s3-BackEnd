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
const {nuevoS2Schema} =  require('./schemas/model.new.s2.js');

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
  //// update s2v2 from s2
app.post('/updateS2v2',async (req, res) =>{  
    const newdocument = req.body;
    const usuario = req.body.usuario;
    delete req.body.usuario;
    newdocument['fechaActualizacion'] = moment().format();

    Spic = S2.model('Spic', nuevoS2Schema, 'spic');
    const spicDocument = await Spic.findOne({ usuario });

    if (!spicDocument) {
    res.status(404).send("No se encontró el registro de Spic");
    
  } else {
    spicDocument.set(newdocument);
    response = await spicDocument.save();
    res.status(200).json({message:'Mensaje de actualizacion correcta', response});
  }
    
  
  });
  
  //************************************ Final API S2 V2.1 ****************************************************/  
//------------------------------ final de los endpoints para el api del capturador S2  ------------------------------------------------------