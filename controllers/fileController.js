const File = require('../models/File');
const s3 = require('../config/s3Config'); // Alterado para usar a configuração centralizada

exports.uploadFile = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const savedFiles = await Promise.all(
      req.files.map(async (file) => {
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `pdfs/${Date.now()}_${file.originalname}`, // Alterado o prefixo
          Body: file.buffer,
          ContentType: file.mimetype,

        };

        const s3Response = await s3.upload(params).promise();

        const newFile = new File({
          filename: file.originalname,
          s3Key: s3Response.Key,
          url: s3Response.Location
        });

         
          return await newFile.save({ maxTimeMS: 15000 });
      })
    );

    res.status(201).json(savedFiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.findFile = async (req, res) => {
  try {
    const file = await File.findOne({ filename: req.params.filename });
    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Redirecionar para a URL do S3
    res.redirect(file.url);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllFiles = async (req, res) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.status(200).json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};