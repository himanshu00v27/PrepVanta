const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const { sendEmail } = require('../services/emailService');

const router = express.Router();

/* =========================
   HELPERS
========================= */

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateOTP() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp) {
    return crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');
}

function generateUserId() {
    return `PV${Date.now().toString(36).toUpperCase()}`;
}


/* =========================
   REGISTER
   Send email OTP
========================= */

router.post('/register', async (req, res) => {
    try {
        const {
            fullName,
            username,
            email,
            password
        } = req.body;

        /* ---------- Required fields ---------- */

        if (!fullName || !username || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required'
            });
        }

        /* ---------- Email validation ---------- */

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                message: 'Please enter a valid email address'
            });
        }

        /* ---------- Username validation ---------- */

        const normalizedUsername =
            username.trim().toLowerCase();

        if (!/^[a-zA-Z0-9_]{4,20}$/.test(normalizedUsername)) {
            return res.status(400).json({
                message:
                    'Username must contain 4-20 letters, numbers, or underscores'
            });
        }

        /* ---------- Password validation ---------- */

        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters'
            });
        }

        /* ---------- Check existing user ---------- */

        const existingUser = await User.findOne({
            $or: [
                { username: normalizedUsername },
                { email: normalizedEmail }
            ]
        });

        if (existingUser) {

            if (existingUser.username === normalizedUsername) {
                return res.status(409).json({
                    message: 'Username is already registered'
                });
            }

            return res.status(409).json({
                message: 'Email is already registered'
            });
        }

        /* ---------- Remove old pending registration ---------- */

        await EmailVerification.deleteMany({
            $or: [
                { email: normalizedEmail },
                { username: normalizedUsername }
            ]
        });

        /* ---------- Generate OTP ---------- */

        const otp = generateOTP();

        const otpHash = hashOTP(otp);

        const otpExpiresAt =
            new Date(Date.now() + 5 * 60 * 1000);

        /* ---------- Hash password ---------- */

        const hashedPassword =
            await bcrypt.hash(password, 10);

        /* ---------- Store pending registration ---------- */

        await EmailVerification.create({
            fullName: fullName.trim(),
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword,
            otpHash,
            otpExpiresAt,
            otpAttempts: 0,
            verified: false
        });

        /* ---------- Send OTP email ---------- */

        await sendEmail({
            to: normalizedEmail,

            subject: 'PrepVanta Email Verification',

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                ">

                    <h2>Welcome to PrepVanta!</h2>

                    <p>
                        Thank you for creating your PrepVanta account.
                    </p>

                    <p>
                        Your email verification OTP is:
                    </p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 25px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This OTP will expire in
                        <strong>5 minutes</strong>.
                    </p>

                    <p>
                        If you did not request this registration,
                        you can safely ignore this email.
                    </p>

                    <hr>

                    <p style="font-size: 12px;">
                        PrepVanta Account Verification
                    </p>

                </div>
            `
        });

        return res.status(200).json({
            message: 'OTP sent successfully',
            email: normalizedEmail
        });

    } catch (error) {

        console.error(
            'Registration error:',
            error.message
        );

        return res.status(500).json({
            message:
                'Unable to send verification email. Please try again.'
        });
    }
});


/* =========================
   VERIFY OTP
========================= */

router.post('/verify-otp', async (req, res) => {
    try {

        const {
            email,
            otp
        } = req.body;

        /* ---------- Validate input ---------- */

        if (!email || !otp) {
            return res.status(400).json({
                message: 'Email and OTP are required'
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                message: 'OTP must be a 6-digit number'
            });
        }

        /* ---------- Find pending registration ---------- */

        const verification =
            await EmailVerification.findOne({
                email: normalizedEmail,
                verified: false
            });

        if (!verification) {
            return res.status(404).json({
                message:
                    'No pending verification found. Please register again.'
            });
        }

        /* ---------- Check expiry ---------- */

        if (
            new Date() >
            verification.otpExpiresAt
        ) {
            await EmailVerification.deleteOne({
                _id: verification._id
            });

            return res.status(410).json({
                message:
                    'OTP has expired. Please register again.'
            });
        }

        /* ---------- Check attempts ---------- */

        if (verification.otpAttempts >= 5) {

            await EmailVerification.deleteOne({
                _id: verification._id
            });

            return res.status(429).json({
                message:
                    'Too many incorrect attempts. Please register again.'
            });
        }

        /* ---------- Compare OTP ---------- */

        const submittedOTPHash =
            hashOTP(otp);

        if (
            submittedOTPHash !==
            verification.otpHash
        ) {

            verification.otpAttempts += 1;

            await verification.save();

            return res.status(401).json({
                message: 'Incorrect OTP'
            });
        }

        /* ---------- Mark verified ---------- */

        verification.verified = true;

        await verification.save();

        /* ---------- Double-check uniqueness ---------- */

        const existingUser = await User.findOne({
            $or: [
                { username: verification.username },
                { email: verification.email }
            ]
        });

        if (existingUser) {

            await EmailVerification.deleteOne({
                _id: verification._id
            });

            return res.status(409).json({
                message:
                    'Username or email is already registered'
            });
        }

        /* ---------- Create actual user ---------- */

        const user = await User.create({
            fullName: verification.fullName,
            username: verification.username,
            email: verification.email,
            password: verification.password,
            userId: generateUserId(),
            role: 'user'
        });

        /* ---------- Delete temporary verification ---------- */

        await EmailVerification.deleteOne({
            _id: verification._id
        });

        return res.status(201).json({
            message: 'Email verified and registration successful',

            user: {
                userId: user.userId,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.error(
            'OTP verification error:',
            error.message
        );

        return res.status(500).json({
            message:
                'Server error during email verification'
        });
    }
});


/* =========================
   LOGIN
========================= */

router.post('/login', async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;

        /* ---------- Validate input ---------- */

        if (!email || !password) {
            return res.status(400).json({
                message:
                    'Email and password are required'
            });
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        /* ---------- Find user ---------- */

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                message:
                    'Invalid email or password'
            });
        }

        /* ---------- Compare password ---------- */

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {
            return res.status(401).json({
                message:
                    'Invalid email or password'
            });
        }

        /* ---------- Create JWT ---------- */

        const token = jwt.sign(
            {
                userId: user.userId,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        /* ---------- Send response ---------- */

        return res.json({
            message: 'Login successful',

            token,

            user: {
                userId: user.userId,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        console.error(
            'Login error:',
            error.message
        );

        return res.status(500).json({
            message:
                'Server error during login'
        });
    }
});


module.exports = router;