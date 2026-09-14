const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

/* =========================
   REGISTER
========================= */
router.post('/register', async (req, res) => {
    try {
        const { fullName, username, contact, password } = req.body;

        if (!fullName || !username || !contact || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { contact: contact }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'Username or contact already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userId = `PV${Date.now().toString(36).toUpperCase()}`;

        const user = await User.create({
            fullName,
            username: username.toLowerCase(),
            contact,
            password: hashedPassword,
            userId
        });

        res.status(201).json({
            message: 'Registration successful',
            user: {
                userId: user.userId,
                fullName: user.fullName,
                username: user.username,
                contact: user.contact
            }
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        res.status(500).json({
            message: 'Server error during registration'
        });
    }
});


/* =========================
   LOGIN
========================= */
router.post('/login', async (req, res) => {
    try {
        const { contact, password } = req.body;

        if (!contact || !password) {
            return res.status(400).json({
                message: 'Contact and password are required'
            });
        }

        const user = await User.findOne({ contact });

        if (!user) {
            return res.status(401).json({
                message: 'Invalid contact or password'
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: 'Invalid contact or password'
            });
        }

        const token = jwt.sign(
            {
                userId: user.userId,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.userId,
                fullName: user.fullName,
                username: user.username,
                contact: user.contact
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);

        res.status(500).json({
            message: 'Server error during login'
        });
    }
});

module.exports = router;