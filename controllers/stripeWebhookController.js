const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const stripeService = require('../services/stripeService');

/**
 * Handle Stripe webhook events
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body is now a Buffer due to express.raw() middleware
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log(`main Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        case 'customer.subscription.canceled':
          await handleSubscriptionCanceled(event.data.object);
          break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        case 'charge.succeeded':
          await handleChargeSucceeded(event.data.object);
          break;  
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Handle checkout session completed event
 * @param {Object} session - Stripe checkout session object
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    console.log('Processing checkout session completed:', session.id);
    
    // Only process subscription mode sessions
    if (session.mode !== 'subscription') {
      console.log('Skipping non-subscription checkout session');
      return;
    }

    // Get the subscription from the session
    if (!session.subscription) {
      console.log('No subscription found in checkout session');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const user = await User.findOne({ stripeCustomerId: session.customer });
    
    if (!user) {
      console.log(`User not found for customer ${session.customer}`);
      return;
    }

    // Debug logging
    console.log('Retrieved subscription object:', {
      id: subscription.id,
      status: subscription.status,
      customer: subscription.customer,
      type: typeof subscription
    });

    // Sync subscription to database
    await stripeService.syncSubscriptionToDatabase(subscription, user._id);
    console.log(`✅ Checkout session completed for user ${user.email}, subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

/**
 * Handle subscription created event
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionCreated(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    
    if (!user) {
      console.log(`User not found for customer ${subscription.customer}`);
      return;
    }

    // Sync subscription to database
    await stripeService.syncSubscriptionToDatabase(subscription, user._id);

    console.log(`✅ Subscription created for user ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

/**
 * Handle subscription updated event
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (!user) {
      console.log(`User not found for customer ${subscription.customer}`);
      return;
    }

    // Sync subscription to database
    await stripeService.syncSubscriptionToDatabase(subscription, user._id);

    console.log(`✅ Subscription updated for user ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}
/**
 * Handle successful charge event
 * @param {Object} charge - Stripe charge object
 */
async function handleChargeSucceeded(charge) {
  try {
    const user = await User.findOne({ stripeCustomerId: charge.customer });
    if (!user) {
      console.log(`User not found for customer ${charge.customer}`);
      return;
    }

    // Create payment record for the charge
    const payment = new Payment({
      userId: user._id,
      stripeChargeId: charge.id,
      stripePaymentIntentId: charge.payment_intent,
      amount: charge.amount,
      currency: charge.currency,
      status: 'succeeded',
      customerId: charge.customer,
      description: charge.description || '',
      metadata: charge.metadata || {},
      processingType: 'one_time',
      paidAt: new Date(charge.created * 1000)
    });

    await payment.save();
    console.log(`✅ Charge succeeded for user ${user.email}, amount: ${charge.amount / 100} ${charge.currency.toUpperCase()}`);
  } catch (error) {
    console.error('Error handling charge succeeded:', error);
  }
} 

/**
 * Handle subscription canceled event
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionCanceled(subscription) {
  try {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (!user) {
      console.log(`User not found for customer ${subscription.customer}`);
      return;
    }

    // Sync subscription to database to update status
    await stripeService.syncSubscriptionToDatabase(subscription, user._id);

    console.log(`✅ Subscription canceled for user ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
  }
}

/**
 * Handle subscription deleted event
 * @param {Object} subscription - Stripe subscription object
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (!user) {
      console.log(`User not found for customer ${subscription.customer}`);
      return;
    }

    // Update subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: 'canceled',
        canceledAt: new Date(subscription.canceled_at * 1000)
      }
    );

    // Update user's Pro status
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'canceled',
      isPro: false,
      proExpiresAt: new Date()
    });

    console.log(`✅ Subscription canceled for user ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

/**
 * Handle successful invoice payment
 * @param {Object} invoice - Stripe invoice object
 */
async function handlePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      // This is a subscription payment
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const user = await User.findOne({ stripeCustomerId: subscription.customer });
      
      if (user) {
        // Update subscription status
        await stripeService.syncSubscriptionToDatabase(subscription, user._id);
        console.log(`✅ Subscription payment succeeded for user ${user.email}`);
      }
    } else {
      // This is a one-time payment
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user) {
        // Create payment record
        const payment = new Payment({
          userId: user._id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          customerId: invoice.customer,
          description: invoice.description || '',
          metadata: invoice.metadata || {},
          processingType: 'one_time',
          paidAt: new Date(invoice.status_transitions.paid_at * 1000)
        });

        await payment.save();
        console.log(`✅ One-time payment succeeded for user ${user.email}`);
      }
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

/**
 * Handle failed invoice payment
 * @param {Object} invoice - Stripe invoice object
 */
async function handlePaymentFailed(invoice) {
  try {
    if (invoice.subscription) {
      // This is a subscription payment failure
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const user = await User.findOne({ stripeCustomerId: subscription.customer });
      
      if (user) {
        // Update subscription status
        await stripeService.syncSubscriptionToDatabase(subscription, user._id);
        console.log(`❌ Subscription payment failed for user ${user.email}`);
      }
    } else {
      // This is a one-time payment failure
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      if (user) {
        // Create payment record
        const payment = new Payment({
          userId: user._id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
          customerId: invoice.customer,
          description: invoice.description || '',
          metadata: invoice.metadata || {},
          processingType: 'one_time',
          failureCode: invoice.last_payment_error?.code,
          failureMessage: invoice.last_payment_error?.message
        });

        await payment.save();
        console.log(`❌ One-time payment failed for user ${user.email}`);
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

/**
 * Handle successful payment intent
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const user = await User.findOne({ stripeCustomerId: paymentIntent.customer });
    if (!user) {
      console.log(`User not found for customer ${paymentIntent.customer}`);
      return;
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'succeeded',
        paidAt: new Date()
      }
    );

    // Check if this is a subscription payment
    if ((paymentIntent.metadata?.type === 'subscription_setup' || paymentIntent.metadata?.type === 'subscription_payment') && paymentIntent.metadata?.subscriptionId) {
      const subscriptionId = paymentIntent.metadata.subscriptionId;
      
      try {
        // Attach the payment method to the subscription
        await stripe.subscriptions.update(subscriptionId, {
          default_payment_method: paymentIntent.payment_method
        });
        
        console.log(`✅ Payment method attached to subscription ${subscriptionId}`);
        
        // The subscription should now become active automatically
        // We'll handle the subscription update in the subscription.updated webhook
      } catch (error) {
        console.error('Error attaching payment method to subscription:', error);
      }
    }

    console.log(`✅ Payment intent succeeded for user ${user.email}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Handle failed payment intent
 * @param {Object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const user = await User.findOne({ stripeCustomerId: paymentIntent.customer });
    if (!user) {
      console.log(`User not found for customer ${paymentIntent.customer}`);
      return;
    }

    // Update payment record
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: 'failed',
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
        failedAt: new Date()
      }
    );

    console.log(`❌ Payment intent failed for user ${user.email}`);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

module.exports = { handleWebhook };
