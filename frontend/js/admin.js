(function () {
  /* ===================================
       ADMIN SESSION
    =================================== */

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

  /* ===================================
       BACKEND ADMIN AUTHORIZATION
    =================================== */

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

      if (status) {
        status.textContent = "Administrator authorization confirmed.";
      }
    })
    .catch((error) => {
      console.error("Admin authorization error:", error);

      if (status) {
        status.textContent = error.message || "Admin authorization failed.";
      }

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

  /* ===================================
       ESCAPE HTML
    =================================== */

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ===================================
       USER LIST STATE
    =================================== */

  function showUsersState(icon, message) {
    if (!adminUsersList) {
      return;
    }

    adminUsersList.innerHTML = `
            <div class="admin-users-state">
                <i class="fa-solid ${icon}"></i>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
  }

  /* ===================================
       RENDER USERS
    =================================== */

  function renderUsers(users) {
    if (!adminUsersList || !adminUserCount) {
      return;
    }

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
                                ${escapeHtml(
                                  account.fullName || "Unnamed User",
                                )}
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

                            <span
                                class="admin-status-badge ${
                                  active ? "active" : "inactive"
                                }"
                            >
                                ${active ? "Active" : "Deactivated"}
                            </span>

                        </div>

                        <button
                            type="button"
                            class="admin-user-action ${
                              active ? "deactivate" : "activate"
                            }"
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

  /* ===================================
       LOAD ADMIN USERS
    =================================== */

  async function loadAdminUsers(query = "") {
    if (!adminUsersList) {
      return;
    }

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

      if (adminUserCount) {
        adminUserCount.textContent = "0 users";
      }

      showUsersState(
        "fa-circle-exclamation",
        error.message || "Failed to load users.",
      );
    }
  }

  /* ===================================
       UPDATE USER STATUS
    =================================== */

  async function updateUserStatus(userId, isActive, button) {
    const originalHtml = button.innerHTML;

    try {
      button.disabled = true;

      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      const response = await fetch(
        `http://localhost:5000/api/admin/users/${encodeURIComponent(
          userId,
        )}/status`,
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

      await loadAdminUsers(adminUserSearch ? adminUserSearch.value : "");
    } catch (error) {
      console.error("User status update error:", error);

      button.disabled = false;
      button.innerHTML = originalHtml;

      alert(error.message || "Failed to update user status.");
    }
  }

  /* ===================================
       USER SEARCH EVENT
    =================================== */

  if (adminUserSearch) {
    adminUserSearch.addEventListener("input", () => {
      clearTimeout(userSearchTimer);

      userSearchTimer = setTimeout(() => {
        loadAdminUsers(adminUserSearch.value);
      }, 300);
    });
  }

  /* ===================================
       USER ACTION EVENT
    =================================== */

  if (adminUsersList) {
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
  }

  /* ===================================
       PLATFORM SETTINGS ELEMENTS
    =================================== */

  const settingsElements = {
    maintenanceMode: document.getElementById("maintenanceMode"),

    registrationEnabled: document.getElementById("registrationEnabled"),

    compilerEnabled: document.getElementById("compilerEnabled"),

    supportEnabled: document.getElementById("supportEnabled"),

    userSearchEnabled: document.getElementById("userSearchEnabled"),

    announcementEnabled: document.getElementById("announcementEnabled"),

    announcementMessage: document.getElementById("announcementMessage"),
  };

  const saveSettingsBtn = document.getElementById("saveSettingsBtn");

  const settingsSaveStatus = document.getElementById("settingsSaveStatus");

  const announcementCharacterCount = document.getElementById(
    "announcementCharacterCount",
  );
  const settingsModal = document.getElementById("settingsModal");

  const settingsModalBox = settingsModal
    ? settingsModal.querySelector(".settings-modal")
    : null;

  const settingsModalIcon = document.getElementById("settingsModalIcon");

  const settingsModalTitle = document.getElementById("settingsModalTitle");

  const settingsModalMessage = document.getElementById("settingsModalMessage");

  const settingsModalButton = document.getElementById("settingsModalButton");

  let settingsModalTimer = null;

  function hideSettingsModal() {
    if (!settingsModal) {
      return;
    }

    settingsModal.hidden = true;

    clearTimeout(settingsModalTimer);
  }

  function showSettingsModal(type, title, message) {
    if (
      !settingsModal ||
      !settingsModalBox ||
      !settingsModalIcon ||
      !settingsModalTitle ||
      !settingsModalMessage
    ) {
      return;
    }

    clearTimeout(settingsModalTimer);

    settingsModalBox.classList.remove("success", "error");

    settingsModalBox.classList.add(type);

    settingsModalIcon.innerHTML =
      type === "success"
        ? '<i class="fa-solid fa-check"></i>'
        : '<i class="fa-solid fa-xmark"></i>';

    settingsModalTitle.textContent = title;
    settingsModalMessage.textContent = message;

    settingsModal.hidden = false;

    if (type === "success") {
      settingsModalTimer = setTimeout(() => {
        hideSettingsModal();
      }, 2200);
    }
  }

  if (settingsModalButton) {
    settingsModalButton.addEventListener("click", hideSettingsModal);
  }

  if (settingsModal) {
    settingsModal.addEventListener("click", (event) => {
      if (event.target === settingsModal) {
        hideSettingsModal();
      }
    });
  }

  /* ===================================
       SETTINGS STATUS
    =================================== */

  function setSettingsStatus(message = "", type = "") {
    if (!settingsSaveStatus) {
      return;
    }

    settingsSaveStatus.textContent = message;

    settingsSaveStatus.classList.remove("success", "error");

    if (type) {
      settingsSaveStatus.classList.add(type);
    }
  }

  /* ===================================
       ANNOUNCEMENT CHARACTER COUNT
    =================================== */

  function updateAnnouncementCharacterCount() {
    if (!settingsElements.announcementMessage || !announcementCharacterCount) {
      return;
    }

    const length = settingsElements.announcementMessage.value.length;

    announcementCharacterCount.textContent = `${length} / 500`;
  }

  /* ===================================
       ENABLE / DISABLE SETTINGS UI
    =================================== */

  function setSettingsDisabled(disabled) {
    Object.values(settingsElements).forEach((element) => {
      if (element) {
        element.disabled = disabled;
      }
    });

    if (saveSettingsBtn) {
      saveSettingsBtn.disabled = disabled;
    }
  }

  /* ===================================
       LOAD PLATFORM SETTINGS
    =================================== */

  async function loadPlatformSettings() {
    try {
      setSettingsDisabled(true);

      setSettingsStatus("Loading settings...");

      const response = await fetch("http://localhost:5000/api/settings", {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load platform settings.");
      }

      const settingsMap = {};

      if (Array.isArray(data.settings)) {
        data.settings.forEach((setting) => {
          settingsMap[setting.key] = setting.value;
        });
      }

      if (settingsElements.maintenanceMode) {
        settingsElements.maintenanceMode.checked = Boolean(
          settingsMap.maintenanceMode,
        );
      }

      if (settingsElements.registrationEnabled) {
        settingsElements.registrationEnabled.checked = Boolean(
          settingsMap.registrationEnabled,
        );
      }

      if (settingsElements.compilerEnabled) {
        settingsElements.compilerEnabled.checked = Boolean(
          settingsMap.compilerEnabled,
        );
      }

      if (settingsElements.supportEnabled) {
        settingsElements.supportEnabled.checked = Boolean(
          settingsMap.supportEnabled,
        );
      }

      if (settingsElements.userSearchEnabled) {
        settingsElements.userSearchEnabled.checked = Boolean(
          settingsMap.userSearchEnabled,
        );
      }

      if (settingsElements.announcementEnabled) {
        settingsElements.announcementEnabled.checked = Boolean(
          settingsMap.announcementEnabled,
        );
      }

      if (settingsElements.announcementMessage) {
        settingsElements.announcementMessage.value =
          settingsMap.announcementMessage || "";
      }

      updateAnnouncementCharacterCount();

      setSettingsStatus("");
    } catch (error) {
      console.error("Load platform settings error:", error);

      setSettingsStatus(error.message || "Unable to load settings.", "error");
    } finally {
      setSettingsDisabled(false);
    }
  }

  /* ===================================
       SAVE PLATFORM SETTINGS
    =================================== */

  async function savePlatformSettings() {
    if (
      !settingsElements.maintenanceMode ||
      !settingsElements.registrationEnabled ||
      !settingsElements.compilerEnabled ||
      !settingsElements.supportEnabled ||
      !settingsElements.userSearchEnabled ||
      !settingsElements.announcementEnabled ||
      !settingsElements.announcementMessage
    ) {
      setSettingsStatus(
        "Platform settings controls could not be found.",
        "error",
      );

      return;
    }

    const announcementMessage =
      settingsElements.announcementMessage.value.trim();

    /*
     * Announcement cannot be enabled
     * without a message.
     */
    if (settingsElements.announcementEnabled.checked && !announcementMessage) {
      setSettingsStatus(
        "Enter an announcement message before enabling it.",
        "error",
      );

      settingsElements.announcementMessage.focus();

      return;
    }

    const settings = {
      maintenanceMode: settingsElements.maintenanceMode.checked,

      registrationEnabled: settingsElements.registrationEnabled.checked,

      compilerEnabled: settingsElements.compilerEnabled.checked,

      supportEnabled: settingsElements.supportEnabled.checked,

      userSearchEnabled: settingsElements.userSearchEnabled.checked,

      announcementEnabled: settingsElements.announcementEnabled.checked,

      announcementMessage,
    };

    try {
      setSettingsDisabled(true);

      setSettingsStatus("Saving settings...");

      const response = await fetch("http://localhost:5000/api/settings", {
        method: "PATCH",

        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify(settings),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to save platform settings.");
      }

      setSettingsStatus("");

      showSettingsModal(
        "success",
        "Settings saved successfully!",
        "Your platform settings have been updated.",
      );
    } catch (error) {
      console.error("Save platform settings error:", error);

      setSettingsStatus("");

      showSettingsModal(
        "error",
        "Unable to save settings",
        error.message ||
          "Something went wrong while updating the platform settings.",
      );
    } finally {
      setSettingsDisabled(false);
    }
  }

  /* ===================================
       PLATFORM SETTINGS EVENTS
    =================================== */

  if (settingsElements.announcementMessage) {
    settingsElements.announcementMessage.addEventListener(
      "input",
      updateAnnouncementCharacterCount,
    );
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", savePlatformSettings);
  }

  /* ===================================
       INITIAL LOAD
    =================================== */

  loadAdminUsers();

  loadPlatformSettings();
})();
