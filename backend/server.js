const { generalLimiter } = require('./middleware/rateLimiters');
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const adminRoutes = require('./routes/adminRoutes');
const companyRoutes = require('./routes/companyRoutes');
const companyQuestionRoutes = require('./routes/companyQuestionRoutes');
const companyQuestionAttemptRoutes = require('./routes/companyQuestionAttemptRoutes');
const companyProgressRoutes = require('./routes/companyProgressRoutes');
const interviewQuestionRoutes = require('./routes/interviewQuestionRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(generalLimiter);

/* =========================
   HEALTH CHECK
========================= */
app.get('/api/health', (req, res) => {
    res.json({
        message: 'PrepVanta backend is running'
    });
});

/* =========================
   AUTH ROUTES
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/company-questions', companyQuestionRoutes);
app.use('/api/company-question-attempts', companyQuestionAttemptRoutes);
app.use('/api/company-progress', companyProgressRoutes);
app.use('/api/interview-questions', interviewQuestionRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully');

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    });
