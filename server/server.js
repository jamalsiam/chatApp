// server.js - WITH GALLERY UPLOAD SUPPORT

const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Create directories
const uploadsDir = path.join(__dirname, 'uploads');
const galleryDir = path.join(__dirname, 'gallery');
const tempDir = path.join(__dirname, 'temp');

[uploadsDir, galleryDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage for chat uploads (existing)
const chatStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, filename);
  }
});

// Storage for gallery uploads (NEW)
const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = function (req, file, cb) {
  const filename = file.originalname.toLowerCase();
  const mimetype = file.mimetype.toLowerCase();

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v', '.3gp'];
  const audioExtensions = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.opus'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'];

  const hasImageExt = imageExtensions.some(ext => filename.endsWith(ext));
  const hasVideoExt = videoExtensions.some(ext => filename.endsWith(ext));
  const hasAudioExt = audioExtensions.some(ext => filename.endsWith(ext));
  const hasDocExt = documentExtensions.some(ext => filename.endsWith(ext));
  const hasImageMime = mimetype.startsWith('image/');
  const hasVideoMime = mimetype.startsWith('video/');
  const hasAudioMime = mimetype.startsWith('audio/');
  const hasDocMime = mimetype.includes('pdf') || mimetype.includes('document') ||
                     mimetype.includes('text') || mimetype.includes('zip') ||
                     mimetype.includes('spreadsheet') || mimetype.includes('presentation');

  if (hasImageExt || hasVideoExt || hasAudioExt || hasDocExt || hasImageMime || hasVideoMime || hasAudioMime || hasDocMime) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, videos, audio, and documents allowed!'));
  }
};

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: fileFilter
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Serve static files
app.use('/media', express.static(uploadsDir, {
  setHeaders: (res, filepath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const ext = path.extname(filepath).toLowerCase();
    if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    } else if (ext === '.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === '.mov') {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (ext === '.m4a') {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (ext === '.mp3') {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (ext === '.wav') {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (ext === '.ogg' || ext === '.opus') {
      res.setHeader('Content-Type', 'audio/ogg');
    }
  }
}));

// Serve gallery files
app.use('/gallery', express.static(galleryDir, {
  setHeaders: (res, filepath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    const ext = path.extname(filepath).toLowerCase();
    if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    } else if (ext === '.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === '.mov') {
      res.setHeader('Content-Type', 'video/quicktime');
    }
  }
}));

// CHAT UPLOAD ENDPOINT (existing)
app.post('/upload', chatUpload.single('file'), (req, res) => {
  try {
 
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const chatId = req.body.chatId || 'general';
    const chatDir = path.join(uploadsDir, chatId);
    
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }
    
    const finalPath = path.join(chatDir, req.file.filename);
    fs.renameSync(req.file.path, finalPath);
    
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/media/${chatId}/${req.file.filename}`;
 
    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      chatId: chatId,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('❌ Chat upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GALLERY UPLOAD ENDPOINT (NEW)
app.post('/upload-gallery', galleryUpload.single('file'), (req, res) => {
  try {
 
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId || 'unknown';
    const userGalleryDir = path.join(galleryDir, userId);
    
 
    
    if (!fs.existsSync(userGalleryDir)) {
      fs.mkdirSync(userGalleryDir, { recursive: true });
    }
    
    const finalPath = path.join(userGalleryDir, req.file.filename);
    fs.renameSync(req.file.path, finalPath);
    
    
    
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/gallery/${userId}/${req.file.filename}`;

     

    res.json({
      success: true,
      filename: req.file.filename,
      url: fileUrl,
      userId: userId,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('❌ Gallery upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    uploadsDir: uploadsDir,
    galleryDir: galleryDir
  });
});

// Debug endpoints
app.get('/debug/files', (req, res) => {
  const listFiles = (dir, fileList = []) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          listFiles(filePath, fileList);
        } else {
          fileList.push(filePath.replace(uploadsDir, ''));
        }
      });
    } catch (error) {}
    return fileList;
  };
  
  const files = listFiles(uploadsDir);
  res.json({ count: files.length, files: files });
});

app.get('/debug/gallery', (req, res) => {
  const listFiles = (dir, fileList = []) => {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          listFiles(filePath, fileList);
        } else {
          fileList.push(filePath.replace(galleryDir, ''));
        }
      });
    } catch (error) {}
    return fileList;
  };
  
  const files = listFiles(galleryDir);
  res.json({ count: files.length, files: files });
});

// Get local IP
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  
  console.log(`
  ╔════════════════════════════════════════╗
  ║   📱 Media Upload Server Running      ║
  ╠════════════════════════════════════════╣
  ║   Port: ${PORT}                            ║
  ║   Local: http://localhost:${PORT}         ║
  ║   Network: http://${localIP}:${PORT}  ║
  ╚════════════════════════════════════════╝
  
  📡 Endpoints:
     Chat Upload:    POST   /upload
     Gallery Upload: POST   /upload-gallery  ✨ NEW
     Chat Media:     GET    /media/:chatId/:filename
     Gallery Media:  GET    /gallery/:userId/:filename  ✨ NEW
     Debug Chat:     GET    /debug/files
     Debug Gallery:  GET    /debug/gallery  ✨ NEW
     Health:         GET    /health
  
  📂 Directories:
     Chat:    ${uploadsDir}
     Gallery: ${galleryDir}  ✨ NEW
     Temp:    ${tempDir}
  
  ✅ Server ready!
  `);
});