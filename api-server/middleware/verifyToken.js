const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token missing or invalid" });
  }

  const token = authHeader.split(" ")[1];
  console.log(token)

  try {
     const decoded = jwt.verify(token, JWT_SECRET);
     console.log("Decoded:", decoded); // Should log: { userId: "...", iat: ..., exp: ... }
     req.userId = decoded.userId;
 
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
