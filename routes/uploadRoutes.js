const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { uploadImage, deleteImage, uploadTopBanners, deleteTopBanner, getTopBanners, uploadToFolder } = require('../controllers/uploadController');

// Use in-memory storage and limit file size to ~10MB by default
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

// Generic multi-upload to a named folder (auth: user or admin)
// Expect multipart/form-data with: folderName (text field) and files (one or more)
router.post('/upload', auth, upload.array('files', 10), uploadToFolder);
router.delete('/upload/:key', auth, requireAdmin, deleteImage);

// Top banner: multiple upload (auth required), list (public), delete (auth)
router.post('/topbanner/upload', auth, upload.array('files', 10), uploadTopBanners);
router.get('/get/topbanner', getTopBanners);
router.delete('/topbanner/:key', auth, deleteTopBanner);

// Handle Multer errors with friendly responses
router.use((err, req, res, next) => {
	if (err && err.code === 'LIMIT_FILE_SIZE') {
		return res.status(413).json({ error: 'File too large. Max 10MB per file.' });
	}
	if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
		return res.status(400).json({ error: 'Unexpected file field. Use field name: files for multiple uploads and include text field folderName.' });
	}
	next(err);
});

module.exports = router;
