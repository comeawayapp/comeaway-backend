const bcrypt = require("bcryptjs");
const user = require("../../models/user");

// Get All Users with Search and Filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { query, type, activationMethod } = req.query;
    
    // Build the base filter for active users
    let filter = {
      $or: [
        { status: "active" },
        { status: { $exists: false } },
        { deletedAt: { $exists: false } }
      ]
    };
    
    // Add search query filter
    if (query) {
      const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
      filter.$and = [{
        $or: [
          { firstname: searchRegex },
          { lastname: searchRegex },
          { email: searchRegex }
        ]
      }];
    }
    
    // Add user type filter
    if (type) {
      if (!['standard', 'pro'].includes(type.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid user type. Use 'standard' or 'pro'",
          allowedValues: ["standard", "pro"]
        });
      }
      
      if (type.toLowerCase() === 'pro') {
        filter.isPro = true;
      } else {
        filter.isPro = false;
      }
    }
    
    // Add activation method filter
    if (activationMethod) {
      if (!['code', 'card', 'none'].includes(activationMethod.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid activation method. Use 'code', 'card', or 'none'",
          allowedValues: ["code", "card", "none"]
        });
      }
      
      if (activationMethod.toLowerCase() === 'none') {
        filter.$or = filter.$or || [];
        filter.$or.push({ activationMode: { $exists: false } });
        filter.$or.push({ activationMode: null });
      } else {
        filter.activationMode = activationMethod.toLowerCase();
      }
    }
    
    // Execute the query
    const users = await user.find(filter).select("-password");
    
    // Add user type and activation method to each user
    const usersWithType = users.map(userDoc => {
      const userType = userDoc.isPro ? "Pro" : "Standard";
      const activationMethod = userDoc.activationMode || "None";
      
      return {
        ...userDoc.toObject(),
        userType: userType,
        activationMethod: activationMethod
      };
    });
    
    // Return response with search/filter info
    res.status(200).json({
      users: usersWithType,
      total: usersWithType.length,
      filters: {
        query: query || null,
        type: type || null,
        activationMethod: activationMethod || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Soft-Deleted Users with Search and Filtering (Admin only)
exports.getSoftDeletedUsers = async (req, res) => {
  try {
    const { query, type, activationMethod } = req.query;
    
    // Build the base filter for soft-deleted users
    let filter = {
      status: "inactive",
      deletedAt: { $exists: true }
    };
    
    // Add search query filter
    if (query) {
      const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
      filter.$and = [{
        $or: [
          { firstname: searchRegex },
          { lastname: searchRegex },
          { email: searchRegex }
        ]
      }];
    }
    
    // Add user type filter
    if (type) {
      if (!['standard', 'pro'].includes(type.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid user type. Use 'standard' or 'pro'",
          allowedValues: ["standard", "pro"]
        });
      }
      
      if (type.toLowerCase() === 'pro') {
        filter.isPro = true;
      } else {
        filter.isPro = false;
      }
    }
    
    // Add activation method filter
    if (activationMethod) {
      if (!['code', 'card', 'none'].includes(activationMethod.toLowerCase())) {
        return res.status(400).json({
          message: "Invalid activation method. Use 'code', 'card', or 'none'",
          allowedValues: ["code", "card", "none"]
        });
      }
      
      if (activationMethod.toLowerCase() === 'none') {
        filter.$or = filter.$or || [];
        filter.$or.push({ activationMode: { $exists: false } });
        filter.$or.push({ activationMode: null });
      } else {
        filter.activationMode = activationMethod.toLowerCase();
      }
    }
    
    // Execute the query
    const softDeletedUsers = await user.find(filter).select("-password");
    
    // Add user type and activation method to each user
    const usersWithType = softDeletedUsers.map(userDoc => {
      const userType = userDoc.isPro ? "Pro" : "Standard";
      const activationMethod = userDoc.activationMode || "None";
      
      return {
        ...userDoc.toObject(),
        userType: userType,
        activationMethod: activationMethod
      };
    });
    
    // Return response with search/filter info
    res.status(200).json({
      users: usersWithType,
      total: usersWithType.length,
      filters: {
        query: query || null,
        type: type || null,
        activationMethod: activationMethod || null
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin Update User Status
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({
        message: "Status is required",
        allowedValues: ["active", "inactive"],
      });
    }

    // Validate status value
    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
        allowedValues: ["active", "inactive"],
      });
    }

    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const gotuser = await user.findById(req.params.id);
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousStatus = gotuser.status;
    gotuser.status = status;
    await gotuser.save();

    res.status(200).json({
      message: "User status updated successfully",
      user: {
        id: gotuser._id,
        email: gotuser.email,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        previousStatus: previousStatus,
        currentStatus: status,
      },
      action: status === "inactive" ? "USER_DEACTIVATED" : "USER_ACTIVATED",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin Update User Status
exports.updatePlanStatus = async (req, res) => {
  try {
    const { planStatus } = req.body;
    if (!planStatus) {  
      return res.status(400).json({
        message: "Plan Status is required",
        allowedValues: ["pro", "standard"],
      });
    }

    // Validate status value
    if (!["pro", "standard"].includes(planStatus)) {
      return res.status(400).json({
        message: "Invalid plan status value",
        allowedValues: ["pro", "standard"],
      });
    }

    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const gotuser = await user.findById(req.params.id);
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousPlanStatus = gotuser.isPro;
    gotuser.isPro = planStatus === "pro" ? true : false;
    await gotuser.save();

    res.status(200).json({
      message: "User status updated successfully",
      user: {
        id: gotuser._id,
        email: gotuser.email,
        firstname: gotuser.firstname,
        lastname: gotuser.lastname,
        previousPlanStatus: previousPlanStatus,
        currentPlanStatus: planStatus,
      },
        action: planStatus === "pro" ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get User by ID
exports.getUserById = async (req, res) => {
  try {
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }
    const gotuser = await user.findById(req.params.id).select("-password");
    if (!gotuser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Add user type and activation method
    const userType = gotuser.isPro ? "Pro" : "Standard";
    const activationMethod = gotuser.activationMode || "None";
    
    const userWithType = {
      ...gotuser.toObject(),
      userType: userType,
      activationMethod: activationMethod
    };
    
    res.status(200).json(userWithType);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Admin Details
exports.updateAdminDetails = async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing admin id" });
    }
    const adminUser = await user.findById(req.params.id);

    if (!adminUser) {
      return res.status(404).json({ message: "Admin not found" });
    }

    adminUser.firstname = firstname || adminUser.firstname;
    adminUser.lastname = lastname || adminUser.lastname;
    adminUser.email = email || adminUser.email;
    // adminUser.status = status || adminUser.status;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      adminUser.password = await bcrypt.hash(password, salt);
    }

    await adminUser.save();

    res.status(200).json({ message: "Admin details updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete User by ID (Admin only) - Soft Delete
exports.deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body; // Optional reason for deletion

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }
    
    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is already soft deleted
    if (foundUser.status === "inactive" && foundUser.deletedAt) {
      return res.status(400).json({ 
        message: "User is already soft deleted",
        deletedAt: foundUser.deletedAt,
        deletionReason: foundUser.deletionReason
      });
    }

    // Soft delete - mark as inactive and add deletion timestamp
    foundUser.status = "inactive";
    foundUser.deletedAt = new Date();
    foundUser.deletionReason = reason || "Admin requested account deletion";
    await foundUser.save();

    res.status(200).json({ 
      message: "User soft deleted successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
        deletedAt: foundUser.deletedAt,
        deletionReason: foundUser.deletionReason
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Deactivate User (Convenience endpoint)
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body; // Optional reason for deactivation

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (foundUser.status === "inactive") {
      return res.status(400).json({
        message: "User is already deactivated",
        user: {
          id: foundUser._id,
          email: foundUser.email,
          status: foundUser.status,
        },
      });
    }

    foundUser.status = "inactive";
    await foundUser.save();

    res.status(200).json({
      message: "User deactivated successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
      },
      action: "USER_DEACTIVATED",
      reason: reason || "No reason provided",
      deactivatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Activate User (Convenience endpoint)
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (foundUser.status === "active") {
      return res.status(400).json({
        message: "User is already active",
        user: {
          id: foundUser._id,
          email: foundUser.email,
          status: foundUser.status,
        },
      });
    }

    foundUser.status = "active";
    await foundUser.save();

    res.status(200).json({
      message: "User activated successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
      },
      action: "USER_ACTIVATED",
      activatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Admin: Restore Soft-Deleted User
exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid or missing user id" });
    }

    const foundUser = await user.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is soft deleted
    if (!foundUser.deletedAt) {
      return res.status(400).json({
        message: "User is not soft deleted",
        user: {
          id: foundUser._id,
          email: foundUser.email,
          status: foundUser.status,
        },
      });
    }

    // Restore user by clearing soft delete fields
    foundUser.status = "active";
    foundUser.deletedAt = undefined;
    foundUser.deletionReason = undefined;
    await foundUser.save();

    res.status(200).json({
      message: "User restored successfully",
      user: {
        id: foundUser._id,
        email: foundUser.email,
        firstname: foundUser.firstname,
        lastname: foundUser.lastname,
        status: foundUser.status,
      },
      action: "USER_RESTORED",
      restoredAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

