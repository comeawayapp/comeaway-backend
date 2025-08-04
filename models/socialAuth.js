const mongoose = require("mongoose");

const SocialAuthUserSchema = new mongoose.Schema({
    firstname: { type: String, required: true }, // First name of the user
    lastname: { type: String, required: true }, // Last name of the user
    email: { type: String, required: true, unique: true }, // Email address (must be unique)
    //provider: { type: String, enum: ["google", "facebook"], required: true }, // Authentication provider
   // providerId: { type: String, required: true }, // Unique ID from the authentication provider
    photo: { type: String, required: false }, // Profile photo URL
    role: { type: String, default: "user" }, // User role (default is "user")
    status: { type: String, enum: ["active", "inactive"], default: "active" }, // User status
});

// Export the social auth user model
module.exports = mongoose.model("SocialAuthUser", SocialAuthUserSchema);