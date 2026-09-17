/* ===================================
   PREPVANTA AUTH SCRIPT
   Real backend authentication + OTP
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
    if (!group) return;

    group.classList.toggle("error", !!message);

    const msg = group.querySelector(".form-error");

    if (msg) {
        msg.textContent = message || "";
    }
}

/* =========================================================
   REGISTER
========================================================= */

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    const usernameInput =
        document
            .getElementById("fg-username")
            .querySelector("input");

    let usernameCheckTimeout;

    usernameInput.addEventListener("input", () => {

        clearTimeout(usernameCheckTimeout);

        const username =
            usernameInput.value.trim();

        const oldMessage =
            document.getElementById(
                "username-availability"
            );

        if (oldMessage) {
            oldMessage.remove();
        }

        // Only check valid usernames
        if (!/^[a-z0-9]{4,20}$/.test(username)) {
            return;
        }

        usernameCheckTimeout = setTimeout(
            async () => {

                try {

                    const response = await fetch(
                        `${API_BASE_URL}/check-username?username=${encodeURIComponent(username)}`
                    );

                    const data =
                        await response.json();

                    const message =
                        document.createElement("small");

                    message.id =
                        "username-availability";

                    if (data.available) {
                     message.textContent = "Username is available";
                     message.classList.add("username-available");
                  } else {
                     message.textContent = "Username is already taken";
                     message.classList.add("username-taken");
                  }
                    usernameInput.parentElement.appendChild(
                        message
                    );

                } catch (error) {

                    console.error(
                        "Username availability check failed:",
                        error
                    );
                }

            },
            400
        );
    });

    registerForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const fullNameGroup =
            document.getElementById("fg-fullname");

        const usernameGroup =
            document.getElementById("fg-username");

        const emailGroup =
            document.getElementById("fg-email");

        const passwordGroup =
            document.getElementById("fg-password");

        const fullName =
            fullNameGroup.querySelector("input").value.trim();

        const username =
            usernameGroup.querySelector("input").value.trim();

        const email =
            emailGroup.querySelector("input").value.trim();

        const password =
            passwordGroup.querySelector("input").value;

        let valid = true;

        /* Full name */

        setFieldError(
            fullNameGroup,
            fullName.length < 2
                ? "Enter your full name."
                : ""
        );

        if (fullName.length < 2) {
            valid = false;
        }

        /* Username */

        if (!/^[a-z0-9]{4,20}$/.test(username)) {

            setFieldError(
                usernameGroup,
                "4-20 characters: lowecase letters and numbers only."
            );

            valid = false;

        } else {

            setFieldError(usernameGroup, "");
        }

        /* Email */

        const emailValid =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        setFieldError(
            emailGroup,
            emailValid
                ? ""
                : "Enter a valid email address."
        );

        if (!emailValid) {
            valid = false;
        }

        /* Password */

        setFieldError(
            passwordGroup,
            password.length < 6
                ? "Use at least 6 characters."
                : ""
        );

        if (password.length < 6) {
            valid = false;
        }

        /* Terms */

        const termsCheckbox =
            document.getElementById("agreeTerms");

        const termsError =
            document.getElementById("termsError");

        const termsChecked =
            termsCheckbox && termsCheckbox.checked;

        if (termsError) {
            termsError.style.display =
                termsChecked ? "none" : "block";
        }

        if (!termsChecked) {
            valid = false;
        }

        if (!valid) {
            return;
        }

        /* Disable button */

        const submitButton =
            registerForm.querySelector("button[type=submit]");

        submitButton.disabled = true;
        submitButton.textContent = "Sending OTP...";

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
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            /* Backend error */

            if (!response.ok) {

                if (data.message) {

                    setFieldError(
                        emailGroup,
                        data.message
                    );
                }

                submitButton.disabled = false;
                submitButton.textContent = "Register";

                return;
            }

            /*
             * Registration was accepted.
             * Backend has sent an OTP email.
             */

            showOTPVerification(
                fullName,
                username,
                email,
                password
            );

            submitButton.disabled = false;

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            setFieldError(
                emailGroup,
                "Unable to connect to the server. Please try again."
            );

            submitButton.disabled = false;
            submitButton.textContent = "Register";
        }
    });
}


/* =========================================================
   OTP VERIFICATION UI
========================================================= */

