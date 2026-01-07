import jwt from "jsonwebtoken";
import User from "../models/Users.js";

const protectRoute = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token)
      return res.status(401).json({
        success: false,
        message: "No authentication token, access denied",
      });

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user
    const user = await User.findById(decodedToken.userId).select("-password");

    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "Token is not valid" });

    req.user = user;
    console.log("Set req.user:", req.user?._id);
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Authentication error",
    });

    // Provide more specific error messages
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token is invalid",
        debug: "JsonWebTokenError",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
        debug: "TokenExpiredError",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
      debug: error.name || "Unknown error",
    });
  }
};

export default protectRoute;
