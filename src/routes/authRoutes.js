import express from "express";
import User from "../models/Users.js";
import jwt from "jsonwebtoken";
import "dotenv/config";
import bcryptjs from "bcryptjs";
const router = express.Router();

const generateToken = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  return token;
};

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "All the  fields are required!" });

    if (password.length < 6)
      return res.status(400).json({
        success: false,
        message: "Paaasord must be at least 6 characters!",
      });

    if (username.length < 3)
      return res.status(400).json({
        success: false,
        message: "Username must be at least 3 characters!",
      });

    const isUsernameExist = await User.findOne({ username });

    if (isUsernameExist)
      return res.status(400).json({
        success: false,
        message: "This Username already exists,try another name",
      });

    const isEmailExist = await User.findOne({ email });

    if (isEmailExist)
      return res
        .status(400)
        .json({ success: false, message: "This email already exist" });

    const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

    const user = new User({ username, email, password, profileImage });

    await user.save();

    /// NOW Create a token with the user's id
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `internal error occured, please try again ${error.message}`,
    });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "All fields are requiree" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const isPasswordMatch = await bcryptjs.compare(password, user.password);

    if (!isPasswordMatch)
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials entered!" });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal login in error",
    });
  }
});
//logout by clearing all the cookie
router.post("logout", async (req, res) => {
  res.clearCookie("token", token, { maxAge: "" });
});

// Token refresh endpoint
router.post("/refresh", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify the existing token (even if expired, we can still decode it)
    const decodedToken = jwt.decode(token, { complete: true });

    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
      });
    }

    const userId = decodedToken.payload.userId;

    // Check if user still exists
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Generate new token
    const newToken = generateToken(userId);

    res.json({
      success: true,
      token: newToken,
      user: {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Could not refresh token",
    });
  }
});

export default router;
