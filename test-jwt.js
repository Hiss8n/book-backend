const jwt = require("jsonwebtoken");
require("dotenv/config");

console.log("=== JWT CONFIGURATION TEST ===");
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("JWT_SECRET length:", process.env.JWT_SECRET?.length || 0);

try {
  const testToken = jwt.sign({ userId: "test123" }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  console.log("✅ Test token generated successfully");

  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log("✅ Test token verified successfully");
  console.log("Token payload:", decoded);
  console.log(
    "Expires in:",
    Math.floor((decoded.exp * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
    "days"
  );
} catch (error) {
  console.log("❌ JWT Error:", error.message);
}
