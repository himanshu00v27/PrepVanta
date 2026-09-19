const rateLimit = require('express-rate-limit');

/*
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Too many requests. Please try again later.'
    }
});

/*
 * Login rate limiter
 * 10 login attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message: 'Too many login attempts. Please try again later.'
    }
});

/*
 * Password reset / OTP request limiter
 * 5 requests per 15 minutes per IP
 */
const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message:
            'Too many password reset requests. Please try again later.'
    }
});

/*
 * Registration rate limiter
 * 5 registration requests per 15 minutes per IP
 */
const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message:
            'Too many registration attempts. Please try again later.'
    }
});

/*
 * OTP verification rate limiter
 * 5 verification requests per 15 minutes per IP
 */
const otpVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message:
            'Too many OTP verification attempts. Please try again later.'
    }
});

/*
 * Username availability rate limiter
 * 30 requests per 15 minutes per IP
 */
const usernameCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        message:
            'Too many username checks. Please try again later.'
    }
});

module.exports = {
    generalLimiter,
    loginLimiter,
    passwordResetLimiter,
    registrationLimiter,
    otpVerificationLimiter,
    usernameCheckLimiter
};