(function () {
  const SETTINGS_URL = "http://localhost:5000/api/settings/public";

  async function loadPublicPlatformSettings() {
    try {
      const response = await fetch(SETTINGS_URL, {
        method: "GET",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load platform settings.");
      }

      renderAnnouncement(data);
    } catch (error) {
      // Public settings should never break the page.
      console.error("Public platform settings error:", error);
    }
  }

  function renderAnnouncement(settings) {
    removeExistingAnnouncement();

    if (
      settings.announcementEnabled !== true ||
      typeof settings.announcementMessage !== "string" ||
      !settings.announcementMessage.trim()
    ) {
      return;
    }

    const banner = document.createElement("div");

    banner.className = "platform-announcement";
    banner.id = "platformAnnouncement";

    const content = document.createElement("div");
    content.className = "platform-announcement-content";

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-bullhorn";
    icon.setAttribute("aria-hidden", "true");

    const message = document.createElement("span");
    message.className = "platform-announcement-message";

    // textContent prevents announcement HTML/script injection.
    message.textContent = settings.announcementMessage.trim();

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.className = "platform-announcement-close";

    closeButton.setAttribute("aria-label", "Dismiss announcement");

    closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';

    closeButton.addEventListener("click", () => {
      banner.remove();
    });

    content.appendChild(icon);
    content.appendChild(message);
    content.appendChild(closeButton);

    banner.appendChild(content);

    /*
     * Insert directly below the navbar when possible.
     */
    const navbar = document.querySelector(".navbar");

    if (navbar) {
      navbar.insertAdjacentElement("afterend", banner);
    } else {
      document.body.prepend(banner);
    }
  }

  function removeExistingAnnouncement() {
    const existing = document.getElementById("platformAnnouncement");

    if (existing) {
      existing.remove();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPublicPlatformSettings);
  } else {
    loadPublicPlatformSettings();
  }
})();
