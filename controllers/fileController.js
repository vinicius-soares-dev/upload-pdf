const File = require('../models/File');
const fs = require('fs');
const path = require('path');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const savedFiles = await Promise.all(
      req.files.map(async (file) => {
        const newFile = new File({ filename: file.filename });
        return await newFile.save();
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

    const filePath = path.join(__dirname, '../uploads', file.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    res.sendFile(filePath);
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