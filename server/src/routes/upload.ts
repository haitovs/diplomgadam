import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../../data/uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(12).toString('hex');
    cb(null, `${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', upload.single('image') as any, (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
