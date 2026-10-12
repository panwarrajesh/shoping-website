const prisma = require('../../config/prisma');

const findUserById = (id) => prisma.user.findFirst({ where: { id, deletedAt: null } });
const findUserByMobile = (mobile) => prisma.user.findFirst({ where: { mobile, deletedAt: null } });
const findUserByEmail = (email) => prisma.user.findFirst({ where: { email, deletedAt: null } });

// role is hard-coded here: public sign-up can only ever create CUSTOMER accounts
const createCustomer = ({ name, mobile, email, passwordHash, mobileVerifiedAt }) =>
  prisma.user.create({
    data: { name, mobile, email, passwordHash, mobileVerifiedAt, role: 'CUSTOMER', customerProfile: { create: {} } },
  });

const updateUser = (id, data) => prisma.user.update({ where: { id }, data });

const latestOtp = (target, purpose) =>
  prisma.otpCode.findFirst({ where: { target, purpose }, orderBy: { createdAt: 'desc' } });
const countOtpsSince = (target, since) =>
  prisma.otpCode.count({ where: { target, createdAt: { gte: since } } });
const invalidateOtps = (target, purpose) =>
  prisma.otpCode.updateMany({ where: { target, purpose, usedAt: null }, data: { usedAt: new Date() } });
const createOtp = (data) => prisma.otpCode.create({ data });
const latestActiveOtp = (target, purpose) =>
  prisma.otpCode.findFirst({
    where: { target, purpose, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' },
  });
const bumpOtpAttempts = (id) => prisma.otpCode.update({ where: { id }, data: { attempts: { increment: 1 } } });
const consumeOtp = async (id) =>
  (await prisma.otpCode.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } })).count === 1;

const createRefreshToken = (data) => prisma.refreshToken.create({ data });
const findRefreshToken = (tokenHash) =>
  prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
const revokeRefreshToken = async (id) =>
  (await prisma.refreshToken.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } })).count === 1;
const revokeAllRefreshTokens = (userId) =>
  prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

module.exports = {
  findUserById, findUserByMobile, findUserByEmail, createCustomer, updateUser,
  latestOtp, countOtpsSince, invalidateOtps, createOtp, latestActiveOtp, bumpOtpAttempts, consumeOtp,
  createRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllRefreshTokens,
};
