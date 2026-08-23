/**
 * Promote a user to Owner (run once after migrateTeamRoles.js).
 *
 *   OWNER_EMAIL=you@example.com node scripts/setOwner.js
 *   node scripts/setOwner.js --email=you@example.com
 */
require("dotenv").config();
const mongoose = require("mongoose");

function parseEmail() {
  const arg = process.argv.find((a) => a.startsWith("--email="));
  if (arg) return arg.slice("--email=".length).trim().toLowerCase();
  if (process.env.OWNER_EMAIL) {
    return String(process.env.OWNER_EMAIL).trim().toLowerCase();
  }
  return null;
}

async function setOwner() {
  const email = parseEmail();
  if (!email) {
    console.error(
      "Provide OWNER_EMAIL env or --email=address@example.com"
    );
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection("users");

  const user = await col.findOne({
    email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });

  if (!user) {
    console.error(`No user found for email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // Demote any existing owners (single-owner product)
  const demoted = await col.updateMany(
    { role: "owner", _id: { $ne: user._id } },
    {
      $set: {
        role: "admin",
        accountType: "team_member",
      },
    }
  );
  if (demoted.modifiedCount) {
    console.log(
      `Demoted previous owner(s) to admin: ${demoted.modifiedCount}`
    );
  }

  await col.updateOne(
    { _id: user._id },
    {
      $set: {
        role: "owner",
        accountType: "team_member",
        teamDateAdded: null,
      },
      $unset: {
        inviteToken: "",
        inviteTokenExpires: "",
      },
    }
  );

  console.log(`Owner set: ${user.email} (${user._id})`);
  await mongoose.disconnect();
}

setOwner().catch((err) => {
  console.error(err);
  process.exit(1);
});
