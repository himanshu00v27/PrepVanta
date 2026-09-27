/* ===================================
   PREPVANTA USER SEARCH
=================================== */

const USER_API = "http://localhost:5000/api/users";

const userSearchInput = document.getElementById("userSearchInput");
const userResults = document.getElementById("userResults");

let searchTimer = null;

/* ===================================
   AUTH HEADERS
=================================== */

function getAuthHeaders() {
  const token = localStorage.getItem("prepvanta-token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

/* ===================================
   ESCAPE HTML
=================================== */

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ===================================
   USER INITIALS
=================================== */

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "U";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/* ===================================
   SEARCH STATE
=================================== */

function showSearchState(message, icon = "fa-magnifying-glass") {
  userResults.innerHTML = `
    <div class="user-search-state">
      <i class="fa-solid ${icon}"></i>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

/* ===================================
   RENDER USERS
=================================== */

function renderUsers(users) {
  if (!users.length) {
    showSearchState("No PrepVanta users matched your search.", "fa-user-slash");

    return;
  }

  userResults.innerHTML = users
    .map((user) => {
      const displayName = user.name || user.fullName;
      const skills = Array.isArray(user.skills) ? user.skills.slice(0, 3) : [];

      return `
        <button
          type="button"
          class="user-result"
          data-user-id="${escapeHtml(user.userId)}"
        >
          <span class="avatar">
            ${escapeHtml(getInitials(displayName))}
          </span>

          <span class="user-result-info">
            <span class="u-name">
              ${escapeHtml(displayName)}
            </span>

            <span class="u-meta">
              @${escapeHtml(user.username)}
              &middot;
              ${escapeHtml(user.userId)}
            </span>

            ${
              user.bio
                ? `
                  <span class="u-bio">
                    ${escapeHtml(user.bio)}
                  </span>
                `
                : ""
            }

            ${
              skills.length
                ? `
                  <span class="u-skills">
                    ${skills
                      .map((skill) => `<span>${escapeHtml(skill)}</span>`)
                      .join("")}
                  </span>
                `
                : ""
            }
          </span>
        </button>
      `;
    })
    .join("");
}

/* ===================================
   SEARCH USERS
=================================== */

async function searchUsers(query) {
  try {
    showSearchState("Searching users...", "fa-spinner fa-spin");

    const response = await fetch(
      `${USER_API}/search?q=${encodeURIComponent(query)}`,
      {
        headers: getAuthHeaders(),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to search users");
    }

    renderUsers(data);
  } catch (error) {
    console.error("User search error:", error);

    showSearchState(
      error.message || "Unable to search users.",
      "fa-circle-exclamation",
    );
  }
}

/* ===================================
   SEARCH INPUT
=================================== */

userSearchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  const query = userSearchInput.value.trim();

  if (!query) {
    showSearchState(
      "Search for a PrepVanta user by name, username, or user ID.",
    );

    return;
  }

  if (query.length < 2) {
    showSearchState("Enter at least 2 characters to search.");

    return;
  }

  searchTimer = setTimeout(() => {
    searchUsers(query);
  }, 300);
});
/* ===================================
   USER PROFILE MODAL
=================================== */

const userProfileModal = document.getElementById("userProfileModal");

const userProfileContent = document.getElementById("userProfileContent");

const userProfileClose = document.getElementById("userProfileClose");

const userProfileBackdrop = document.getElementById("userProfileBackdrop");

/* ===================================
   OPEN USER PROFILE
=================================== */

async function openUserProfile(userId) {
  userProfileModal.hidden = false;

  document.body.style.overflow = "hidden";

  userProfileContent.innerHTML = `
    <div class="user-profile-loading">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Loading profile...</p>
    </div>
  `;

  try {
    const response = await fetch(`${USER_API}/${encodeURIComponent(userId)}`, {
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load user profile");
    }

    console.log("Loaded user profile:", data);

    const user = data.user;
    const profile = data.profile;

    const displayName = profile.name || user.fullName;

    const skills = Array.isArray(profile.skills) ? profile.skills : [];

    const education = Array.isArray(profile.education) ? profile.education : [];

    const experience = Array.isArray(profile.experience)
      ? profile.experience
      : [];

    const projects = Array.isArray(profile.projects) ? profile.projects : [];

    userProfileContent.innerHTML = `
  <div class="profile-header">

    <div class="profile-avatar">
      ${escapeHtml(getInitials(displayName))}
    </div>

    <div class="profile-identity">

      <h2>
        ${escapeHtml(displayName)}
      </h2>

      <p class="profile-username">
        @${escapeHtml(user.username)}
      </p>

      <span class="profile-user-id">
        ${escapeHtml(user.userId)}
      </span>

    </div>

  </div>

  <div class="profile-section">

    <h3>
      <i class="fa-regular fa-user"></i>
      About
    </h3>

    <p class="profile-bio">
      ${profile.bio ? escapeHtml(profile.bio) : "No bio added yet."}
    </p>

  </div>

  <div class="profile-section">

    <h3>
      <i class="fa-solid fa-code"></i>
      Skills
    </h3>

    ${
      skills.length
        ? `
          <div class="profile-tags">
            ${skills
              .map((skill) => `<span>${escapeHtml(skill)}</span>`)
              .join("")}
          </div>
        `
        : `<p class="profile-empty">No skills added yet.</p>`
    }

  </div>

  <div class="profile-section">

    <h3>
      <i class="fa-solid fa-graduation-cap"></i>
      Education
    </h3>

    ${
      education.length
        ? `
          <ul class="profile-list">
            ${education.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        `
        : `<p class="profile-empty">No education details added yet.</p>`
    }

  </div>

  <div class="profile-section">

    <h3>
      <i class="fa-solid fa-briefcase"></i>
      Experience
    </h3>

    ${
      experience.length
        ? `
          <ul class="profile-list">
            ${experience.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        `
        : `<p class="profile-empty">No experience added yet.</p>`
    }

  </div>

  <div class="profile-section">

    <h3>
      <i class="fa-solid fa-diagram-project"></i>
      Projects
    </h3>

    ${
      projects.length
        ? `
          <ul class="profile-list">
            ${projects.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        `
        : `<p class="profile-empty">No projects added yet.</p>`
    }

  </div>

  ${
    profile.githubUrl ||
    profile.linkedinUrl ||
    profile.portfolioUrl ||
    profile.resumeUrl
      ? `
        <div class="profile-section">

          <h3>
            <i class="fa-solid fa-link"></i>
            Links
          </h3>

          <div class="profile-links">

            ${
              profile.githubUrl
                ? `
                  <a
                    href="${escapeHtml(profile.githubUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i class="fa-brands fa-github"></i>
                    GitHub
                  </a>
                `
                : ""
            }

            ${
              profile.linkedinUrl
                ? `
                  <a
                    href="${escapeHtml(profile.linkedinUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i class="fa-brands fa-linkedin"></i>
                    LinkedIn
                  </a>
                `
                : ""
            }

            ${
              profile.portfolioUrl
                ? `
                  <a
                    href="${escapeHtml(profile.portfolioUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i class="fa-solid fa-globe"></i>
                    Portfolio
                  </a>
                `
                : ""
            }

            ${
              profile.resumeUrl
                ? `
                  <a
                    href="${escapeHtml(profile.resumeUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i class="fa-regular fa-file-lines"></i>
                    Resume
                  </a>
                `
                : ""
            }

          </div>

        </div>
      `
      : ""
  }
`;
  } catch (error) {
    console.error("Profile loading error:", error);

    userProfileContent.innerHTML = `
      <div class="user-profile-loading">
        <i class="fa-solid fa-circle-exclamation"></i>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/* ===================================
   CLOSE USER PROFILE
=================================== */

function closeUserProfile() {
  userProfileModal.hidden = true;

  document.body.style.overflow = "";
}

userProfileClose.addEventListener("click", closeUserProfile);

userProfileBackdrop.addEventListener("click", closeUserProfile);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !userProfileModal.hidden) {
    closeUserProfile();
  }
});
/* ===================================
   USER RESULT CLICK
=================================== */

userResults.addEventListener("click", (event) => {
  const userCard = event.target.closest(".user-result");

  if (!userCard) {
    return;
  }

  const userId = userCard.dataset.userId;

  if (userId) {
    openUserProfile(userId);
  }
});
