const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Authentication required'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({
            userId: decoded.userId
        }).select('-password');

        if (!user) {
            return res.status(401).json({
                message: 'User account not found'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: 'Account is deactivated'
            });
        }

        req.user = user;

        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token'
        });
    }
}

module.exports = authMiddleware;