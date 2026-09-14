/* ===================================
   PREPVANTA AUTH SCRIPT
   Real backend authentication
=================================== */

const API_BASE_URL = "http://localhost:5000/api/auth";

/* ---------------- Session ---------------- */

function startSession(token, user) {
    localStorage.setItem("prepvanta-loggedIn", "true");
    localStorage.setItem("prepvanta-token", token);
    localStorage.setItem("prepvanta-user", JSON.stringify(user));
}

/* ---------------- Form Error ---------------- */

function setFieldError(group, message) {
    group.classList.toggle("error", !!message);

    const msg = group.querySelector(".form-error");

    if (msg) {
        msg.textContent = message || "";
    }
}

/* ---------------- Register ---------------- */

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (e) => {

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

        setFieldError(
            fullNameGroup,
            fullName.length < 2 ? "Enter your full name." : ""
        );

        if (fullName.length < 2) {
            valid = false;
        }

        if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
            setFieldError(
                usernameGroup,
                "4-20 characters: letters, numbers, underscore only."
            );
            valid = false;
        } else {
            setFieldError(usernameGroup, "");
        }

        const contactValid =
            /^\S+@\S+\.\S+$/.test(contact) ||
            /^[6-9]\d{9}$/.test(contact.replace(/\s/g, ""));

        setFieldError(
            contactGroup,
            contactValid
                ? ""
                : "Enter a valid email or 10-digit phone number."
        );

        if (!contactValid) {
            valid = false;
        }

        setFieldError(
            passwordGroup,
            password.length < 6
                ? "Use at least 6 characters."
                : ""
        );

        if (password.length < 6) {
            valid = false;
        }

        const termsChecked =
            document.getElementById("agreeTerms").checked;

        const termsError =
            document.getElementById("termsError");

        termsError.style.display =
            termsChecked ? "none" : "block";

        if (!termsChecked) {
            valid = false;
        }

        if (!valid) {
            return;
        }

        const submitButton =
            registerForm.querySelector("button[type=submit]");

        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";

        try {

            const response = await fetch(
                `${API_BASE_URL}/register`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        fullName,
                        username,
                        contact,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                if (
                    response.status === 409 &&
                    data.message
                ) {
                    setFieldError(
                        usernameGroup,
                        data.message
                    );
                } else if (data.message) {
                    setFieldError(
                        usernameGroup,
                        data.message
                    );
                }

                submitButton.disabled = false;
                submitButton.textContent = "Register";

                return;
            }

            const user = data.user;

            const box =
                document.getElementById("useridBox");

            const uidText =
                document.getElementById("useridValue");

            uidText.textContent = user.userId;

            box.classList.add("show");

            submitButton.style.display = "none";

            const continueBtn =
                document.getElementById("continueBtn");

            continueBtn.style.display = "block";

            continueBtn.addEventListener("click", () => {

                /*
                 * Current backend registration returns
                 * the user but not a JWT.
                 *
                 * Therefore we continue to login.html.
                 * After login, the JWT will be stored.
                 */

                localStorage.setItem(
                    "prepvanta-registered-user",
                    JSON.stringify(user)
                );

                location.href = "login.html";
            });

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            setFieldError(
                contactGroup,
                "Unable to connect to the server. Please try again."
            );

            submitButton.disabled = false;
            submitButton.textContent = "Register";
        }
    });
}

/* ---------------- Login ---------------- */

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const contactGroup =
            document.getElementById("fg-login-contact");

        const passwordGroup =
            document.getElementById("fg-login-password");

        const contact =
            contactGroup.querySelector("input").value.trim();

        const password =
            passwordGroup.querySelector("input").value;

        if (!contact) {

            setFieldError(
                contactGroup,
                "Enter your email or phone number."
            );

            return;
        }

        if (!password) {

            setFieldError(
                passwordGroup,
                "Enter your password."
            );

            return;
        }

        setFieldError(contactGroup, "");
        setFieldError(passwordGroup, "");

        const submitButton =
            loginForm.querySelector("button[type=submit]");

        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";

        try {

            const response = await fetch(
                `${API_BASE_URL}/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contact,
                        password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {

                setFieldError(
                    contactGroup,
                    data.message ||
                    "Invalid contact or password."
                );

                submitButton.disabled = false;
                submitButton.textContent = "Login";

                return;
            }

            startSession(
                data.token,
                data.user
            );

            localStorage.removeItem(
                "prepvanta-registered-user"
            );

            location.href = "dashboard.html";

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            setFieldError(
                contactGroup,
                "Unable to connect to the server. Please try again."
            );

            submitButton.disabled = false;
            submitButton.textContent = "Login";
        }
    });
}

/* ---------------- Logout ---------------- */

function prepvantaLogout() {

    localStorage.removeItem(
        "prepvanta-loggedIn"
    );

    localStorage.removeItem(
        "prepvanta-token"
    );

    localStorage.removeItem(
        "prepvanta-user"
    );

    location.href = "index.html";
}

/* ---------------- Password Visibility Toggle ---------------- */

document
    .querySelectorAll(".toggle-password")
    .forEach((button) => {

        button.addEventListener("click", () => {

            const targetId =
                button.dataset.target;

            const passwordInput =
                document.getElementById(targetId);

            if (!passwordInput) {
                return;
            }

            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                button.textContent = "🙈";

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                passwordInput.type = "password";

                button.textContent = "👁️";

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );
            }
        });
    });
