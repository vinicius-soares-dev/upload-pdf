require('dotenv').config();
const express = require('express');
const cors = require('cors');
const upload = require('./middleware/upload');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Rotas
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const uploadResults = await Promise.all(
      req.files.map(async (file) => {
        const key = `pdfs/${Date.now()}_${file.originalname}`;
        
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: { // Armazenamos metadados no próprio objeto
            originalname: file.originalname,
            size: file.size.toString()
          }
        };

        await s3.send(new PutObjectCommand(params));
        
        // Gerar URL assinada com validade de 1 hora
        const url = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: key
        }), { expiresIn: 3600 });

        return {
          filename: file.originalname,
          url,
          key,
          size: file.size,
          uploadedAt: new Date()
        };
      })
    );

    res.status(201).json(uploadResults);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/files/:key', async (req, res) => {
  try {
    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: req.params.key
    }), { expiresIn: 3600 });

    res.redirect(url);
  } catch (error) {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

app.get('/newsletters', async (req, res) => {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'pdfs/'
    }));

    const files = data.Contents.map(file => ({
      key: file.Key,
      filename: file.Key.split('_').pop(),
      size: file.Size,
      lastModified: file.LastModified,
      url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`
    }));

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));