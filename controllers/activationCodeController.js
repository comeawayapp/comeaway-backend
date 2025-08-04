const ActivationCode = require("../models/ActivationCode");
const User = require("../models/user");
const emailService = require("../services/emailService");

// Admin: Create activation code
exports.createActivationCode = async (req, res) => {
  try {
    const {
      code,
      productName,
      orderNumber,
      customerName,
      customerEmail,
      phoneNumber,
      platform,
      expiresIn,
    } = req.body;
    if (!/^\d{6}$/.test(code))
      return res.status(400).json({ error: "Code must be 6 digits." });
    const exists = await ActivationCode.findOne({ code });
    if (exists) return res.status(400).json({ error: "Code already exists." });
    const newCode = await ActivationCode.create({
      code,
      productName,
      orderNumber,
      customerName,
      customerEmail,
      phoneNumber,
      platform,
      expiresIn,
    });

    // Send activation code email (non-blocking)
    emailService
      .sendActivationCode(
        customerEmail,
        customerName,
        code,
        productName,
        expiresIn
      )
      .catch((error) => {
        console.error("Failed to send activation code email:", error);
      });

    res.status(201).json(newCode);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin: List/search activation codes
exports.listActivationCodes = async (req, res) => {
  try {
    const codes = await ActivationCode.find(req.query);
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// User: Redeem activation code
exports.redeemActivationCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;
    const activation = await ActivationCode.findOne({ code });
    if (!activation)
      return res.status(404).json({ error: "Invalid activation code." });
    if (activation.redeemed)
      return res.status(400).json({ error: "Code already redeemed." });
    if (activation.expiresIn < new Date())
      return res.status(400).json({ error: "Activation code expired." });
    // Atomically redeem
    const updated = await ActivationCode.findOneAndUpdate(
      { code, redeemed: false },
      {
        redeemed: true,
        redeemedBy: userId,
        redeemedAt: new Date(),
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
      { new: true }
    );
    if (!updated)
      return res.status(409).json({ error: "Code already redeemed." });
    // Update user
    await User.findByIdAndUpdate(userId, {
      isPro: true,
      proExpiresAt: updated.subscriptionExpiresAt,
    });
    res.status(200).json({
      message: "Subscription activated!",
      expiresAt: updated.subscriptionExpiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
