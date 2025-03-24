// const AWS = require('aws-sdk');

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION // Agora usando variável de ambiente
// });

// const s3 = new AWS.S3();

// module.exports = s3;

const { S3Client } = require('@aws-sdk/client-s3');

// Configuração segura com verificações
const getS3Config = () => {
  if (!process.env.S3_BUCKET_NAME) {
    throw new Error('S3_BUCKET_NAME não está definido nas variáveis de ambiente');
  }

  return {
    region: process.env.AWS_REGION || 'sa-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    forcePathStyle: true // Importante para compatibilidade
  };
};

const s3 = new S3Client(getS3Config());
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

module.exports = { s3, BUCKET_NAME };