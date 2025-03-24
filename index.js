require('dotenv').config();
const express = require('express');
const cors = require('cors');
const upload = require('./middleware/upload');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Verificação inicial das variáveis de ambiente
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Variável de ambiente faltando: ${varName}`);
    process.exit(1);
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// Configuração otimizada do S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Middleware de sanitização
const sanitizeKey = (key) => key.replace(/[^a-zA-Z0-9!\-_.*'()]/g, '');

// Rotas
app.post('/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const results = await Promise.all(req.files.map(async (file) => {
      const sanitizedKey = `pdfs/${Date.now()}_${sanitizeKey(file.originalname)}`;
      
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: sanitizedKey,
        Body: file.buffer,
        ContentType: 'application/pdf',
        Metadata: {
          originalname: sanitizedKey,
          size: file.size.toString()
        }
      };

      await s3.send(new PutObjectCommand(uploadParams));

      const url = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: sanitizedKey
      }), { expiresIn: 3600 });

      return {
        filename: file.originalname,
        url,
        key: sanitizedKey,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };
    }));

    res.status(201).json(results);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Falha no upload do arquivo' });
  }
});

app.get('/files/:key', async (req, res) => {
  try {
    const sanitizedKey = sanitizeKey(req.params.key);
    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: sanitizedKey
    }), { expiresIn: 3600 });

    res.redirect(url);
  } catch (error) {
    console.error('File Fetch Error:', error);
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

app.get('/newsletters', async (req, res) => {
  try {
    const { Contents } = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'pdfs/'
    }));

    const files = Contents.map(file => ({
      key: file.Key,
      filename: file.Key?.split('_')?.pop()?.replace('.pdf', '') || 'arquivo',
      size: file.Size,
      lastModified: file.LastModified?.toISOString() || new Date().toISOString(),
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.Key}`
    }));

    res.json(files);
  } catch (error) {
    console.error('Newsletters Error:', error);
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Middleware de erro melhorado
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🪣 Bucket S3: ${BUCKET_NAME}`);
  console.log(`🌍 Região AWS: ${process.env.AWS_REGION}`);
});