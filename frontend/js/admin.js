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
     ADMIN DASHBOARD ELEMENTS
  =================================== */

  const adminStatsGrid = document.getElementById("adminStatsGrid");

  const adminDashboardRefresh = document.getElementById(
    "adminDashboardRefresh",
  );

  const dashboardTotalUsers = document.getElementById("dashboardTotalUsers");

  const dashboardActiveUsers = document.getElementById("dashboardActiveUsers");

  const dashboardTotalCompanies = document.getElementById(
    "dashboardTotalCompanies",
  );

  const dashboardPublishedCompanies = document.getElementById(
    "dashboardPublishedCompanies",
  );

  const dashboardTotalTickets = document.getElementById(
    "dashboardTotalTickets",
  );

  const dashboardOpenTickets = document.getElementById("dashboardOpenTickets");

  const dashboardCompilerRuns = document.getElementById(
    "dashboardCompilerRuns",
  );

  const dashboardSuccessfulRuns = document.getElementById(
    "dashboardSuccessfulRuns",
  );

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

              <span
                class="admin-status-badge ${active ? "active" : "inactive"}"
              >
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

      // User administration creates an audit record.
      await loadAuditLogs();
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

      // Setting updates are audited.
      await loadAuditLogs();
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
     COMPANY MANAGEMENT
  =================================== */

  const adminCompanyAddBtn = document.getElementById("adminCompanyAddBtn");
  const adminCompanySearch = document.getElementById("adminCompanySearch");
  const adminCompanyStatusFilter = document.getElementById(
    "adminCompanyStatusFilter",
  );
  const adminCompanyCount = document.getElementById("adminCompanyCount");
  const adminCompanyList = document.getElementById("adminCompanyList");

  const adminCompanyModal = document.getElementById("adminCompanyModal");
  const adminCompanyModalTitle = document.getElementById(
    "adminCompanyModalTitle",
  );
  const adminCompanyModalClose = document.getElementById(
    "adminCompanyModalClose",
  );

  const adminCompanyForm = document.getElementById("adminCompanyForm");
  const adminCompanyMongoId = document.getElementById("adminCompanyMongoId");
  const adminCompanyName = document.getElementById("adminCompanyName");
  const adminCompanySlug = document.getElementById("adminCompanySlug");
  const adminCompanyIndustry = document.getElementById("adminCompanyIndustry");
  const adminCompanyDifficulty = document.getElementById(
    "adminCompanyDifficulty",
  );
  const adminCompanyWebsite = document.getElementById("adminCompanyWebsite");
  const adminCompanyPracticeLink = document.getElementById(
    "adminCompanyPracticeLink",
  );
  const adminCompanyStatus = document.getElementById("adminCompanyStatus");
  const adminCompanyFocusTopics = document.getElementById(
    "adminCompanyFocusTopics",
  );

  const adminCompanyFormStatus = document.getElementById(
    "adminCompanyFormStatus",
  );
  const adminCompanyCancelBtn = document.getElementById(
    "adminCompanyCancelBtn",
  );
  const adminCompanySaveBtn = document.getElementById("adminCompanySaveBtn");
  const adminCompanySaveText = document.getElementById("adminCompanySaveText");

  let adminCompanies = [];
  let companySearchTimer = null;

  /* ===================================
     COMPANY LIST STATE
  =================================== */

  function showCompanyState(icon, message) {
    if (!adminCompanyList) {
      return;
    }

    adminCompanyList.innerHTML = `
      <div class="admin-company-state">
        <i class="fa-solid ${icon}"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  /* ===================================
     COMPANY FORM STATUS
  =================================== */

  function setCompanyFormStatus(message = "", type = "") {
    if (!adminCompanyFormStatus) {
      return;
    }

    adminCompanyFormStatus.textContent = message;
    adminCompanyFormStatus.classList.remove("success", "error");

    if (type) {
      adminCompanyFormStatus.classList.add(type);
    }
  }

  /* ===================================
     NORMALIZE COMPANY SLUG
  =================================== */

  function createCompanySlug(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /* ===================================
     RENDER COMPANIES
  =================================== */

  function renderCompanies(companies) {
    if (!adminCompanyList || !adminCompanyCount) {
      return;
    }

    adminCompanyCount.textContent = `${companies.length} ${
      companies.length === 1 ? "company" : "companies"
    }`;

    if (!companies.length) {
      showCompanyState("fa-building-circle-xmark", "No companies found.");
      return;
    }

    adminCompanyList.innerHTML = companies
      .map((company) => {
        const status = company.status === "published" ? "published" : "draft";

        const statusLabel = status === "published" ? "Published" : "Draft";

        const topics = Array.isArray(company.focusTopics)
          ? company.focusTopics
          : [];

        const topicsHtml = topics.length
          ? topics
              .slice(0, 5)
              .map(
                (topic) =>
                  `<span class="admin-company-topic">${escapeHtml(topic)}</span>`,
              )
              .join("")
          : `<span class="admin-company-topic empty">No focus topics</span>`;

        return `
          <div
            class="admin-company-row"
            data-company-id="${escapeHtml(company._id || "")}"
          >

            <div class="admin-company-main">

              <div class="admin-company-icon">
                <i class="fa-solid fa-building"></i>
              </div>

              <div class="admin-company-info">

                <div class="admin-company-name">
                  ${escapeHtml(company.name || "Unnamed Company")}
                </div>

                <div class="admin-company-meta">

                  ${
                    company.industry
                      ? `<span>
                           <i class="fa-solid fa-briefcase"></i>
                           ${escapeHtml(company.industry)}
                         </span>`
                      : ""
                  }

                  ${
                    company.difficulty
                      ? `<span>
                           <i class="fa-solid fa-signal"></i>
                           ${escapeHtml(company.difficulty)}
                         </span>`
                      : ""
                  }

                  <span>
                    <i class="fa-solid fa-link"></i>
                    ${escapeHtml(company.slug || "")}
                  </span>

                </div>

                <div class="admin-company-topics">
                  ${topicsHtml}
                </div>

              </div>

            </div>

            <div class="admin-company-side">

              <span class="admin-company-status ${status}">
                ${statusLabel}
              </span>

              <div class="admin-company-actions">

                <button
                  type="button"
                  class="admin-company-action edit"
                  data-company-action="edit"
                  data-company-id="${escapeHtml(company._id || "")}"
                >
                  <i class="fa-solid fa-pen"></i>
                  Edit
                </button>

                <button
                  type="button"
                  class="admin-company-action ${
                    status === "published" ? "unpublish" : "publish"
                  }"
                  data-company-action="toggle-status"
                  data-company-id="${escapeHtml(company._id || "")}"
                >
                  <i class="fa-solid ${
                    status === "published" ? "fa-eye-slash" : "fa-eye"
                  }"></i>

                  ${status === "published" ? "Unpublish" : "Publish"}
                </button>

                <button
                  type="button"
                  class="admin-company-action delete"
                  data-company-action="delete"
                  data-company-id="${escapeHtml(company._id || "")}"
                >
                  <i class="fa-solid fa-trash"></i>
                  Delete
                </button>

              </div>

            </div>

          </div>
        `;
      })
      .join("");
  }

  /* ===================================
     FILTER COMPANIES CLIENT SIDE
  =================================== */

  function applyCompanyFilters() {
    const search = String(adminCompanySearch?.value || "")
      .trim()
      .toLowerCase();

    const status = String(adminCompanyStatusFilter?.value || "").trim();

    const filteredCompanies = adminCompanies.filter((company) => {
      if (status && company.status !== status) {
        return false;
      }

      if (!search) {
        return true;
      }

      const searchableText = [
        company.name,
        company.slug,
        company.industry,
        company.difficulty,
        ...(Array.isArray(company.focusTopics) ? company.focusTopics : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });

    renderCompanies(filteredCompanies);
  }

  /* ===================================
     LOAD COMPANIES
  =================================== */

  async function loadAdminCompanies() {
    if (!adminCompanyList) {
      return;
    }

    try {
      showCompanyState("fa-spinner fa-spin", "Loading companies...");

      if (adminCompanyCount) {
        adminCompanyCount.textContent = "Loading...";
      }

      const response = await fetch(
        "http://localhost:5000/api/companies/admin/all",
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(data.message || "Failed to load companies.");
      }

      adminCompanies = Array.isArray(data) ? data : [];

      applyCompanyFilters();
    } catch (error) {
      console.error("Load companies error:", error);

      adminCompanies = [];

      if (adminCompanyCount) {
        adminCompanyCount.textContent = "0 companies";
      }

      showCompanyState(
        "fa-circle-exclamation",
        error.message || "Failed to load companies.",
      );
    }
  }

  /* ===================================
     OPEN COMPANY MODAL
  =================================== */

  function openCompanyModal(company = null) {
    if (!adminCompanyModal || !adminCompanyForm) {
      return;
    }

    adminCompanyForm.reset();

    setCompanyFormStatus("");

    if (company) {
      adminCompanyModalTitle.textContent = "Edit Company";
      adminCompanySaveText.textContent = "Save Changes";

      adminCompanyMongoId.value = company._id || "";
      adminCompanyName.value = company.name || "";
      adminCompanySlug.value = company.slug || "";
      adminCompanyIndustry.value = company.industry || "";
      adminCompanyDifficulty.value = company.difficulty || "";
      adminCompanyWebsite.value = company.website || "";
      adminCompanyPracticeLink.value = company.practiceLink || "";
      adminCompanyStatus.value = company.status || "draft";

      adminCompanyFocusTopics.value = Array.isArray(company.focusTopics)
        ? company.focusTopics.join(", ")
        : "";
    } else {
      adminCompanyModalTitle.textContent = "Add Company";
      adminCompanySaveText.textContent = "Create Company";

      adminCompanyMongoId.value = "";
      adminCompanyStatus.value = "draft";
    }

    adminCompanyModal.hidden = false;

    document.body.classList.add("admin-modal-open");

    setTimeout(() => {
      adminCompanyName?.focus();
    }, 50);
  }

  /* ===================================
     CLOSE COMPANY MODAL
  =================================== */

  function closeCompanyModal() {
    if (!adminCompanyModal) {
      return;
    }

    adminCompanyModal.hidden = true;

    document.body.classList.remove("admin-modal-open");

    setCompanyFormStatus("");
  }

  /* ===================================
     COMPANY SAVE BUTTON STATE
  =================================== */

  function setCompanySaving(saving) {
    if (!adminCompanySaveBtn) {
      return;
    }

    adminCompanySaveBtn.disabled = saving;

    if (adminCompanyCancelBtn) {
      adminCompanyCancelBtn.disabled = saving;
    }

    if (saving) {
      adminCompanySaveBtn.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Saving...</span>
      `;
    } else {
      const editing = Boolean(adminCompanyMongoId?.value);

      adminCompanySaveBtn.innerHTML = `
        <i class="fa-solid fa-floppy-disk"></i>
        <span id="adminCompanySaveText">
          ${editing ? "Save Changes" : "Create Company"}
        </span>
      `;
    }
  }

  /* ===================================
     SAVE COMPANY
  =================================== */

  async function saveCompany(event) {
    event.preventDefault();

    const mongoId = String(adminCompanyMongoId?.value || "").trim();

    const name = String(adminCompanyName?.value || "").trim();
    const slug = createCompanySlug(adminCompanySlug?.value);

    if (!name || !slug) {
      setCompanyFormStatus("Company name and slug are required.", "error");

      return;
    }

    const focusTopics = String(adminCompanyFocusTopics?.value || "")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean);

    const payload = {
      name,
      slug,
      industry: String(adminCompanyIndustry?.value || "").trim(),
      difficulty: String(adminCompanyDifficulty?.value || "").trim(),
      website: String(adminCompanyWebsite?.value || "").trim(),
      practiceLink: String(adminCompanyPracticeLink?.value || "").trim(),
      status: String(adminCompanyStatus?.value || "draft"),
      focusTopics,
    };

    const editing = Boolean(mongoId);

    const url = editing
      ? `http://localhost:5000/api/companies/${encodeURIComponent(mongoId)}`
      : "http://localhost:5000/api/companies";

    try {
      setCompanySaving(true);

      setCompanyFormStatus(
        editing ? "Saving company changes..." : "Creating company...",
      );

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editing
              ? "Failed to update company."
              : "Failed to create company."),
        );
      }

      closeCompanyModal();

      await loadAdminCompanies();

      await loadAdminDashboard();

      if (typeof loadAuditLogs === "function") {
        await loadAuditLogs();
      }
    } catch (error) {
      console.error("Save company error:", error);

      setCompanyFormStatus(error.message || "Failed to save company.", "error");
    } finally {
      setCompanySaving(false);
    }
  }

  /* ===================================
     CHANGE COMPANY PUBLICATION STATUS
  =================================== */

  async function toggleCompanyStatus(company) {
    if (!company?._id) {
      return;
    }

    const currentlyPublished = company.status === "published";

    const newStatus = currentlyPublished ? "draft" : "published";

    const actionLabel = currentlyPublished ? "unpublish" : "publish";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} "${company.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/companies/${encodeURIComponent(
          company._id,
        )}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${actionLabel} company.`);
      }

      await loadAdminCompanies();

      await loadAdminDashboard();

      if (typeof loadAuditLogs === "function") {
        await loadAuditLogs();
      }
    } catch (error) {
      console.error("Company status update error:", error);

      alert(error.message || `Failed to ${actionLabel} company.`);
    }
  }

  /* ===================================
     DELETE COMPANY
  =================================== */

  async function deleteCompany(company) {
    if (!company?._id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${company.name}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/companies/${encodeURIComponent(
          company._id,
        )}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete company.");
      }

      await loadAdminCompanies();

      await loadAdminDashboard();

      if (typeof loadAuditLogs === "function") {
        await loadAuditLogs();
      }
    } catch (error) {
      console.error("Delete company error:", error);

      alert(error.message || "Failed to delete company.");
    }
  }

  /* ===================================
     COMPANY EVENTS
  =================================== */

  if (adminCompanyAddBtn) {
    adminCompanyAddBtn.addEventListener("click", () => {
      openCompanyModal();
    });
  }

  if (adminCompanyModalClose) {
    adminCompanyModalClose.addEventListener("click", closeCompanyModal);
  }

  if (adminCompanyCancelBtn) {
    adminCompanyCancelBtn.addEventListener("click", closeCompanyModal);
  }

  if (adminCompanyModal) {
    adminCompanyModal.addEventListener("click", (event) => {
      if (event.target === adminCompanyModal) {
        closeCompanyModal();
      }
    });
  }

  if (adminCompanyForm) {
    adminCompanyForm.addEventListener("submit", saveCompany);
  }

  if (adminCompanyName && adminCompanySlug) {
    adminCompanyName.addEventListener("input", () => {
      /*
       * Automatically generate the slug only while creating
       * a new company. Existing slugs remain under explicit
       * administrator control while editing.
       */
      if (!adminCompanyMongoId.value) {
        adminCompanySlug.value = createCompanySlug(adminCompanyName.value);
      }
    });
  }

  if (adminCompanySlug) {
    adminCompanySlug.addEventListener("blur", () => {
      adminCompanySlug.value = createCompanySlug(adminCompanySlug.value);
    });
  }

  if (adminCompanySearch) {
    adminCompanySearch.addEventListener("input", () => {
      clearTimeout(companySearchTimer);

      companySearchTimer = setTimeout(() => {
        applyCompanyFilters();
      }, 250);
    });
  }

  if (adminCompanyStatusFilter) {
    adminCompanyStatusFilter.addEventListener("change", () => {
      applyCompanyFilters();
    });
  }

  if (adminCompanyList) {
    adminCompanyList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-company-action]");

      if (!button) {
        return;
      }

      const companyId = button.dataset.companyId;

      const company = adminCompanies.find(
        (item) => String(item._id) === String(companyId),
      );

      if (!company) {
        alert("Company could not be found. Refresh the page and try again.");
        return;
      }

      const action = button.dataset.companyAction;

      if (action === "edit") {
        openCompanyModal(company);
        return;
      }

      if (action === "toggle-status") {
        toggleCompanyStatus(company);
        return;
      }

      if (action === "delete") {
        deleteCompany(company);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      adminCompanyModal &&
      !adminCompanyModal.hidden
    ) {
      closeCompanyModal();
    }
  });

  /* ===================================
     ADMIN DASHBOARD
  =================================== */

  function setDashboardValue(element, value) {
    if (element) {
      element.textContent = String(value ?? 0);
    }
  }

  async function loadAdminDashboard() {
    if (!adminStatsGrid) {
      return;
    }

    try {
      adminStatsGrid.classList.add("loading");

      if (adminDashboardRefresh) {
        adminDashboardRefresh.disabled = true;

        adminDashboardRefresh.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing';
      }

      const response = await fetch(
        "http://localhost:5000/api/admin/dashboard",
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to load dashboard statistics.");
      }

      setDashboardValue(dashboardTotalUsers, data.users?.total);

      setDashboardValue(dashboardActiveUsers, data.users?.active);

      setDashboardValue(dashboardTotalCompanies, data.companies?.total);

      setDashboardValue(dashboardPublishedCompanies, data.companies?.published);

      setDashboardValue(dashboardTotalTickets, data.support?.total);

      setDashboardValue(dashboardOpenTickets, data.support?.open);

      setDashboardValue(dashboardCompilerRuns, data.compiler?.total);

      setDashboardValue(dashboardSuccessfulRuns, data.compiler?.successful);
    } catch (error) {
      console.error("Admin dashboard error:", error);

      setDashboardValue(dashboardTotalUsers, "--");
      setDashboardValue(dashboardActiveUsers, "--");

      setDashboardValue(dashboardTotalCompanies, "--");
      setDashboardValue(dashboardPublishedCompanies, "--");

      setDashboardValue(dashboardTotalTickets, "--");
      setDashboardValue(dashboardOpenTickets, "--");

      setDashboardValue(dashboardCompilerRuns, "--");
      setDashboardValue(dashboardSuccessfulRuns, "--");
    } finally {
      adminStatsGrid.classList.remove("loading");

      if (adminDashboardRefresh) {
        adminDashboardRefresh.disabled = false;

        adminDashboardRefresh.innerHTML =
          '<i class="fa-solid fa-rotate-right"></i> Refresh';
      }
    }
  }

  /* ===================================
     DASHBOARD REFRESH
  =================================== */

  if (adminDashboardRefresh) {
    adminDashboardRefresh.addEventListener("click", loadAdminDashboard);
  }

  /* ===================================
     AUDIT LOG ELEMENTS
  =================================== */

  const auditResultCount = document.getElementById("auditResultCount");

  const auditCategoryTabs = document.getElementById("auditCategoryTabs");

  const auditSearch = document.getElementById("auditSearch");

  const auditStatusFilter = document.getElementById("auditStatusFilter");

  const auditRoleFilter = document.getElementById("auditRoleFilter");

  const auditRefreshBtn = document.getElementById("auditRefreshBtn");

  const auditLogList = document.getElementById("auditLogList");

  const auditPreviousBtn = document.getElementById("auditPreviousBtn");

  const auditNextBtn = document.getElementById("auditNextBtn");

  const auditPageText = document.getElementById("auditPageText");

  const auditRecordRange = document.getElementById("auditRecordRange");

  /* ===================================
     AUDIT LOG STATE
  =================================== */

  const auditState = {
    page: 1,
    limit: 10,
    category: "",
    status: "",
    role: "",
    search: "",
    total: 0,
    totalPages: 1,
    loading: false,
  };

  let auditSearchTimer = null;

  /* ===================================
     AUDIT FORMATTERS
  =================================== */

  function formatAuditLabel(value) {
    if (!value) {
      return "Legacy / Uncategorised";
    }

    return String(value)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function formatAuditAction(action) {
    if (!action) {
      return "Unknown Activity";
    }

    return String(action)
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function formatAuditDate(value) {
    if (!value) {
      return "Unknown time";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }

    return date.toLocaleString();
  }

  /* ===================================
     AUDIT LOADING STATE
  =================================== */

  function setAuditLoading(loading) {
    auditState.loading = loading;

    if (auditRefreshBtn) {
      auditRefreshBtn.disabled = loading;

      auditRefreshBtn.innerHTML = loading
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing'
        : '<i class="fa-solid fa-rotate-right"></i> Refresh';
    }

    if (auditPreviousBtn) {
      auditPreviousBtn.disabled = loading || auditState.page <= 1;
    }

    if (auditNextBtn) {
      auditNextBtn.disabled =
        loading || auditState.page >= auditState.totalPages;
    }
  }

  /* ===================================
     AUDIT STATE MESSAGE
  =================================== */

  function showAuditState(icon, message) {
    if (!auditLogList) {
      return;
    }

    auditLogList.innerHTML = `
      <div class="audit-empty-state">
        <i class="fa-solid ${icon}"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  /* ===================================
     RENDER AUDIT LOGS
  =================================== */

  function renderAuditLogs(logs) {
    if (!auditLogList) {
      return;
    }

    if (!Array.isArray(logs) || logs.length === 0) {
      showAuditState(
        "fa-file-circle-xmark",
        "No audit records match the selected filters.",
      );

      return;
    }

    auditLogList.innerHTML = logs
      .map((log) => {
        const logStatus = log.status === "failure" ? "failure" : "success";

        const role =
          log.role === "admin" || log.role === "user" || log.role === "system"
            ? log.role
            : "";

        const actorName = log.username || "Unknown actor";

        const actorId = log.userId || "—";

        const targetName = log.targetName || "—";

        const targetId = log.targetId || "—";

        const targetType = log.targetType || "—";

        const details = log.details || "No additional details recorded.";

        const ipAddress = log.ipAddress || "—";

        return `
          <article class="audit-log-item audit-${logStatus}">

            <div class="audit-log-head">

              <div class="audit-log-title">

                <h4 class="audit-log-action">
                  ${escapeHtml(formatAuditAction(log.action))}
                </h4>

                <div class="audit-log-category">
                  ${escapeHtml(formatAuditLabel(log.category))}
                </div>

              </div>

              <time class="audit-log-time">
                ${escapeHtml(formatAuditDate(log.createdAt))}
              </time>

            </div>

            <div class="audit-badges">

              <span
                class="audit-badge audit-status-${logStatus}"
              >
                <i class="fa-solid ${
                  logStatus === "success"
                    ? "fa-circle-check"
                    : "fa-circle-xmark"
                }"></i>

                ${logStatus === "success" ? "Success" : "Failure"}
              </span>

              ${
                role
                  ? `
                    <span
                      class="audit-badge audit-role-${role}"
                    >
                      <i class="fa-solid ${
                        role === "admin"
                          ? "fa-user-shield"
                          : role === "system"
                            ? "fa-gears"
                            : "fa-user"
                      }"></i>

                      ${escapeHtml(formatAuditLabel(role))}
                    </span>
                  `
                  : `
                    <span class="audit-badge">
                      <i
                        class="fa-solid fa-clock-rotate-left"
                      ></i>
                      Legacy
                    </span>
                  `
              }

            </div>

            <p class="audit-log-details">
              ${escapeHtml(details)}
            </p>

            <div class="audit-log-meta">

              <div class="audit-meta-item">
                <span class="audit-meta-label">
                  Actor
                </span>

                <span class="audit-meta-value">
                  ${escapeHtml(actorName)}
                </span>
              </div>

              <div class="audit-meta-item">
                <span class="audit-meta-label">
                  Actor ID
                </span>

                <span class="audit-meta-value">
                  ${escapeHtml(actorId)}
                </span>
              </div>

              <div class="audit-meta-item">
                <span class="audit-meta-label">
                  Target
                </span>

                <span class="audit-meta-value">
                  ${escapeHtml(targetName)}
                </span>
              </div>

              <div class="audit-meta-item">
                <span class="audit-meta-label">
                  Target Type / ID
                </span>

                <span class="audit-meta-value">
                  ${escapeHtml(targetType)}
                  ${targetId !== "—" ? ` · ${escapeHtml(targetId)}` : ""}
                </span>
              </div>

              <div class="audit-meta-item">
                <span class="audit-meta-label">
                  IP Address
                </span>

                <span class="audit-meta-value">
                  ${escapeHtml(ipAddress)}
                </span>
              </div>

            </div>

          </article>
        `;
      })
      .join("");
  }

  /* ===================================
     UPDATE AUDIT PAGINATION
  =================================== */

  function updateAuditPagination(pagination = {}) {
    auditState.page = Number(pagination.page) || 1;

    auditState.limit = Number(pagination.limit) || auditState.limit;

    auditState.total = Number(pagination.total) || 0;

    auditState.totalPages = Number(pagination.totalPages) || 1;

    const totalPages = Math.max(auditState.totalPages, 1);

    if (auditPageText) {
      auditPageText.textContent = `Page ${auditState.page} of ${totalPages}`;
    }

    if (auditResultCount) {
      auditResultCount.textContent = `${auditState.total} ${
        auditState.total === 1 ? "record" : "records"
      }`;
    }

    if (auditRecordRange) {
      if (auditState.total === 0) {
        auditRecordRange.textContent = "Showing 0 records";
      } else {
        const start = (auditState.page - 1) * auditState.limit + 1;

        const end = Math.min(
          auditState.page * auditState.limit,
          auditState.total,
        );

        auditRecordRange.textContent = `Showing ${start}-${end} of ${auditState.total}`;
      }
    }

    if (auditPreviousBtn) {
      auditPreviousBtn.disabled =
        auditState.loading || !pagination.hasPreviousPage;
    }

    if (auditNextBtn) {
      auditNextBtn.disabled = auditState.loading || !pagination.hasNextPage;
    }
  }

  /* ===================================
     BUILD AUDIT QUERY
  =================================== */

  function buildAuditQuery() {
    const params = new URLSearchParams();

    params.set("page", String(auditState.page));

    params.set("limit", String(auditState.limit));

    params.set("sort", "newest");

    if (auditState.category) {
      params.set("category", auditState.category);
    }

    if (auditState.status) {
      params.set("status", auditState.status);
    }

    if (auditState.role) {
      params.set("role", auditState.role);
    }

    if (auditState.search) {
      params.set("search", auditState.search);
    }

    return params.toString();
  }

  /* ===================================
     LOAD AUDIT LOGS
  =================================== */

  async function loadAuditLogs() {
    /*
     * Audit Logs HTML may not yet exist on older
     * versions of admin.html. In that case the rest
     * of admin.js continues working normally.
     */
    if (!auditLogList) {
      return;
    }

    try {
      setAuditLoading(true);

      showAuditState("fa-spinner fa-spin", "Loading audit records...");

      const query = buildAuditQuery();

      const response = await fetch(
        `http://localhost:5000/api/admin/audit-logs?${query}`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to load audit logs.");
      }

      updateAuditPagination(data.pagination || {});

      renderAuditLogs(data.logs || []);
    } catch (error) {
      console.error("Admin audit logs error:", error);

      showAuditState(
        "fa-circle-exclamation",
        error.message || "Failed to load audit logs.",
      );

      if (auditResultCount) {
        auditResultCount.textContent = "Unable to load records";
      }
    } finally {
      setAuditLoading(false);
    }
  }

  /* ===================================
     AUDIT CATEGORY TABS
  =================================== */

  if (auditCategoryTabs) {
    auditCategoryTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-audit-category]");

      if (!button) {
        return;
      }

      auditCategoryTabs
        .querySelectorAll("[data-audit-category]")
        .forEach((tab) => {
          tab.classList.remove("active");
        });

      button.classList.add("active");

      auditState.category = button.dataset.auditCategory || "";

      auditState.page = 1;

      loadAuditLogs();
    });
  }

  /* ===================================
     AUDIT SEARCH
  =================================== */

  if (auditSearch) {
    auditSearch.addEventListener("input", () => {
      clearTimeout(auditSearchTimer);

      auditSearchTimer = setTimeout(() => {
        auditState.search = auditSearch.value.trim();

        auditState.page = 1;

        loadAuditLogs();
      }, 350);
    });
  }

  /* ===================================
     AUDIT STATUS FILTER
  =================================== */

  if (auditStatusFilter) {
    auditStatusFilter.addEventListener("change", () => {
      auditState.status = auditStatusFilter.value;

      auditState.page = 1;

      loadAuditLogs();
    });
  }

  /* ===================================
     AUDIT ROLE FILTER
  =================================== */

  if (auditRoleFilter) {
    auditRoleFilter.addEventListener("change", () => {
      auditState.role = auditRoleFilter.value;

      auditState.page = 1;

      loadAuditLogs();
    });
  }

  /* ===================================
     AUDIT REFRESH
  =================================== */

  if (auditRefreshBtn) {
    auditRefreshBtn.addEventListener("click", () => {
      loadAuditLogs();
    });
  }

  /* ===================================
     AUDIT PREVIOUS PAGE
  =================================== */

  if (auditPreviousBtn) {
    auditPreviousBtn.addEventListener("click", () => {
      if (auditState.loading || auditState.page <= 1) {
        return;
      }

      auditState.page -= 1;

      loadAuditLogs();
    });
  }

  /* ===================================
     AUDIT NEXT PAGE
  =================================== */

  if (auditNextBtn) {
    auditNextBtn.addEventListener("click", () => {
      if (auditState.loading || auditState.page >= auditState.totalPages) {
        return;
      }

      auditState.page += 1;

      loadAuditLogs();
    });
  }

  /* ===================================
     ADMIN SUPPORT MANAGEMENT
  =================================== */

  const adminSupportRefreshBtn = document.getElementById(
    "adminSupportRefreshBtn",
  );

  const adminSupportTotal = document.getElementById("adminSupportTotal");
  const adminSupportOpen = document.getElementById("adminSupportOpen");

  const adminSupportInProgress = document.getElementById(
    "adminSupportInProgress",
  );

  const adminSupportResolved = document.getElementById("adminSupportResolved");

  const adminSupportClosed = document.getElementById("adminSupportClosed");

  const adminSupportSearch = document.getElementById("adminSupportSearch");

  const adminSupportStatusFilter = document.getElementById(
    "adminSupportStatusFilter",
  );

  const adminSupportPriorityFilter = document.getElementById(
    "adminSupportPriorityFilter",
  );

  const adminSupportRoleFilter = document.getElementById(
    "adminSupportRoleFilter",
  );

  const adminSupportCount = document.getElementById("adminSupportCount");
  const adminSupportList = document.getElementById("adminSupportList");

  const adminSupportModal = document.getElementById("adminSupportModal");

  const adminSupportModalTitle = document.getElementById(
    "adminSupportModalTitle",
  );

  const adminSupportModalClose = document.getElementById(
    "adminSupportModalClose",
  );

  const adminSupportRequesterRole = document.getElementById(
    "adminSupportRequesterRole",
  );

  const adminSupportRequesterName = document.getElementById(
    "adminSupportRequesterName",
  );

  const adminSupportRequesterUsername = document.getElementById(
    "adminSupportRequesterUsername",
  );

  const adminSupportRequesterUserId = document.getElementById(
    "adminSupportRequesterUserId",
  );

  const adminSupportRequesterEmail = document.getElementById(
    "adminSupportRequesterEmail",
  );

  const adminSupportTicketCategory = document.getElementById(
    "adminSupportTicketCategory",
  );

  const adminSupportTicketPriority = document.getElementById(
    "adminSupportTicketPriority",
  );

  const adminSupportTicketCreated = document.getElementById(
    "adminSupportTicketCreated",
  );

  const adminSupportTicketStatus = document.getElementById(
    "adminSupportTicketStatus",
  );

  const adminSupportTicketDescription = document.getElementById(
    "adminSupportTicketDescription",
  );

  const adminSupportMessages = document.getElementById("adminSupportMessages");

  const adminSupportReply = document.getElementById("adminSupportReply");

  const adminSupportFormStatus = document.getElementById(
    "adminSupportFormStatus",
  );

  const adminSupportSendBtn = document.getElementById("adminSupportSendBtn");

  const adminSupportSendText = document.getElementById("adminSupportSendText");

  let adminSupportTickets = [];
  let activeAdminSupportTicketId = null;
  let adminSupportSearchTimer = null;

  /* ===================================
     SUPPORT HELPERS
  =================================== */

  function formatSupportStatus(value) {
    const labels = {
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed",
    };

    return labels[value] || value || "Unknown";
  }

  function formatSupportCategory(value) {
    const labels = {
      account: "Account",
      technical: "Technical",
      compiler: "Compiler",
      other: "Other",
    };

    return labels[value] || value || "Other";
  }

  function formatSupportDate(value) {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    return date.toLocaleString();
  }

  function setAdminSupportFormStatus(message = "", type = "") {
    if (!adminSupportFormStatus) {
      return;
    }

    adminSupportFormStatus.textContent = message;

    adminSupportFormStatus.classList.remove("success", "error");

    if (type) {
      adminSupportFormStatus.classList.add(type);
    }
  }

  function showAdminSupportState(icon, message) {
    if (!adminSupportList) {
      return;
    }

    adminSupportList.innerHTML = `
      <div class="admin-support-state">
        <i class="fa-solid ${icon}"></i>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  /* ===================================
     SUPPORT SUMMARY
  =================================== */

  function updateAdminSupportSummary(tickets) {
    const counts = {
      total: tickets.length,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    tickets.forEach((ticket) => {
      if (Object.prototype.hasOwnProperty.call(counts, ticket.status)) {
        counts[ticket.status] += 1;
      }
    });

    setDashboardValue(adminSupportTotal, counts.total);
    setDashboardValue(adminSupportOpen, counts.open);
    setDashboardValue(adminSupportInProgress, counts.in_progress);
    setDashboardValue(adminSupportResolved, counts.resolved);
    setDashboardValue(adminSupportClosed, counts.closed);
  }

  /* ===================================
     RENDER SUPPORT TICKETS
  =================================== */

  function renderAdminSupportTickets(tickets) {
    if (!adminSupportList || !adminSupportCount) {
      return;
    }

    adminSupportCount.textContent = `${tickets.length} ${tickets.length === 1 ? "ticket" : "tickets"}`;

    updateAdminSupportSummary(tickets);

    if (!tickets.length) {
      showAdminSupportState(
        "fa-inbox",
        "No support tickets match the selected filters.",
      );

      return;
    }

    adminSupportList.innerHTML = tickets
      .map((ticket) => {
        const requester = ticket.user || {};

        const requesterRole = requester.role === "admin" ? "admin" : "user";

        const statusClass =
          ticket.status === "in_progress"
            ? "in-progress"
            : ticket.status || "open";

        const priority = ticket.priority || "medium";

        return `
          <div class="admin-support-ticket">

            <div class="admin-support-ticket-main">

              <div class="admin-support-ticket-title-row">

                <h4 class="admin-support-ticket-title">
                  ${escapeHtml(ticket.subject || "Untitled Ticket")}
                </h4>

                <span
                  class="admin-support-role-badge ${escapeHtml(requesterRole)}"
                >
                  ${requesterRole === "admin" ? "ADMIN" : "USER"}
                </span>

                <span
                  class="admin-support-status-badge ${escapeHtml(statusClass)}"
                >
                  ${escapeHtml(formatSupportStatus(ticket.status))}
                </span>

                <span
                  class="admin-support-priority-badge ${escapeHtml(priority)}"
                >
                  ${escapeHtml(priority)}
                </span>

              </div>

              <div class="admin-support-ticket-meta">

                <span>
                  ${escapeHtml(
                    requester.fullName ||
                      requester.username ||
                      "Unknown requester",
                  )}
                </span>

                <span class="admin-support-ticket-meta-separator">
                  •
                </span>

                <span>
                  @${escapeHtml(requester.username || "unknown")}
                </span>

                <span class="admin-support-ticket-meta-separator">
                  •
                </span>

                <span>
                  ${escapeHtml(requester.userId || "No user ID")}
                </span>

                <span class="admin-support-ticket-meta-separator">
                  •
                </span>

                <span>
                  ${escapeHtml(formatSupportCategory(ticket.category))}
                </span>

                <span class="admin-support-ticket-meta-separator">
                  •
                </span>

                <span>
                  ${escapeHtml(formatSupportDate(ticket.lastActivityAt))}
                </span>

              </div>

            </div>

            <button
              type="button"
              class="admin-support-manage-btn"
              data-support-ticket-id="${escapeHtml(ticket._id)}"
            >
              <i class="fa-solid fa-headset"></i>
              Manage
            </button>

          </div>
        `;
      })
      .join("");
  }

  /* ===================================
     LOAD SUPPORT TICKETS
  =================================== */

  async function loadAdminSupportTickets() {
    if (!adminSupportList) {
      return;
    }

    try {
      showAdminSupportState("fa-spinner fa-spin", "Loading support tickets...");

      if (adminSupportRefreshBtn) {
        adminSupportRefreshBtn.disabled = true;

        adminSupportRefreshBtn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing';
      }

      const params = new URLSearchParams();

      const search = adminSupportSearch ? adminSupportSearch.value.trim() : "";

      const statusValue = adminSupportStatusFilter
        ? adminSupportStatusFilter.value
        : "";

      const priority = adminSupportPriorityFilter
        ? adminSupportPriorityFilter.value
        : "";

      const role = adminSupportRoleFilter ? adminSupportRoleFilter.value : "";

      if (search) {
        params.set("search", search);
      }

      if (statusValue) {
        params.set("status", statusValue);
      }

      if (priority) {
        params.set("priority", priority);
      }

      if (role) {
        params.set("role", role);
      }

      const url =
        "http://localhost:5000/api/support/admin/tickets" +
        (params.toString() ? `?${params.toString()}` : "");

      const response = await fetch(url, {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load support tickets.");
      }

      if (!Array.isArray(data)) {
        throw new Error("Invalid support ticket response.");
      }

      adminSupportTickets = data;

      renderAdminSupportTickets(adminSupportTickets);
    } catch (error) {
      console.error("Admin support tickets error:", error);

      adminSupportTickets = [];

      updateAdminSupportSummary([]);

      if (adminSupportCount) {
        adminSupportCount.textContent = "0 tickets";
      }

      showAdminSupportState(
        "fa-circle-exclamation",
        error.message || "Failed to load support tickets.",
      );
    } finally {
      if (adminSupportRefreshBtn) {
        adminSupportRefreshBtn.disabled = false;

        adminSupportRefreshBtn.innerHTML =
          '<i class="fa-solid fa-rotate-right"></i> Refresh';
      }
    }
  }

  /* ===================================
     SUPPORT MESSAGES
  =================================== */

  function renderAdminSupportMessages(messages) {
    if (!adminSupportMessages) {
      return;
    }

    if (!Array.isArray(messages) || !messages.length) {
      adminSupportMessages.innerHTML = `
      <div class="admin-support-state">
        <i class="fa-solid fa-comments"></i>
        <p>No messages yet.</p>
      </div>
    `;

      return;
    }

    adminSupportMessages.innerHTML = messages
      .map((message) => {
        const sender = message.sender || {};

        /*
         * senderType identifies the conversation side.
         *
         * requester = message sent by the ticket owner
         *             through Help Desk
         *
         * support   = message sent by an administrator
         *             through Admin Support Management
         */
        let senderType = message.senderType;

        /*
         * Historical compatibility for messages created before
         * senderType was introduced.
         */
        if (senderType !== "requester" && senderType !== "support") {
          const legacyRole = message.senderRole || sender.role || "user";

          senderType = legacyRole === "admin" ? "support" : "requester";
        }

        const isSupport = senderType === "support";

        /*
         * Keep the existing CSS class names so the current
         * Admin Support styling continues to work:
         *
         * user  = requester side
         * admin = support side
         */
        const roleClass = isSupport ? "admin" : "user";

        const senderName = isSupport
          ? "PrepVanta Support"
          : sender.fullName || sender.username || "Requester";

        const senderLabel = isSupport ? "Support" : "Requester";

        return `
        <div class="admin-support-message ${roleClass}">

          <div class="admin-support-message-head">

            <strong>
              ${escapeHtml(senderName)}
            </strong>

            <span>
              ${escapeHtml(senderLabel)}
            </span>

            <span>
              ${escapeHtml(formatSupportDate(message.createdAt))}
            </span>

          </div>

          <p class="admin-support-message-body">
            ${escapeHtml(message.message || "")}
          </p>

        </div>
      `;
      })
      .join("");

    /*
     * Automatically keep the latest conversation activity visible.
     */
    adminSupportMessages.scrollTop = adminSupportMessages.scrollHeight;
  }

  /* ===================================
     OPEN SUPPORT TICKET
  =================================== */

  async function openAdminSupportTicket(ticketId) {
    if (!ticketId || !adminSupportModal) {
      return;
    }

    try {
      activeAdminSupportTicketId = ticketId;

      setAdminSupportFormStatus("");

      if (adminSupportReply) {
        adminSupportReply.value = "";
      }

      const response = await fetch(
        `http://localhost:5000/api/support/admin/tickets/${encodeURIComponent(
          ticketId,
        )}`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const ticket = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(ticket?.message || "Failed to load support ticket.");
      }

      const requester = ticket.user || {};

      if (adminSupportModalTitle) {
        adminSupportModalTitle.textContent = ticket.subject || "Ticket Details";
      }

      if (adminSupportRequesterRole) {
        const requesterRole = requester.role === "admin" ? "admin" : "user";

        adminSupportRequesterRole.textContent =
          requesterRole === "admin" ? "ADMIN" : "USER";

        adminSupportRequesterRole.classList.remove("admin", "user");

        adminSupportRequesterRole.classList.add(requesterRole);
      }

      if (adminSupportRequesterName) {
        adminSupportRequesterName.textContent = requester.fullName || "--";
      }

      if (adminSupportRequesterUsername) {
        adminSupportRequesterUsername.textContent = requester.username
          ? `@${requester.username}`
          : "--";
      }

      if (adminSupportRequesterUserId) {
        adminSupportRequesterUserId.textContent = requester.userId || "--";
      }

      if (adminSupportRequesterEmail) {
        adminSupportRequesterEmail.textContent = requester.email || "--";
      }

      if (adminSupportTicketCategory) {
        adminSupportTicketCategory.textContent = formatSupportCategory(
          ticket.category,
        );
      }

      if (adminSupportTicketPriority) {
        adminSupportTicketPriority.textContent = ticket.priority
          ? ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)
          : "--";
      }

      if (adminSupportTicketCreated) {
        adminSupportTicketCreated.textContent = formatSupportDate(
          ticket.createdAt,
        );
      }

      if (adminSupportTicketStatus) {
        adminSupportTicketStatus.value = ticket.status || "open";
      }

      if (adminSupportTicketDescription) {
        adminSupportTicketDescription.textContent = ticket.description || "--";
      }

      renderAdminSupportMessages(ticket.messages);

      /*
       * Closed tickets remain viewable but cannot
       * receive new replies.
       */

      const ticketClosed = ticket.status === "closed";

      if (adminSupportReply) {
        adminSupportReply.disabled = ticketClosed;

        adminSupportReply.placeholder = ticketClosed
          ? "Closed tickets cannot receive new replies."
          : "Write a response to the requester...";
      }

      if (adminSupportSendBtn) {
        adminSupportSendBtn.disabled = ticketClosed;
      }

      if (ticketClosed) {
        setAdminSupportFormStatus(
          "This ticket is closed. Reopen it to send another reply.",
        );
      }

      adminSupportModal.hidden = false;
    } catch (error) {
      console.error("Open support ticket error:", error);

      activeAdminSupportTicketId = null;

      alert(error.message || "Failed to load support ticket.");
    }
  }

  /* ===================================
     CLOSE SUPPORT MODAL
  =================================== */

  function closeAdminSupportModal() {
    if (!adminSupportModal) {
      return;
    }

    adminSupportModal.hidden = true;

    activeAdminSupportTicketId = null;

    setAdminSupportFormStatus("");

    if (adminSupportReply) {
      adminSupportReply.value = "";
      adminSupportReply.disabled = false;
    }

    if (adminSupportSendBtn) {
      adminSupportSendBtn.disabled = false;
    }
  }

  /* ===================================
     UPDATE SUPPORT STATUS
  =================================== */

  async function updateAdminSupportStatus(newStatus) {
    if (!activeAdminSupportTicketId) {
      return;
    }

    try {
      if (adminSupportTicketStatus) {
        adminSupportTicketStatus.disabled = true;
      }

      setAdminSupportFormStatus("Updating ticket status...");

      const response = await fetch(
        `http://localhost:5000/api/support/admin/tickets/${encodeURIComponent(
          activeAdminSupportTicketId,
        )}/status`,
        {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to update ticket status.");
      }

      setAdminSupportFormStatus("Ticket status updated.", "success");

      await loadAdminSupportTickets();

      /*
       * Reload ticket so reply availability,
       * conversation and current status remain
       * synchronized with the backend.
       */

      await openAdminSupportTicket(activeAdminSupportTicketId);
    } catch (error) {
      console.error("Support status update error:", error);

      setAdminSupportFormStatus(
        error.message || "Failed to update ticket status.",
        "error",
      );

      if (activeAdminSupportTicketId) {
        await openAdminSupportTicket(activeAdminSupportTicketId);
      }
    } finally {
      if (adminSupportTicketStatus) {
        adminSupportTicketStatus.disabled = false;
      }
    }
  }

  /* ===================================
     SEND ADMIN SUPPORT REPLY
  =================================== */

  async function sendAdminSupportReply() {
    if (
      !activeAdminSupportTicketId ||
      !adminSupportReply ||
      !adminSupportSendBtn
    ) {
      return;
    }

    const message = adminSupportReply.value.trim();

    if (!message) {
      setAdminSupportFormStatus("Enter a reply before sending.", "error");

      adminSupportReply.focus();

      return;
    }

    try {
      adminSupportSendBtn.disabled = true;

      if (adminSupportSendText) {
        adminSupportSendText.textContent = "Sending...";
      }

      setAdminSupportFormStatus("Sending reply...");

      const response = await fetch(
        `http://localhost:5000/api/support/admin/tickets/${encodeURIComponent(
          activeAdminSupportTicketId,
        )}/messages`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Failed to send support reply.");
      }

      adminSupportReply.value = "";

      setAdminSupportFormStatus("Reply sent successfully.", "success");

      await loadAdminSupportTickets();

      await openAdminSupportTicket(activeAdminSupportTicketId);
    } catch (error) {
      console.error("Admin support reply error:", error);

      setAdminSupportFormStatus(
        error.message || "Failed to send support reply.",
        "error",
      );
    } finally {
      if (adminSupportSendText) {
        adminSupportSendText.textContent = "Send Reply";
      }

      /*
       * openAdminSupportTicket() determines whether
       * this should remain disabled for a closed ticket.
       */

      if (adminSupportSendBtn && adminSupportTicketStatus?.value !== "closed") {
        adminSupportSendBtn.disabled = false;
      }
    }
  }

  /* ===================================
     SUPPORT EVENTS
  =================================== */

  if (adminSupportRefreshBtn) {
    adminSupportRefreshBtn.addEventListener("click", loadAdminSupportTickets);
  }

  if (adminSupportSearch) {
    adminSupportSearch.addEventListener("input", () => {
      clearTimeout(adminSupportSearchTimer);

      adminSupportSearchTimer = setTimeout(() => {
        loadAdminSupportTickets();
      }, 300);
    });
  }

  [
    adminSupportStatusFilter,
    adminSupportPriorityFilter,
    adminSupportRoleFilter,
  ].forEach((filterElement) => {
    if (filterElement) {
      filterElement.addEventListener("change", loadAdminSupportTickets);
    }
  });

  if (adminSupportList) {
    adminSupportList.addEventListener("click", (event) => {
      const button = event.target.closest(".admin-support-manage-btn");

      if (!button) {
        return;
      }

      openAdminSupportTicket(button.dataset.supportTicketId);
    });
  }

  if (adminSupportModalClose) {
    adminSupportModalClose.addEventListener("click", closeAdminSupportModal);
  }

  if (adminSupportModal) {
    adminSupportModal.addEventListener("click", (event) => {
      if (event.target === adminSupportModal) {
        closeAdminSupportModal();
      }
    });
  }

  if (adminSupportTicketStatus) {
    adminSupportTicketStatus.addEventListener("change", () => {
      updateAdminSupportStatus(adminSupportTicketStatus.value);
    });
  }

  if (adminSupportSendBtn) {
    adminSupportSendBtn.addEventListener("click", sendAdminSupportReply);
  }

  /* ===================================
     GROUP 2 - QUESTION MANAGEMENT
  =================================== */

  const adminQuestionList = document.getElementById("adminQuestionList");

  const adminQuestionCount = document.getElementById("adminQuestionCount");

  const adminQuestionSearch = document.getElementById("adminQuestionSearch");

  const adminQuestionCategory = document.getElementById(
    "adminQuestionCategory",
  );

  const adminQuestionTopic = document.getElementById("adminQuestionTopic");

  const adminQuestionDifficulty = document.getElementById(
    "adminQuestionDifficulty",
  );

  const adminQuestionStatus = document.getElementById("adminQuestionStatus");

  const adminRefreshQuestionsBtn = document.getElementById(
    "adminRefreshQuestionsBtn",
  );

  let adminQuestions = [];
  let adminTopics = [];
  let adminQuestionsCurrentPage = 1;
  const ADMIN_QUESTIONS_PER_PAGE = 5;

  function escapeAdminQuestionHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function populateAdminQuestionTopics() {
    if (!adminQuestionTopic) {
      return;
    }

    const selectedValue = adminQuestionTopic.value;

    const category = adminQuestionCategory ? adminQuestionCategory.value : "";

    const filteredTopics = category
      ? adminTopics.filter((topic) => topic.category === category)
      : adminTopics;

    adminQuestionTopic.innerHTML = `
      <option value="">All Topics</option>
      ${filteredTopics
        .map(
          (topic) => `
            <option value="${escapeAdminQuestionHtml(topic._id)}">
              ${escapeAdminQuestionHtml(topic.name)}
            </option>
          `,
        )
        .join("")}
    `;

    if (filteredTopics.some((topic) => topic._id === selectedValue)) {
      adminQuestionTopic.value = selectedValue;
    }
  }

  function renderAdminQuestions() {
    if (!adminQuestionList || !adminQuestionCount) {
      return;
    }

    const search = adminQuestionSearch
      ? adminQuestionSearch.value.trim().toLowerCase()
      : "";

    const category = adminQuestionCategory ? adminQuestionCategory.value : "";

    const topicId = adminQuestionTopic ? adminQuestionTopic.value : "";

    const difficulty = adminQuestionDifficulty
      ? adminQuestionDifficulty.value
      : "";

    const status = adminQuestionStatus ? adminQuestionStatus.value : "";

    const filteredQuestions = adminQuestions.filter((question) => {
      const matchesSearch =
        !search ||
        String(question.title || "")
          .toLowerCase()
          .includes(search) ||
        String(question.description || "")
          .toLowerCase()
          .includes(search);

      const matchesCategory = !category || question.category === category;

      const questionTopicId =
        question.topic && typeof question.topic === "object"
          ? question.topic._id
          : question.topic;

      const matchesTopic = !topicId || questionTopicId === topicId;

      const matchesDifficulty =
        !difficulty || question.difficulty === difficulty;

      const matchesStatus = !status || question.status === status;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesTopic &&
        matchesDifficulty &&
        matchesStatus
      );
    });

    adminQuestionCount.textContent = `${filteredQuestions.length} question${
      filteredQuestions.length === 1 ? "" : "s"
    }`;
    const totalPages = Math.max(
      1,
      Math.ceil(filteredQuestions.length / ADMIN_QUESTIONS_PER_PAGE),
    );

    if (adminQuestionsCurrentPage > totalPages) {
      adminQuestionsCurrentPage = totalPages;
    }

    const startIndex =
      (adminQuestionsCurrentPage - 1) * ADMIN_QUESTIONS_PER_PAGE;

    const paginatedQuestions = filteredQuestions.slice(
      startIndex,
      startIndex + ADMIN_QUESTIONS_PER_PAGE,
    );

    const pageInfo = document.getElementById("adminQuestionsPageInfo");

    const prevBtn = document.getElementById("adminQuestionsPrevBtn");

    const nextBtn = document.getElementById("adminQuestionsNextBtn");

    if (pageInfo) {
      pageInfo.textContent = `Page ${adminQuestionsCurrentPage} of ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = adminQuestionsCurrentPage <= 1;
    }

    if (nextBtn) {
      nextBtn.disabled =
        adminQuestionsCurrentPage >= totalPages ||
        filteredQuestions.length === 0;
    }

    if (filteredQuestions.length === 0) {
      adminQuestionList.innerHTML = `
        <div class="admin-empty-state">
          No questions found.
        </div>
      `;

      return;
    }

    adminQuestionList.innerHTML = paginatedQuestions
      .map((question) => {
        const topicName =
          question.topic && typeof question.topic === "object"
            ? question.topic.name
            : "Unknown topic";

        return `
          <div class="admin-question-item">

            <div class="admin-question-main">

              <strong>
                ${escapeAdminQuestionHtml(question.title)}
              </strong>

              <p>
                ${escapeAdminQuestionHtml(question.description)}
              </p>

              <div class="admin-question-meta">

                <span>
                  ${escapeAdminQuestionHtml(question.category)}
                </span>

                <span>
                  ${escapeAdminQuestionHtml(topicName)}
                </span>

                <span>
                  ${escapeAdminQuestionHtml(question.difficulty)}
                </span>

                <span>
                  ${escapeAdminQuestionHtml(question.type)}
                </span>

                <span>
                  ${escapeAdminQuestionHtml(question.status)}
                </span>

              </div>

            </div>

          </div>
        `;
      })
      .join("");
  }

  async function loadAdminQuestionTopics() {
    if (!adminQuestionTopic) {
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/topics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load topics");
      }

      adminTopics = await response.json();

      populateAdminQuestionTopics();
    } catch (error) {
      console.error("Admin question topics error:", error);
    }
  }

  async function loadAdminQuestions() {
    if (!adminQuestionList) {
      return;
    }

    adminQuestionList.innerHTML = `
      <div class="admin-empty-state">
        Loading questions...
      </div>
    `;

    try {
      const response = await fetch("http://localhost:5000/api/questions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load questions");
      }

      adminQuestions = await response.json();

      renderAdminQuestions();
    } catch (error) {
      console.error("Admin questions error:", error);

      adminQuestionList.innerHTML = `
        <div class="admin-empty-state">
          Unable to load questions.
        </div>
      `;
    }
  }

  if (adminQuestionSearch) {
    adminQuestionSearch.addEventListener("input", () => {
      adminQuestionsCurrentPage = 1;
      renderAdminQuestions();
    });
  }

  if (adminQuestionCategory) {
    adminQuestionCategory.addEventListener("change", () => {
      adminQuestionsCurrentPage = 1;
      populateAdminQuestionTopics();
      renderAdminQuestions();
    });
  }

  if (adminQuestionTopic) {
    adminQuestionTopic.addEventListener("change", () => {
      adminQuestionsCurrentPage = 1;
      renderAdminQuestions();
    });
  }

  if (adminQuestionDifficulty) {
    adminQuestionDifficulty.addEventListener("change", () => {
      adminQuestionsCurrentPage = 1;
      renderAdminQuestions();
    });
  }

  if (adminQuestionStatus) {
    adminQuestionStatus.addEventListener("change", () => {
      adminQuestionsCurrentPage = 1;
      renderAdminQuestions();
    });
  }
  const adminQuestionsPrevBtn = document.getElementById(
    "adminQuestionsPrevBtn",
  );

  const adminQuestionsNextBtn = document.getElementById(
    "adminQuestionsNextBtn",
  );

  if (adminQuestionsPrevBtn) {
    adminQuestionsPrevBtn.addEventListener("click", () => {
      if (adminQuestionsCurrentPage > 1) {
        adminQuestionsCurrentPage -= 1;
        renderAdminQuestions();
      }
    });
  }

  if (adminQuestionsNextBtn) {
    adminQuestionsNextBtn.addEventListener("click", () => {
      adminQuestionsCurrentPage += 1;
      renderAdminQuestions();
    });
  }

  if (adminRefreshQuestionsBtn) {
    adminRefreshQuestionsBtn.addEventListener("click", async () => {
      await loadAdminQuestionTopics();
      await loadAdminQuestions();
    });
  }

  /* ===================================
     INITIAL LOAD
  =================================== */

  loadAdminDashboard();
  loadAdminUsers();
  loadAdminCompanies();
  loadPlatformSettings();
  loadAdminSupportTickets();
  loadAuditLogs();

  loadAdminQuestionTopics();
  loadAdminQuestions();
})();
