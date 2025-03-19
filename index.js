require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const aws = require('aws-sdk');
const File = require('./models/File');
const { uploadFile, findFile, getAllFiles } = require('./controllers/fileController');

const app = express();
app.use(cors());
app.use(express.json());

// Configurar AWS S3
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1' // Altere para sua região
});

// Configuração do Multer para S3
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'), false);
    }
  },
  limits: {
    files: 50
  }
});


// Rotas
app.post('/upload', upload.array('files'), uploadFile);
app.get('/files/:filename', findFile);
app.get('/newsletters', getAllFiles);

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));