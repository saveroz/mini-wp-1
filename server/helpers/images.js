// require('dotenv').config()
const urlToFileName = require('./urlToFileName')

const { Storage } = require('@google-cloud/storage')

const CLOUD_BUCKET = process.env.CLOUD_BUCKET

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT,
  keyFilename: process.env.KEYFILE_PATH
})
const bucket = storage.bucket(CLOUD_BUCKET)

const getPublicUrl = (filename) => {
  return `https://storage.googleapis.com/${CLOUD_BUCKET}/${filename}`
}

const sendUploadToGCS = (req, res, next) => {
  // console.log(req.file ,"masuk ke upload GCS")
  if (!req.file) {
    return next()
  }
  else if (!req.file.mimetype.includes('image')) {
    throw({
      status: 406,
      message: "File type should be image"
    })
  }

  const gcsname = Date.now() + req.file.originalname
  const file = bucket.file(gcsname)

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype
    }
  })

  stream.on('error', (err) => {
    req.file.cloudStorageError = err
    next(err)
  })

  stream.on('finish', () => {
    req.file.cloudStorageObject = gcsname
    file.makePublic().then(() => {
      req.file.cloudStoragePublicUrl = getPublicUrl(gcsname)
      next()
    })
  })

  stream.end(req.file.buffer)
}

async function deleteFile(req,res,next,url) {

  // let filename = req.body.link
  console.log("masuk ke delete file gcs")
  let filename = urlToFileName(url)

  try {
    await storage
      .bucket(CLOUD_BUCKET)
      .file(filename)
      .delete();
      res.status(200).json({
      message: "successfully deleted in storage"
    })
  }
  catch{
    // res.status(500).json("hapus bro")
    // console.log("masuk ke catch")
    next({status:500, message :"error when deleting the file on google cloud storage"})
  }

}

const Multer = require('multer')
const multer = Multer({
    storage: Multer.MemoryStorage,
    limits: {
      fileSize: 5 * 1024 * 1024
    }
    
  })

module.exports = {
  getPublicUrl,
  sendUploadToGCS,
  multer,
  deleteFile
}
