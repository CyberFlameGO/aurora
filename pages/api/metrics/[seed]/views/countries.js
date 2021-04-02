const { PrismaClient } = require("@prisma/client");
const locale = require("locale-codes");

const withAuth = require("../../../../../utils/with-auth");
const percentage = require("../../../../../utils/percentage");

const prisma = new PrismaClient();

const countryViews = async (range, seed) =>
  await prisma.$queryRaw(`
    SELECT
      locale as element,
      COUNT(element) as views,
      COUNT(DISTINCT events.hash) as unique
    FROM
      events
      JOIN websites ON events.website_id = websites.id
    WHERE
      events.created_at >= DATE_TRUNC('${range}', now())
      AND websites.seed = '${seed}'
    GROUP BY
      locale
    ORDER BY
      views DESC
  `);

const handleGet = async (req, res) => {
  const { range, seed } = req.query;

  const rows = await countryViews(range, seed)
    .catch((e) => {
      throw e;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });

  const totalViews = rows.reduce((acc, el) => acc + el.views, 0);

  const data = rows.map((el) => {
    const perc = percentage(el.views, totalViews);
    const location = locale.getByTag(el.element).location;

    return {
      element: location,
      views: el.views,
      unique: el.unique,
      percentage: perc,
    };
  });

  return { status: 200, data: data };
};

const handle = async function (req, res) {
  let { status, data } = {};

  switch (req.method) {
    case "GET":
      ({ status, data } = await handleGet(req, res));
      break;
    default:
      return res.status(405).json({ message: "Method not allowed." });
  }

  return res.status(status).json({ data: data });
};

module.exports = withAuth(handle);
