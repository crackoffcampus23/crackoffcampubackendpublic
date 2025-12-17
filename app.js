require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { init, pool } = require('./utils/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const userDetailsRoutes = require('./routes/userDetailsRoutes');
const jobsRoutes = require('./routes/jobsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const resourcesRoutes = require('./routes/resourcesRoutes');
const testimonialsRoutes = require('./routes/testimonialsRoutes');
const questionsRoutes = require('./routes/questionsRoutes');
const emailRoutes = require('./routes/emailRoutes');
const sponsorshipMarqueeRoutes = require('./routes/sponsorshipMarqueeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adBannerRoutes = require('./routes/adBannerRoutes');
const imageGalleryRoutes = require('./routes/imageGalleryRoutes');
const coursesRoutes = require('./routes/coursesRoutes');
const successStoriesRoutes = require('./routes/successStoriesRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const serviceVerifyRoutes = require('./routes/serviceVerifyRoutes');
const savedJobsRoutes = require('./routes/savedJobsRoutes');
const interviewKitRoutes = require('./routes/interviewKitRoutes');
const projectIdeasRoutes = require('./routes/projectIdeasRoutes');
const learningResourcesRoutes = require('./routes/learningResourcesRoutes');
const blogsRoutes = require('./routes/blogsRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const hackathonsRoutes = require('./routes/hackathonsRoutes');
const serviceSlotRoutes = require('./routes/serviceSlotRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const userFeedbackRoutes = require('./routes/userFeedbackRoutes');
const premiumPdfRoutes = require('./routes/premiumPdfRoutes');
const cronRoutes = require('./routes/cronRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { initR2 } = require('./utils/r2');
const notificationModel = require('./models/notificationModel');

const app = express();
// CORS
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
// Body parsing: JSON, urlencoded, and text (to accept raw JSON sent as text/plain)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/*' }));

// If body was text/plain containing JSON, parse it here
app.use((req, res, next) => {
	if (typeof req.body === 'string' && req.headers['content-type'] && req.headers['content-type'].startsWith('text/')) {
		try {
			req.body = JSON.parse(req.body);
		} catch (_) {
			// ignore
		}
	}
	next();
});

// Rate limiting: 60 requests per minute (skip for localhost/development)
const isLocalhost = (req) => {
	const ip = req.ip || req.connection.remoteAddress || '';
	const host = req.get('host') || '';
	const origin = req.get('origin') || '';
	// Check if request is from localhost
	return (
		ip === '127.0.0.1' ||
		ip === '::1' ||
		ip === '::ffff:127.0.0.1' ||
		host.startsWith('localhost') ||
		host.startsWith('127.0.0.1') ||
		origin.includes('localhost') ||
		origin.includes('127.0.0.1')
	);
};

const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	limit: 60, // Limit each IP to 60 requests per `window`
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	message: { error: 'Too many requests, please try again later.' },
	skip: isLocalhost, // Skip rate limiting for localhost requests
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok', time: new Date().toISOString() });
});

// Routes
app.use('/', authRoutes); // /signup, /login
app.use('/', userRoutes); // /allUsers, /user/:userid (protected)
app.use('/', userDetailsRoutes); // /getuserdetails, /:userid/edit (protected)
app.use('/', jobsRoutes); // jobs CRUD
app.use('/', servicesRoutes); // services CRUD
app.use('/', resourcesRoutes); // resources CRUD
app.use('/', testimonialsRoutes); // testimonials CRUD
app.use('/', questionsRoutes); // questions CRUD
app.use('/', emailRoutes); // email service endpoints
app.use('/', uploadRoutes); // image upload endpoints
app.use('/', imageGalleryRoutes); // public image gallery listing
app.use('/', sponsorshipMarqueeRoutes); // sponsorship marquee endpoints
app.use('/', adBannerRoutes); // app ad banner endpoints
app.use('/', coursesRoutes); // courses endpoints
app.use('/', successStoriesRoutes); // success stories endpoints
app.use('/', paymentRoutes); // payment verification endpoint
app.use('/', serviceVerifyRoutes); // service verification endpoint
app.use('/', serviceSlotRoutes); // public service slot verification endpoint
app.use('/', savedJobsRoutes); // saved jobs endpoints
app.use('/', interviewKitRoutes); // interview preparation kit endpoints
app.use('/', projectIdeasRoutes); // project ideas endpoints
app.use('/', learningResourcesRoutes); // learning resources endpoints
app.use('/', blogsRoutes); // blogs endpoints
app.use('/', eventsRoutes); // events endpoints
app.use('/', hackathonsRoutes); // hackathons endpoints
app.use('/', bannerRoutes); // banner images endpoints
app.use('/', userFeedbackRoutes); // user feedback endpoints
app.use('/', premiumPdfRoutes); // premium pdf list + bulk delete
app.use('/', cronRoutes); // secured daily cron endpoints
app.use('/notifications', notificationRoutes); // notification endpoints

// Not found handler
app.use((req, res) => {
	res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

async function start() {
	try {
		await init();
		const { rows } = await pool.query('SELECT now() AS now');
		console.log('Postgres connected. Server time:', rows[0].now);
		// Ensure notification tables exist
		await notificationModel.init().then(() => {
			console.log('Notification tables ready');
		}).catch((e) => {
			console.error('Failed to init notification tables:', e);
		});
		// Initialize Cloudflare R2 (optional)
		await initR2();
		app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
	} catch (e) {
		console.error('Startup failure:', e);
		process.exit(1);
	}
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
	console.log('SIGINT received. Closing Postgres pool...');
	await pool.end().catch(() => {});
	process.exit(0);
});

module.exports = app;

