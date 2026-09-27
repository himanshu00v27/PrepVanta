(function () {
  const userData = localStorage.getItem("prepvanta-user");

  let user = null;

  try {
    user = JSON.parse(userData);
  } catch (error) {
    user = null;
  }

  // Frontend admin check
  if (!user || user.role !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  const token = localStorage.getItem("prepvanta-token");
  const status = document.getElementById("adminStatus");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Backend admin authorization check
  fetch("http://localhost:5000/api/admin/protected", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Admin authorization failed.");
      }

      status.textContent = "Administrator authorization confirmed.";
    })
    .catch((error) => {
      console.error("Admin authorization error:", error);

      status.textContent = error.message || "Admin authorization failed.";

      if (
        error.message === "Admin access required" ||
        error.message === "User account not found" ||
        error.message === "Account is deactivated"
      ) {
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1500);
      }
    });
  /* ===================================
     USER MANAGEMENT
  =================================== */

  const adminUserSearch = document.getElementById("adminUserSearch");
  const adminUsersList = document.getElementById("adminUsersList");
  const adminUserCount = document.getElementById("adminUserCount");

  let userSearchTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showUsersState(icon, message) {
    adminUsersList.innerHTML = `
      <div class="admin-users-state">
        <i class="fa-solid ${icon}"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderUsers(users) {
    adminUserCount.textContent = `${users.length} ${users.length === 1 ? "user" : "users"}`;

    if (!users.length) {
      showUsersState("fa-user-slash", "No users found.");
      return;
    }

    adminUsersList.innerHTML = users
      .map((account) => {
        const active = account.isActive !== false;

        const role = account.role === "admin" ? "Admin" : "User";

        const initials = String(account.fullName || account.username || "U")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part.charAt(0).toUpperCase())
          .join("");

        return `
          <div class="admin-user-row">

            <div class="admin-user-avatar">
              ${escapeHtml(initials || "U")}
            </div>

            <div class="admin-user-info">

              <div class="admin-user-name">
                ${escapeHtml(account.fullName || "Unnamed User")}
              </div>

              <div class="admin-user-meta">
                @${escapeHtml(account.username || "")}
                <span>•</span>
                ${escapeHtml(account.userId || "")}
              </div>

              <div class="admin-user-email">
                ${escapeHtml(account.email || "")}
              </div>

            </div>

            <div class="admin-user-badges">

              <span class="admin-role-badge">
                ${escapeHtml(role)}
              </span>

              <span class="admin-status-badge ${
                active ? "active" : "inactive"
              }">
                ${active ? "Active" : "Deactivated"}
              </span>

            </div>

            <button
              type="button"
              class="admin-user-action ${active ? "deactivate" : "activate"}"
              data-user-id="${escapeHtml(account._id)}"
              data-active="${active}"
            >
              <i class="fa-solid ${
                active ? "fa-user-slash" : "fa-user-check"
              }"></i>

              ${active ? "Deactivate" : "Activate"}
            </button>

          </div>
        `;
      })
      .join("");
  }

  async function loadAdminUsers(query = "") {
    try {
      showUsersState("fa-spinner fa-spin", "Loading users...");

      const params = new URLSearchParams();

      if (query.trim()) {
        params.set("q", query.trim());
      }

      const url =
        "http://localhost:5000/api/admin/users" +
        (params.toString() ? `?${params.toString()}` : "");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to load users.");
      }

      renderUsers(data.users || []);
    } catch (error) {
      console.error("Admin users error:", error);

      adminUserCount.textContent = "0 users";

      showUsersState(
        "fa-circle-exclamation",
        error.message || "Failed to load users.",
      );
    }
  }

  async function updateUserStatus(userId, isActive, button) {
    const originalHtml = button.innerHTML;

    try {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      const response = await fetch(
        `http://localhost:5000/api/admin/users/${encodeURIComponent(userId)}/status`,
        {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            isActive,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update user status.");
      }

      await loadAdminUsers(adminUserSearch.value);
    } catch (error) {
      console.error("User status update error:", error);

      button.disabled = false;
      button.innerHTML = originalHtml;

      alert(error.message || "Failed to update user status.");
    }
  }

  adminUserSearch.addEventListener("input", () => {
    clearTimeout(userSearchTimer);

    userSearchTimer = setTimeout(() => {
      loadAdminUsers(adminUserSearch.value);
    }, 300);
  });

  adminUsersList.addEventListener("click", (event) => {
    const button = event.target.closest(".admin-user-action");

    if (!button) {
      return;
    }

    const userId = button.dataset.userId;
    const currentlyActive = button.dataset.active === "true";

    const action = currentlyActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this user account?`,
    );

    if (!confirmed) {
      return;
    }

    updateUserStatus(userId, !currentlyActive, button);
  });

  loadAdminUsers();
})();