function showOTPVerification(
    fullName,
    username,
    email,
    password
) {

    /*
     * Hide the registration form after OTP is sent.
     */

    registerForm.style.display = "none";

    /*
     * Create OTP verification section.
     */

    const verificationBox =
        document.createElement("div");

    verificationBox.id = "otpVerificationBox";

    verificationBox.innerHTML = `
        <div class="otp-verification">

            <h2>Verify Your Email</h2>

            <p>
                We sent a 6-digit verification code to
                <strong>${escapeHTML(email)}</strong>.
            </p>

            <div class="form-group" id="fg-otp">

                <label for="otpInput">
                    Verification Code
                </label>

                <input
                    type="text"
                    id="otpInput"
                    inputmode="numeric"
                    maxlength="6"
                    placeholder="Enter 6-digit OTP"
                    autocomplete="one-time-code"
                >

                <span class="form-error"></span>

            </div>

            <button
                type="button"
                id="verifyOTPButton"
            >
                Verify Email
            </button>

            <p id="otpStatus"></p>

        </div>
    `;

    /*
     * Put OTP section where the register form was.
     */

    registerForm.parentNode.insertBefore(
        verificationBox,
        registerForm
    );

    /*
     * Verify OTP button
     */

    const verifyButton =
        document.getElementById("verifyOTPButton");

    verifyButton.addEventListener(
        "click",
        async () => {

            const otpInput =
                document.getElementById("otpInput");

            const otpGroup =
                document.getElementById("fg-otp");

            const otp =
                otpInput.value.trim();

            if (!/^\d{6}$/.test(otp)) {

                setFieldError(
                    otpGroup,
                    "Enter the 6-digit verification code."
                );

                return;
            }

            setFieldError(otpGroup, "");

            verifyButton.disabled = true;
            verifyButton.textContent = "Verifying...";

            try {

                const response = await fetch(
                    `${API_BASE_URL}/verify-otp`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            otp
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {

                    setFieldError(
                        otpGroup,
                        data.message ||
                        "Invalid verification code."
                    );

                    verifyButton.disabled = false;
                    verifyButton.textContent = "Verify Email";

                    return;
                }

                /*
                 * Account has now been created.
                 */
                localStorage.setItem(
                     "prepvanta-show-walkthrough",
                     "true"
                );

                verificationBox.innerHTML = `
                    <div class="otp-verification">

                        <h2>Email Verified!</h2>

                        <p>
                            Your PrepVanta account has been
                            created successfully.
                        </p>

                        <p>
                            You can now log in using your
                            email address and password.
                        </p>

                        <button
                            type="button"
                            id="goToLoginButton"
                        >
                            Continue to Login
                        </button>

                    </div>
                `;

                const goToLoginButton =
                    document.getElementById(
                        "goToLoginButton"
                    );

                goToLoginButton.addEventListener(
                    "click",
                    () => {

                        location.href = "login.html";
                    }
                );

            } catch (error) {

                console.error(
                    "OTP verification error:",
                    error
                );

                setFieldError(
                    document.getElementById("fg-otp"),
                    "Unable to connect to the server. Please try again."
                );

                verifyButton.disabled = false;
                verifyButton.textContent = "Verify Email";
            }
        }
    );

    /*
     * Allow Enter key to submit OTP.
     */

    document
        .getElementById("otpInput")
        .addEventListener("keydown", (event) => {

            if (event.key === "Enter") {
                verifyButton.click();
            }
        });
}


/* =========================================================
   HTML ESCAPE HELPER
========================================================= */

function escapeHTML(value) {

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   LOGIN
========================================================= */

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const emailGroup =
                document.getElementById(
                    "fg-login-email"
                );

            const passwordGroup =
                document.getElementById(
                    "fg-login-password"
                );

            const email =
                emailGroup.querySelector(
                    "input"
                ).value.trim();

            const password =
                passwordGroup.querySelector(
                    "input"
                ).value;

            let valid = true;

            /* Email */

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    email
                )
            ) {

                setFieldError(
                    emailGroup,
                    "Enter a valid email address."
                );

                valid = false;

            } else {

                setFieldError(
                    emailGroup,
                    ""
                );
            }

            /* Password */

            if (!password) {

                setFieldError(
                    passwordGroup,
                    "Enter your password."
                );

                valid = false;

            } else {

                setFieldError(
                    passwordGroup,
                    ""
                );
            }

            if (!valid) {
                return;
            }

            const submitButton =
                loginForm.querySelector(
                    "button[type=submit]"
                );

            submitButton.disabled = true;
            submitButton.textContent = "Logging in...";

            try {

                const response = await fetch(
                    `${API_BASE_URL}/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {

                    setFieldError(
                        emailGroup,
                        data.message ||
                        "Invalid email or password."
                    );

                    submitButton.disabled = false;
                    submitButton.textContent = "Login";

                    return;
                }

                /*
                 * Login successful.
                 */

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
                    emailGroup,
                    "Unable to connect to the server. Please try again."
                );

                submitButton.disabled = false;
                submitButton.textContent = "Login";
            }
        }
    );
}


/* =========================================================
   LOGOUT
========================================================= */

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


/* =========================================================
   PASSWORD VISIBILITY TOGGLE
========================================================= */

document
    .querySelectorAll(".toggle-password")
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.target;

                const passwordInput =
                    document.getElementById(
                        targetId
                    );

                if (!passwordInput) {
                    return;
                }

                if (
                    passwordInput.type ===
                    "password"
                ) {

                    passwordInput.type = "text";

                    button.textContent = "🙈";

                    button.setAttribute(
                        "aria-label",
                        "Hide password"
                    );

                } else {

                    passwordInput.type =
                        "password";

                    button.textContent = "👁️";

                    button.setAttribute(
                        "aria-label",
                        "Show password"
                    );
                }
            }
        );
    });
