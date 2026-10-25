# PrepVanta

**A Placement Preparation Platform for Students**

[Live Website](https://prepvanta.space) | [GitHub Repository](https://github.com/himanshu00v27/PrepVanta)

## Project Description

PrepVanta is a comprehensive placement preparation platform designed to help students prepare for aptitude tests, coding interviews, company-specific recruitment processes, and technical interviews. The platform provides practice resources, coding tools, company information, user profiles, and support features.

## Project Status

**Completed and Live** — Successfully deployed and tested.

## Features

- Student Registration and Email OTP Verification
- Login and Authentication
- Personalized Student Dashboard
- Aptitude Practice
- Topic-Based Practice and Practice Sets
- Coding Compiler Integration
- Student Profiles
- Attempt History and Results
- Company Information
- Interview Preparation Resources
- Admin Dashboard
- Question Management
- User Management
- Platform Statistics
- Responsive UI

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT, bcryptjs
- **Email Service:** Resend
- **Coding Compiler:** JDoodle
- **Web Server:** Nginx
- **Hosting:** AWS EC2
- **SSL:** Let's Encrypt, Certbot
- **Version Control:** Git, GitHub

## Deployment

- **Live Website:** https://prepvanta.space
- **Hosting:** AWS EC2
- **Database:** MongoDB Atlas
- **HTTPS:** Enabled
- **Backups:** Automated daily database backups
- **Monitoring:** External uptime monitoring

## Testing

**Core functional testing completed successfully.**

## Project Structure

```text
PrepVanta/
│
├── frontend/
│   ├── assets/
│   ├── css/
│   │   ├── admin.css
│   │   ├── attempt-history.css
│   │   ├── attempt-result.css
│   │   ├── auth-animations.css
│   │   ├── auth.css
│   │   ├── companies.css
│   │   ├── compiler.css
│   │   ├── dashboard.css
│   │   ├── footer.css
│   │   ├── global.css
│   │   ├── home.css
│   │   ├── listing.css
│   │   ├── navbar.css
│   │   ├── platform-settings.css
│   │   ├── practice-set.css
│   │   ├── practice-sets.css
│   │   ├── practice.css
│   │   ├── support.css
│   │   ├── theme.css
│   │   ├── topics.css
│   │   └── walkthrough.css
│   │
│   ├── js/
│   │   ├── admin.js
│   │   ├── attempt-history.js
│   │   ├── attempt-result.js
│   │   ├── auth-guard.js
│   │   ├── auth.js
│   │   ├── companies.js
│   │   ├── compiler.js
│   │   ├── dashboard.js
│   │   ├── help-desk.js
│   │   ├── interview.js
│   │   ├── main.js
│   │   ├── platform-settings.js
│   │   ├── practice-set.js
│   │   ├── practice-sets.js
│   │   ├── search.js
│   │   ├── sidebar.js
│   │   ├── theme.js
│   │   ├── topic-practice.js
│   │   ├── topics.js
│   │   └── walkthrough.js
│   │
│   ├── admin.html
│   ├── aptitude.html
│   ├── attempt-history.html
│   ├── attempt-result.html
│   ├── companies.html
│   ├── compiler.html
│   ├── contact-us.html
│   ├── dashboard.html
│   ├── forgot-password.html
│   ├── help-desk.html
│   ├── index.html
│   ├── interview.html
│   ├── login.html
│   ├── practice-set.html
│   ├── practice-sets.html
│   ├── privacy-policy.html
│   ├── reasoning.html
│   ├── register.html
│   ├── reset-password.html
│   ├── search-users.html
│   ├── terms.html
│   ├── topic-practice.html
│   ├── topics.html
│   ├── favicon.ico
│   └── serve.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   │   ├── compiler/
│   │   ├── company/
│   │   ├── settings/
│   │   ├── support/
│   │   └── user/
│   │
│   ├── middleware/
│   │   ├── adminMiddleware.js
│   │   ├── authMiddleware.js
│   │   ├── maintenanceMiddleware.js
│   │   └── rateLimiters.js
│   │
│   ├── models/
│   │   ├── Attempt.js
│   │   ├── AuditLog.js
│   │   ├── Company.js
│   │   ├── CompilerRun.js
│   │   ├── EmailVerification.js
│   │   ├── PracticeSet.js
│   │   ├── Profile.js
│   │   ├── Progress.js
│   │   ├── Question.js
│   │   ├── QuestionActivity.js
│   │   ├── Setting.js
│   │   ├── Ticket.js
│   │   ├── Topic.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── attemptRoutes.js
│   │   ├── authRoutes.js
│   │   ├── companyRoutes.js
│   │   ├── compilerRoutes.js
│   │   ├── practiceRoutes.js
│   │   ├── progressRoutes.js
│   │   ├── questionsRoutes.js
│   │   ├── settingsRoutes.js
│   │   ├── supportRoutes.js
│   │   ├── testRoutes.js
│   │   ├── topicRoutes.js
│   │   └── userRoutes.js
│   │
│   ├── services/
│   │   ├── auditService.js
│   │   ├── companyService.js
│   │   ├── compilerService.js
│   │   ├── emailService.js
│   │   ├── settingsService.js
│   │   ├── supportService.js
│   │   └── userService.js
│   │
│   ├── seed/
│   │   ├── seedData.js
│   │   └── seedGroup2.js
│   │
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── .gitignore
└── README.md
```

## Future Enhancements

- AI-Powered Placement Assistance
- Enhanced Interview Preparation
- Additional User Personalization
- Personalized Learning Recommendations
- Expanded Aptitude and Coding Practice
- Performance and Scalability Improvements

## Team Members

- Mahendra
- Amber
- Arghyadeep
- Shubham
- Himanshu

---

**PrepVanta — Preparing Students for Placement Success.**
