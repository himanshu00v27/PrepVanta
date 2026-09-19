const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

router.get('/protected', authMiddleware, adminMiddleware, (req, res) => {
    res.json({
        message: 'You successfully accessed the admin route',
        user: req.user
    });
});

module.exports = router;
