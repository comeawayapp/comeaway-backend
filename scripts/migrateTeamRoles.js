/**
 * Migrate existing staff/customer roles for Team Member Management.
 *
 * Run once before deploying role guards in production:
 *   node scripts/migrateTeamRoles.js
 *
 * Then set Owner:
 *   OWNER_EMAIL=you@example.com node scripts/setOwner.js
 *   # or: node scripts/setOwner.js --email=you@example.com
 */
require("dotenv").config();
const mongoose = require("mongoose");

const STAFF = ["owner", "admin", "content_manager"];

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection("users");

  // 1) Legacy role: admin (any casing) → team_member + admin
  const adminResult = await col.updateMany(
    {
      role: { $regex: /^admin$/i },
    },
    [
      {
        $set: {
          role: "admin",
          accountType: "team_member",
          teamDateAdded: {
            $ifNull: ["$teamDateAdded", { $ifNull: ["$createdAt", "$$NOW"] }],
          },
        },
      },
    ]
  );
  console.log(
    `Promoted admin → team_member+admin: matched=${adminResult.matchedCount}, modified=${adminResult.modifiedCount}`
  );

  // 2) Customers use role: null — clear legacy values (e.g. "user")
  const clearRoleResult = await col.updateMany(
    {
      $and: [
        { role: { $exists: true } },
        { role: { $nin: [...STAFF, null] } },
        { role: { $ne: null } },
      ],
    },
    { $set: { role: null } }
  );
  console.log(
    `Cleared legacy non-staff roles: matched=${clearRoleResult.matchedCount}, modified=${clearRoleResult.modifiedCount}`
  );

  // 3) Customers without accountType: set from isPro (skip staff)
  const missingAccountType = {
    $or: [
      { accountType: { $exists: false } },
      { accountType: null },
      { accountType: { $nin: ["team_member", "pro", "standard"] } },
    ],
  };

  const proCustomers = await col.updateMany(
    {
      isPro: true,
      role: { $nin: STAFF },
      ...missingAccountType,
    },
    { $set: { accountType: "pro" } }
  );
  const standardCustomers = await col.updateMany(
    {
      $and: [
        { $or: [{ isPro: false }, { isPro: { $exists: false } }] },
        { role: { $nin: STAFF } },
        missingAccountType,
      ],
    },
    { $set: { accountType: "standard" } }
  );
  console.log(
    `Set accountType pro: modified=${proCustomers.modifiedCount}; standard: modified=${standardCustomers.modifiedCount}`
  );

  // 4) Ensure staff have accountType team_member
  const staffType = await col.updateMany(
    { role: { $in: STAFF }, accountType: { $ne: "team_member" } },
    { $set: { accountType: "team_member" } }
  );
  console.log(
    `Ensured staff accountType=team_member: modified=${staffType.modifiedCount}`
  );

  await mongoose.disconnect();
  console.log("Migration complete.");
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
