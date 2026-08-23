const SocialAuthUser = require("./models/socialAuth");
const User = require("./models/user");

const migrateSocialAuthUserToUserCollection = async () => {
  try {
    // Fetch all documents from the SocialAuthUser collection
    const socialAuthUsers = await SocialAuthUser.find();

    console.log(`Found ${socialAuthUsers.length} users to migrate.`);

    for (const socialUser of socialAuthUsers) {
      // Check if the user already exists in the User collection
      const existingUserInUserCollection = await User.findOne({ email: socialUser.email });
      if (existingUserInUserCollection) {
        console.log(`User already exists in User collection: ${socialUser.email}`);
        continue; // Skip migration for this user
      }

      // Transform the data to match the User schema
      const newUser = new User({
        firstname: socialUser.firstname,
        lastname: socialUser.lastname,
        email: socialUser.email,
        //password: , // No password for social users
        role: null, // customers: null; staff roles set separately
        status: socialUser.status || "active",
        resetPasswordToken: undefined, // Optional: Clear if not needed
        resetPasswordExpires: undefined, // Optional: Clear if not needed
      });
      console.log(newUser, "NewUser");
      

      // Save the transformed document into the User collection
      await newUser.save();
      console.log(`Migrated user: ${socialUser.email}`);
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error during migration:", error);
  }
};

module.exports = migrateSocialAuthUserToUserCollection;