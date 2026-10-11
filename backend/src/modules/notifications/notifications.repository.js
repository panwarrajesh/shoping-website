const prisma = require('../../config/prisma');

const list = (userId, skip, take) =>
  prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take });
const count = (userId) => prisma.notification.count({ where: { userId } });
const countUnread = (userId) => prisma.notification.count({ where: { userId, readAt: null } });
const markRead = async (id, userId) =>
  (await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } })).count;
const markAllRead = (userId) =>
  prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
// Used by other modules (orders, payments, ...) to notify a user
const create = (data) => prisma.notification.create({ data });

module.exports = { list, count, countUnread, markRead, markAllRead, create };
