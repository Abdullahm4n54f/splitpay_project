const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    // get the token from the headers
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ message: "No token found, authorization denied" });
    }

    try {
        // the token usually looks like "Bearer eyJhbGci...", so we split it to get just the token part
        const token = authHeader.split(" ")[1];

        // decode it using our secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // save the user info (like userId) to the request so our controllers can use it
        req.user = decoded;
        next(); // move on to the actual controller function
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = { protect };