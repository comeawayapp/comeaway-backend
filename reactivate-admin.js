#!/usr/bin/env node

/**
 * Emergency Admin Account Reactivation Script
 * This script reactivates the admin account with email: starhax4@gmail.com
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import the User model
const User = require("./models/user");

async function reactivateAdmin() {
  try {
    console.log("🔄 Connecting to database...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Database connected successfully");

    const adminEmail = "starhax4@gmail.com";
    console.log(`🔍 Looking for user with email: ${adminEmail}`);

    // Find the user
    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      console.log("❌ User not found with email:", adminEmail);
      console.log("📋 Available users in database:");

      const allUsers = await User.find(
        {},
        "email firstname lastname status"
      ).limit(10);
      allUsers.forEach((user) => {
        console.log(
          `   - ${user.email} (${user.firstname} ${user.lastname}) - Status: ${user.status}`
        );
      });

      process.exit(1);
    }

    console.log("👤 Found user:");
    console.log(`   Name: ${adminUser.firstname} ${adminUser.lastname}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Current Status: ${adminUser.status}`);
    console.log(`   Role: ${adminUser.role || "Not set"}`);
    console.log(`   Created: ${adminUser.createdAt}`);

    if (adminUser.status === "active") {
      console.log("✅ User is already active! No changes needed.");
    } else {
      console.log("🔧 Reactivating user account...");

      // Update status to active
      adminUser.status = "active";
      await adminUser.save();

      console.log("✅ SUCCESS: Admin account has been reactivated!");
      console.log(`   ${adminUser.email} is now ACTIVE`);
    }
  } catch (error) {
    console.error("❌ Error occurred:", error.message);
    console.error("Full error:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("📡 Database connection closed");
    process.exit(0);
  }
}

// Run the script
console.log("🚀 Starting Admin Account Reactivation Script...");
console.log("================================");
reactivateAdmin();
