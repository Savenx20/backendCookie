const express = require("express");
const { saveCookiePreferences } = require("../controllers/consentController");
const { saveLocationData, deleteLocationData } = require("../controllers/locationController");
const crypto = require("crypto");
const Consent = require("../models/consent");
const authenticateToken = require("../middleware/authenticateToken");

const router = express.Router();
router.use(express.json()); // Middleware to parse JSON

// Helper Function: Generate a Short Consent ID
const generateShortId = () => {
  const bytes = crypto.randomBytes(6);
  return bytes.toString("base64").replace(/[+/=]/g, "").slice(0, 8);
};

// 👉 **POST Route to Save Cookie Preferences**
router.post("/save", async (req, res) => {
  try {
      const { userId, consentId, preferences } = req.body;

      // Validate inputs
      if (!preferences || typeof preferences !== "object") {
          return res.status(400).json({ message: "Preferences are required." });
      }

      // If userId is provided, link preferences to the user
      if (userId) {
          let consent = await Consent.findOne({ userId });

          if (consent) {
              // Update existing preferences
              consent.preferences = preferences;
              consent.updatedAt = new Date();
          } else {
              // Create a new consent document for the user
              consent = new Consent({
                  userId,
                  preferences,
              });
          }

          await consent.save();
          return res.status(200).json({ message: "Preferences saved successfully." });
      }

      // If consentId is provided, link preferences to the consentId
      if (consentId) {
          let consent = await Consent.findOne({ consentId });

          if (consent) {
              // Update existing preferences
              consent.preferences = preferences;
              consent.updatedAt = new Date();
          } else {
              // Create a new consent document for the consentId
              consent = new Consent({
                  consentId,
                  preferences,
              });
          }

          await consent.save();
          return res.status(200).json({ message: "Preferences saved successfully." });
      }

      // If neither userId nor consentId is provided
      return res.status(400).json({ message: "Either userId or consentId is required." });
  } catch (error) {
      console.error("❌ Error saving preferences:", error.message);
      res.status(500).json({ message: "Internal server error." });
  }
});

// 👉 **GET Route to Fetch Preferences by userId or consentId**
router.get("/get-preferences", async (req, res) => {
  try {
      const { userId } = req.query;

      // Validate userId
      if (!userId) {
          return res.status(400).json({ message: "userId is required." });
      }

      // Find preferences in the Consents collection
      const consent = await Consent.findOne({ userId });

      if (!consent) {
          return res.status(404).json({ message: "Preferences not found for this user." });
      }

      // Return preferences
      res.status(200).json({
          preferences: consent.preferences,
      });
  } catch (error) {
      console.error("❌ Error fetching preferences:", error.message);
      res.status(500).json({ message: "Internal server error." });
  }
});

// 👉 **POST Route to Save or Update Location Data**
router.post("/save-location", async (req, res) => {
  try {
    const { consentId, ipAddress, isp, city, country, latitude, longitude } = req.body;

    // Call the saveLocationData function
    const result = await saveLocationData({
      consentId,
      ipAddress,
      isp,
      city,
      country,
      latitude,
      longitude,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error saving location data:", error.message);
    res.status(500).json({ message: "Failed to save location data: " + error.message });
  }
});


router.get("/check-session", async (req, res) => {
  try {
      const { sessionId } = req.query;

      if (!sessionId) {
          return res.status(400).json({ message: "Session ID is required." });
      }

      // Find the user's session
      const user = await User.findOne({ sessionId });
      if (!user) {
          return res.status(404).json({ message: "Session not found." });
      }

      // Retrieve the user's preferences
      const consent = await Consent.findOne({ sessionId });
      if (!consent) {
          return res.status(404).json({ message: "Consent not found." });
      }

      res.status(200).json({
          userId: user._id,
          preferences: consent.preferences,
      });
  } catch (error) {
      console.error("❌ Error checking session:", error.message);
      res.status(500).json({ message: "Internal server error." });
  }
});


router.delete("/delete-data", authenticateToken, async (req, res) => {
  try {
      const { consentId } = req.body;

      if (!consentId) {
          return res.status(400).json({ message: "Consent ID is required." });
      }

      // Find and delete the user's consent
      const consent = await Consent.findOneAndDelete({ consentId });
      if (!consent) {
          return res.status(404).json({ message: "Consent not found." });
      }

      // Delete the user's account
      await User.findOneAndDelete({ _id: consent.userId });

      res.status(200).json({ message: "Your data has been deleted as per GDPR." });
  } catch (error) {
      console.error("❌ Error deleting data:", error.message);
      res.status(500).json({ message: "Internal server error." });
  }
});

// 👉 **DELETE Route to Delete Location Data**
router.delete("/delete-location/:consentId", async (req, res) => {
  try {
    const { consentId } = req.params;

    // Call the deleteLocationData function
    const result = await deleteLocationData(consentId);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting location data:", error.message);
    res.status(500).json({ message: "Failed to delete location data: " + error.message });
  }
});

module.exports = router;