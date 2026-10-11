const jwt = require('jsonwebtoken');
const env = require('../config/env');

const OPTS = { issuer: 'localmart', algorithms: ['HS256'] };

const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.jwtAccessSecret, {
    subject: user.id, expiresIn: env.accessTokenTtl, issuer: OPTS.issuer, algorithm: 'HS256',
  });

const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret, OPTS);

module.exports = { signAccessToken, verifyAccessToken };
