/**
 * Reset a user's password (hashes with bcrypt).
 *
 * Usage:
 *   node scripts/resetUserPassword.js user@example.com "NewPassword123"
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

async function main() {
  const [email, newPassword] = process.argv.slice(2);

  if (!email || !newPassword) {
    console.error(
      'Usage: node scripts/resetUserPassword.js <email> "<newPassword>"'
    );
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const found = await User.findOne({ email });
  if (!found) {
    console.error(`User not found: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  found.password = hashed;
  await found.save();

  const matches = await bcrypt.compare(newPassword, found.password);
  console.log(`Password reset for ${email}`);
  console.log(`userId: ${found._id}`);
  console.log(`verify compare: ${matches}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
