/* ===================================
   PREPVANTA AUTH SCRIPT
   (frontend-only mock — swap for real API calls later)
=================================== */

function getUsers() {
    return JSON.parse(localStorage.getItem("prepvanta-users") || "[]");
}

function saveUsers(users) {
    localStorage.setItem("prepvanta-users", JSON.stringify(users));
}

function generateUserId(existing) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id;
    do {
        id = "";
        for (let i = 0; i < 8; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
    } while (existing.some(u => u.userId === id));
    return id;
}

function setFieldError(group, message) {
    group.classList.toggle("error", !!message);
    const msg = group.querySelector(".form-error");
    if (msg) msg.textContent = message || "";
}

function startSession(user) {
    localStorage.setItem("prepvanta-loggedIn", "true");
    localStorage.setItem("prepvanta-user", JSON.stringify(user));
}

/* ---------------- Register ---------------- */

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const fullNameGroup = document.getElementById("fg-fullname");
        const usernameGroup = document.getElementById("fg-username");
        const contactGroup = document.getElementById("fg-contact");
        const passwordGroup = document.getElementById("fg-password");

        const fullName = fullNameGroup.querySelector("input").value.trim();
        const username = usernameGroup.querySelector("input").value.trim();
        const contact = contactGroup.querySelector("input").value.trim();
        const password = passwordGroup.querySelector("input").value;

        let valid = true;

        setFieldError(fullNameGroup, fullName.length < 2 ? "Enter your full name." : "");
        if (fullName.length < 2) valid = false;

        const users = getUsers();
        const taken = users.some(u => u.username.toLowerCase() === username.toLowerCase());

        if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
            setFieldError(usernameGroup, "4-20 characters: letters, numbers, underscore only.");
            valid = false;
        } else if (taken) {
            setFieldError(usernameGroup, "That username is already taken.");
            valid = false;
        } else {
            setFieldError(usernameGroup, "");
        }

        const contactValid = /^\S+@\S+\.\S+$/.test(contact) || /^[6-9]\d{9}$/.test(contact.replace(/\s/g, ""));
        setFieldError(contactGroup, contactValid ? "" : "Enter a valid email or 10-digit phone number.");
        if (!contactValid) valid = false;

        setFieldError(passwordGroup, password.length < 6 ? "Use at least 6 characters." : "");
        if (password.length < 6) valid = false;

        const termsChecked = document.getElementById("agreeTerms").checked;
        const termsError = document.getElementById("termsError");
        termsError.style.display = termsChecked ? "none" : "block";
        if (!termsChecked) valid = false;

        if (!valid) return;

        const userId = generateUserId(users);
        const newUser = { fullName, username, contact, userId, joined: new Date().toISOString() };
        users.push(newUser);
        saveUsers(users);

        const box = document.getElementById("useridBox");
        const uidText = document.getElementById("useridValue");

        uidText.textContent = userId;
        box.classList.add("show");

        registerForm.querySelector("button[type=submit]").style.display = "none";

        const continueBtn = document.getElementById("continueBtn");
        continueBtn.style.display = "block";
        continueBtn.addEventListener("click", () => {
            startSession(newUser);
            localStorage.setItem("prepvanta-show-walkthrough", "true");
            location.href = "dashboard.html";
        });
    });
}

/* ---------------- Login ---------------- */

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const contactGroup = document.getElementById("fg-login-contact");
        const contact = contactGroup.querySelector("input").value.trim();

        if (!contact) {
            setFieldError(contactGroup, "Enter your email or phone number.");
            return;
        }

        setFieldError(contactGroup, "");

        const users = getUsers();
        const user = users.find(u => u.contact.toLowerCase() === contact.toLowerCase());

        if (!user) {
            setFieldError(contactGroup, "No account found with that email or phone number. Please register first.");
            return;
        }

        startSession(user);
        location.href = "dashboard.html";
    });
}

/* ---------------- Logout (used by sidebar Logout link) ---------------- */

function prepvantaLogout() {
    localStorage.removeItem("prepvanta-loggedIn");
    location.href = "index.html";
}
/* ---------------- Password Visibility Toggle ---------------- */

document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const passwordInput = document.getElementById(targetId);

        if (!passwordInput) return;

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            button.textContent = "🙈";
            button.setAttribute("aria-label", "Hide password");
        } else {
            passwordInput.type = "password";
            button.textContent = "👁️";
            button.setAttribute("aria-label", "Show password");
        }
    });
});