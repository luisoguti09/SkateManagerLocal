const multer = require('multer');
const path = require('path');
const fs = require('fs');


const storagePath = path.join(__dirname, '..', 'uploads', 'usuarios');
if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, storagePath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `usuario_${req.params.dni}${ext}`);
  }
});

const upload = multer({ storage });
module.exports = upload;

