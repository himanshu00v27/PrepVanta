const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function openSidebar() {
  sidebar.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeSidebar() {
  sidebar.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

menuBtn.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSidebar();
  }
});

/*
 * Show Admin Panel only for administrators.
 */

(function addAdminLink() {
  const userData = localStorage.getItem("prepvanta-user");

  if (!userData) {
    return;
  }

  let user = null;

  try {
    user = JSON.parse(userData);
  } catch (error) {
    return;
  }

  if (!user || user.role !== "admin") {
    return;
  }

  // Prevent duplicate Admin Panel links.
  const existingAdminLink = document.querySelector('a[href="admin.html"]');

  if (existingAdminLink) {
    return;
  }

  const accountSection = Array.from(
    document.querySelectorAll(".sidebar-section"),
  ).find((section) => {
    const heading = section.querySelector("h4");
    return heading && heading.textContent.trim() === "Account";
  });

  if (!accountSection) {
    return;
  }

  const adminSection = document.createElement("div");

  adminSection.className = "sidebar-section";

  adminSection.innerHTML = `
        <h4>Administration</h4>

        <a href="admin.html">
            <i class="fa-solid fa-shield-halved"></i>
            Admin Panel
        </a>
    `;

  accountSection.parentNode.insertBefore(adminSection, accountSection);
})();
