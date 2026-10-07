const API_BASE = "http://localhost:5000/api";

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("prepvanta-token");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    let currentProfileData = null;

    const elements = {
        profileAvatar: document.getElementById("profileAvatar"),
        profileName: document.getElementById("profileName"),
        profileUsername: document.getElementById("profileUsername"),
        profileUserId: document.getElementById("profileUserId"),
        profileJoined: document.getElementById("profileJoined"),
        profileBio: document.getElementById("profileBio"),
        profileVisibility: document.getElementById("profileVisibility"),
        profileSkills: document.getElementById("profileSkills"),
        profileEducation: document.getElementById("profileEducation"),
        profileExperience: document.getElementById("profileExperience"),
        profileProjects: document.getElementById("profileProjects"),
        profileLinks: document.getElementById("profileLinks"),

        questionsAttempted: document.getElementById("questionsAttempted"),
        practiceSetsAttempted: document.getElementById("practiceSetsAttempted"),
        accountStatus: document.getElementById("accountStatus"),

        difficultyChart: document.getElementById("difficultyChart"),
        difficultyTotal: document.getElementById("difficultyTotal"),
        easySolved: document.getElementById("easySolved"),
        mediumSolved: document.getElementById("mediumSolved"),
        hardSolved: document.getElementById("hardSolved"),

        recentActivityList: document.getElementById("recentActivityList"),

        editProfileBtn: document.getElementById("editProfileBtn"),
        profileModal: document.getElementById("profileModal"),
        closeProfileModal: document.getElementById("closeProfileModal"),
        cancelProfileBtn: document.getElementById("cancelProfileBtn"),
        profileForm: document.getElementById("profileForm"),
        profileFormMessage: document.getElementById("profileFormMessage"),
        saveProfileBtn: document.getElementById("saveProfileBtn"),

        profileNameInput: document.getElementById("profileNameInput"),
        profileBioInput: document.getElementById("profileBioInput"),
        profileSkillsInput: document.getElementById("profileSkillsInput"),
        profileEducationInput: document.getElementById("profileEducationInput"),
        profileExperienceInput: document.getElementById("profileExperienceInput"),
        profileProjectsInput: document.getElementById("profileProjectsInput"),
        profileGithubInput: document.getElementById("profileGithubInput"),
        profileLinkedinInput: document.getElementById("profileLinkedinInput"),
        profilePortfolioInput: document.getElementById("profilePortfolioInput"),
        profileResumeInput: document.getElementById("profileResumeInput"),
        profilePublicInput: document.getElementById("profilePublicInput")
    };

    function handleUnauthorized(response) {
        if (response.status !== 401 && response.status !== 403) {
            return false;
        }

        localStorage.removeItem("prepvanta-token");
        localStorage.removeItem("prepvanta-user");
        window.location.href = "login.html";
        return true;
    }

    async function apiRequest(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        if (handleUnauthorized(response)) {
            throw new Error("Authentication required");
        }

        let data = null;

        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            throw new Error(data?.message || "Request failed");
        }

        return data;
    }

    function initials(name) {
        const value = String(name || "").trim();

        if (!value) {
            return "U";
        }

        return value
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("");
    }

    function formatJoinedDate(value) {
        if (!value) {
            return "Joined date unavailable";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Joined date unavailable";
        }

        return date.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric"
        });
    }

    function formatActivityDate(value) {
        if (!value) {
            return "Date unavailable";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    function renderStringList(container, values, emptyMessage) {
        if (!container) {
            return;
        }

        container.replaceChildren();

        const cleanValues = Array.isArray(values)
            ? values.filter((value) => typeof value === "string" && value.trim())
            : [];

        if (!cleanValues.length) {
            const empty = document.createElement("p");
            empty.className = "profile-empty";
            empty.textContent = emptyMessage;
            container.appendChild(empty);
            return;
        }

        cleanValues.forEach((value) => {
            const entry = document.createElement("p");
            entry.className = "profile-entry";
            entry.textContent = value;
            container.appendChild(entry);
        });
    }

    function renderSkills(values) {
        const container = elements.profileSkills;

        if (!container) {
            return;
        }

        container.replaceChildren();

        const skills = Array.isArray(values)
            ? values.filter((value) => typeof value === "string" && value.trim())
            : [];

        if (!skills.length) {
            const empty = document.createElement("span");
            empty.className = "profile-empty";
            empty.textContent = "No skills added yet.";
            container.appendChild(empty);
            return;
        }

        skills.forEach((skill) => {
            const tag = document.createElement("span");
            tag.className = "profile-tag";
            tag.textContent = skill;
            container.appendChild(tag);
        });
    }

    function safeHttpUrl(value) {
        if (typeof value !== "string" || !value.trim()) {
            return null;
        }

        try {
            const url = new URL(value.trim());

            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return null;
            }

            return url.href;
        } catch {
            return null;
        }
    }

    function renderLinks(profile) {
        const container = elements.profileLinks;

        if (!container) {
            return;
        }

        container.replaceChildren();

        const candidates = [
            ["GitHub", profile.githubUrl],
            ["LinkedIn", profile.linkedinUrl],
            ["Portfolio", profile.portfolioUrl],
            ["Resume", profile.resumeUrl]
        ];

        let rendered = 0;

        candidates.forEach(([label, value]) => {
            const href = safeHttpUrl(value);

            if (!href) {
                return;
            }

            const link = document.createElement("a");
            link.className = "profile-link";
            link.href = href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = label;

            container.appendChild(link);
            rendered++;
        });

        if (!rendered) {
            const empty = document.createElement("span");
            empty.className = "profile-empty";
            empty.textContent = "No links added yet.";
            container.appendChild(empty);
        }
    }

    function renderProfile(data) {
        const user = data?.user || {};
        const profile = data?.profile || {};

        const displayName =
            String(profile.name || "").trim() ||
            String(user.fullName || "").trim() ||
            "PrepVanta User";

        setText(elements.profileAvatar, initials(displayName));
        setText(elements.profileName, displayName);
        setText(
            elements.profileUsername,
            user.username ? `@${user.username}` : "@user"
        );
        setText(
            elements.profileUserId,
            user.userId ? user.userId : "Unavailable"
        );
        setText(elements.profileJoined, formatJoinedDate(user.createdAt));
        setText(
            elements.profileBio,
            String(profile.bio || "").trim() ||
                "Add a short bio to introduce yourself."
        );

        if (elements.profileVisibility) {
            const isPublic = profile.isPublic !== false;
            elements.profileVisibility.textContent = isPublic
                ? "Public profile"
                : "Private profile";
            elements.profileVisibility.classList.toggle("private", !isPublic);
        }

        renderSkills(profile.skills);
        renderStringList(
            elements.profileEducation,
            profile.education,
            "No education added yet."
        );
        renderStringList(
            elements.profileExperience,
            profile.experience,
            "No experience added yet."
        );
        renderStringList(
            elements.profileProjects,
            profile.projects,
            "No projects added yet."
        );
        renderLinks(profile);
    }

    function renderDifficulty(difficulty = {}) {
        const easy = Math.max(0, Number(difficulty.easy) || 0);
        const medium = Math.max(0, Number(difficulty.medium) || 0);
        const hard = Math.max(0, Number(difficulty.hard) || 0);
        const total = easy + medium + hard;

        setText(elements.easySolved, easy);
        setText(elements.mediumSolved, medium);
        setText(elements.hardSolved, hard);
        setText(elements.difficultyTotal, total);

        if (!elements.difficultyChart) {
            return;
        }

        elements.difficultyChart.classList.toggle("empty", total === 0);

        const easyAngle = total ? (easy / total) * 360 : 0;
        const mediumAngle = total
            ? ((easy + medium) / total) * 360
            : 0;

        elements.difficultyChart.style.setProperty(
            "--easy-angle",
            `${easyAngle}deg`
        );
        elements.difficultyChart.style.setProperty(
            "--medium-angle",
            `${mediumAngle}deg`
        );

        elements.difficultyChart.setAttribute(
            "aria-label",
            total
                ? `Correctly solved: Easy ${easy}, Medium ${medium}, Hard ${hard}`
                : "No correctly solved questions yet"
        );
    }

    function renderRecentActivity(items) {
        const container = elements.recentActivityList;

        if (!container) {
            return;
        }

        container.replaceChildren();

        if (!Array.isArray(items) || !items.length) {
            const empty = document.createElement("p");
            empty.className = "dashboard-empty";
            empty.textContent =
                "No completed Practice Set attempts yet. Your latest activity will appear here.";
            container.appendChild(empty);
            return;
        }

        items.forEach((item) => {
            const row = document.createElement("div");
            row.className = "recent-activity-row";

            const main = document.createElement("div");
            main.className = "recent-activity-main";

            const title = document.createElement("div");
            title.className = "recent-activity-title";
            title.textContent =
                item.practiceSetTitle || "Deleted Practice Set";

            const meta = document.createElement("div");
            meta.className = "recent-activity-meta";

            const topic = item.topicName || "Topic unavailable";
            const category = item.category || "Category unavailable";
            meta.textContent =
                `${topic} • ${category} • ${formatActivityDate(item.submittedAt)}`;

            main.append(title, meta);

            const actions = document.createElement("div");
            actions.className = "recent-activity-actions";

            const score = document.createElement("span");
            score.className = "recent-activity-score";
            score.textContent =
                `${Number(item.score) || 0}/${Number(item.totalQuestions) || 0}`;

            const resultLink = document.createElement("a");
            resultLink.className = "recent-activity-link";
            resultLink.textContent = "View Result";
            resultLink.href =
                `attempt-result.html?id=${encodeURIComponent(item.attemptId)}`;

            actions.append(score, resultLink);
            row.append(main, actions);
            container.appendChild(row);
        });
    }

    function renderStats(data) {
        setText(
            elements.questionsAttempted,
            Math.max(0, Number(data?.questionsAttempted) || 0)
        );
        setText(
            elements.practiceSetsAttempted,
            Math.max(0, Number(data?.practiceSetsAttempted) || 0)
        );

        const status =
            data?.accountStatus === "Disabled" ? "Disabled" : "Active";

        setText(elements.accountStatus, status);

        if (elements.accountStatus) {
            elements.accountStatus.classList.toggle(
                "active",
                status === "Active"
            );
            elements.accountStatus.classList.toggle(
                "disabled",
                status === "Disabled"
            );
        }

        renderDifficulty(data?.difficulty);
        renderRecentActivity(data?.recentActivity);
    }

    function fillProfileForm() {
        const profile = currentProfileData?.profile || {};

        elements.profileNameInput.value = profile.name || "";
        elements.profileBioInput.value = profile.bio || "";
        elements.profileSkillsInput.value =
            Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
        elements.profileEducationInput.value =
            Array.isArray(profile.education)
                ? profile.education.join("\n")
                : "";
        elements.profileExperienceInput.value =
            Array.isArray(profile.experience)
                ? profile.experience.join("\n")
                : "";
        elements.profileProjectsInput.value =
            Array.isArray(profile.projects)
                ? profile.projects.join("\n")
                : "";
        elements.profileGithubInput.value = profile.githubUrl || "";
        elements.profileLinkedinInput.value = profile.linkedinUrl || "";
        elements.profilePortfolioInput.value = profile.portfolioUrl || "";
        elements.profileResumeInput.value = profile.resumeUrl || "";
        elements.profilePublicInput.checked = profile.isPublic !== false;
    }

    function openProfileModal() {
        if (!elements.profileModal) {
            return;
        }

        fillProfileForm();
        elements.profileFormMessage.textContent = "";
        elements.profileFormMessage.className = "profile-form-message";

        elements.profileModal.classList.add("open");
        elements.profileModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("profile-modal-open");

        setTimeout(() => {
            elements.profileNameInput?.focus();
        }, 0);
    }

    function closeProfileModal() {
        if (!elements.profileModal) {
            return;
        }

        elements.profileModal.classList.remove("open");
        elements.profileModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("profile-modal-open");
    }

    function parseCommaList(value) {
        return String(value || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function parseLineList(value) {
        return String(value || "")
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    async function saveProfile(event) {
        event.preventDefault();

        elements.profileFormMessage.textContent = "";
        elements.profileFormMessage.className = "profile-form-message";
        elements.saveProfileBtn.disabled = true;
        elements.saveProfileBtn.textContent = "Saving...";

        const payload = {
            name: elements.profileNameInput.value.trim(),
            bio: elements.profileBioInput.value.trim(),
            skills: parseCommaList(elements.profileSkillsInput.value),
            education: parseLineList(elements.profileEducationInput.value),
            experience: parseLineList(elements.profileExperienceInput.value),
            projects: parseLineList(elements.profileProjectsInput.value),
            githubUrl: elements.profileGithubInput.value.trim(),
            linkedinUrl: elements.profileLinkedinInput.value.trim(),
            portfolioUrl: elements.profilePortfolioInput.value.trim(),
            resumeUrl: elements.profileResumeInput.value.trim(),
            isPublic: elements.profilePublicInput.checked
        };

        try {
            const updatedProfile = await apiRequest("/users/me/profile", {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            currentProfileData = {
                ...currentProfileData,
                profile: updatedProfile.profile || updatedProfile
            };

            renderProfile(currentProfileData);

            elements.profileFormMessage.textContent = "Profile saved.";
            elements.profileFormMessage.className =
                "profile-form-message success";

            setTimeout(closeProfileModal, 500);
        } catch (error) {
            if (error.message === "Authentication required") {
                return;
            }

            elements.profileFormMessage.textContent =
                error.message || "Failed to save profile.";
            elements.profileFormMessage.className =
                "profile-form-message error";
        } finally {
            elements.saveProfileBtn.disabled = false;
            elements.saveProfileBtn.textContent = "Save Profile";
        }
    }

    async function loadDashboard() {
        try {
            const [profileData, statsData] = await Promise.all([
                apiRequest("/users/me/profile"),
                apiRequest("/attempts/dashboard/stats")
            ]);

            currentProfileData = profileData;
            renderProfile(profileData);
            renderStats(statsData);
        } catch (error) {
            if (error.message === "Authentication required") {
                return;
            }

            console.error("Failed to load dashboard:", error);

            if (elements.recentActivityList) {
                elements.recentActivityList.replaceChildren();

                const message = document.createElement("p");
                message.className = "dashboard-empty";
                message.textContent =
                    "Dashboard data could not be loaded. Please refresh and try again.";

                elements.recentActivityList.appendChild(message);
            }
        }
    }

    elements.editProfileBtn?.addEventListener("click", openProfileModal);
    elements.closeProfileModal?.addEventListener("click", closeProfileModal);
    elements.cancelProfileBtn?.addEventListener("click", closeProfileModal);
    elements.profileForm?.addEventListener("submit", saveProfile);

    elements.profileModal
        ?.querySelector("[data-close-profile-modal]")
        ?.addEventListener("click", closeProfileModal);

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            elements.profileModal?.classList.contains("open")
        ) {
            closeProfileModal();
        }
    });

    loadDashboard();
});

