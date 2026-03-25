import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes FIRST
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    try {
      // Try multiple services from the server (where CORS is not an issue)
      
      // Service 1: uguu.se
      try {
        const formData = new FormData();
        formData.append('files[]', fs.createReadStream(filePath), { 
          filename: originalName,
          contentType: req.file.mimetype 
        });
        const response = await axios.post('https://uguu.se/upload.php', formData, {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (response.data && response.data.success) {
          fs.unlinkSync(filePath);
          return res.json({ url: response.data.files[0].url });
        }
      } catch (e: any) {
        console.warn('Uguu.se upload failed:', e.response?.status || e.message);
      }

      // Service 2: catbox.moe
      try {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', fs.createReadStream(filePath), { 
          filename: originalName,
          contentType: req.file.mimetype
        });
        const response = await axios.post('https://catbox.moe/user/api.php', formData, {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (typeof response.data === 'string' && response.data.startsWith('http')) {
          fs.unlinkSync(filePath);
          return res.json({ url: response.data.trim() });
        }
      } catch (e: any) {
        console.warn('Catbox.moe upload failed:', e.response?.status || e.message);
      }

      // Service 3: pixeldrain
      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), { 
          filename: originalName,
          contentType: req.file.mimetype
        });
        const response = await axios.post('https://pixeldrain.com/api/file', formData, {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (response.data && response.data.id) {
          fs.unlinkSync(filePath);
          return res.json({ url: `https://pixeldrain.com/api/file/${response.data.id}` });
        }
      } catch (e: any) {
        console.warn('Pixeldrain upload failed:', e.response?.status || e.message);
      }

      // If all failed
      fs.unlinkSync(filePath);
      res.status(500).json({ error: 'All upload services failed' });
    } catch (error) {
      console.error('Upload proxy error:', error);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(500).json({ error: 'Internal server error during upload' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
