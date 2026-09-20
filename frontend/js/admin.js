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
})();
