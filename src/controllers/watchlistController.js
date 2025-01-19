const prisma = require("@utils/prisma");
const logger = require("@utils/logger");
const { createResponse } = require("@utils/responseHandler");
const Joi = require("joi");

const watchlistSchema = Joi.object({
  type: Joi.string().required(),
  value: Joi.string().required(),
});

exports.getAllWatchlistItems = async (req) => {
  const { organizationId, requestId } = req;

  logger.info({
    message: "Fetching watchlist items",
    organizationId,
    requestId,
  });

  const items = await prisma.watchlist.findMany({
    where: { organizationId },
  });

  logger.info({
    message: `Fetched ${items.length} watchlist items`,
    requestId,
  });

  return createResponse(true, items);
};

exports.addWatchlistItem = async (req, itemData) => {
  const { organizationId, requestId } = req;

  const { error } = watchlistSchema.validate(itemData);
  if (error) {
    const err = new Error(error.details[0].message);
    err.name = "ValidationError";
    throw err;
  }

  const { type, value } = itemData;

  logger.info({
    message: "Adding watchlist item",
    type,
    organizationId,
    requestId,
  });

  const item = await prisma.watchlist.create({
    data: {
      type,
      value,
      organizationId,
    },
  });

  logger.info({
    message: "Watchlist item added successfully",
    itemId: item.id,
    requestId,
  });

  return createResponse(true, item);
};

exports.deleteWatchlistItem = async (req, id) => {
  const { organizationId, requestId } = req;

  logger.info({
    message: "Deleting watchlist item",
    itemId: id,
    requestId,
  });

  await prisma.watchlist.delete({
    where: {
      id: parseInt(id),
      organizationId,
    },
  });

  logger.info({
    message: "Watchlist item deleted successfully",
    itemId: id,
    requestId,
  });

  return createResponse(true, { id });
};
