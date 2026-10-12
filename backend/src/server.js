const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(compression());
app.use(cookieParser());
// The payment webhook signature is computed over the exact raw bytes, so keep them next to the parsed body
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
if (!env.isProd) app.use(morgan('dev'));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`LocalMart API running on port ${env.port}`);
  require('./modules/payments/payments.jobs').start();
});
