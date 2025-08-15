const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: { type: String, required: true }, // Stripe customer ID
    name: { type: String, required: true }, // Customer name
    plan: { type: String, enum: ['monthly', 'annual','daily'], required: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);