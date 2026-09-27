const API_URL = "http://localhost:5000/api/companies";

const companyGrid = document.getElementById("companyGrid");
const companySearch = document.getElementById("companySearch");

/* =========================
   LOAD COMPANIES
========================= */
async function loadCompanies() {
  try {
    const params = new URLSearchParams();

    const search = companySearch.value.trim();

    if (search) {
      params.append("search", search);
    }

    const url = params.toString() ? `${API_URL}?${params.toString()}` : API_URL;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch companies");
    }

    const companies = await response.json();

    renderCompanies(companies);
  } catch (error) {
    console.error("Company loading error:", error);

    companyGrid.innerHTML = `
            <p class="company-message">
                Unable to load companies. Please try again later.
            </p>
        `;
  }
}

/* =========================
   RENDER COMPANY CARDS
========================= */
function renderCompanies(companies) {
  if (!companies.length) {
    companyGrid.innerHTML = `
            <p class="company-message">
                No companies found.
            </p>
        `;
    return;
  }

  companyGrid.innerHTML = companies
    .map((company) => {
      const initials = getInitials(company.name);

      const topics =
        company.focusTopics && company.focusTopics.length
          ? company.focusTopics.join(", ")
          : "Topics coming soon";

      const difficulty = company.difficulty || "Not specified";

      const practiceLink =
        company.practiceLink ||
        `company.html?company=${encodeURIComponent(company.slug)}`;

      return `
                <div class="company-card">

                    <div class="company-logo">
                        ${escapeHtml(initials)}
                    </div>

                    <h3>
                        ${escapeHtml(company.name)}
                    </h3>

                    <p class="company-industry">
                        ${escapeHtml(
                          company.industry || "Industry not specified",
                        )}
                    </p>

                    <div class="company-stats">

                        <div>
                            <b>
                                ${escapeHtml(difficulty)}
                            </b>
                            <span>Difficulty</span>
                        </div>

                        <div>
                            <b>
                                ${escapeHtml(
                                  String(company.focusTopics?.length || 0),
                                )}
                            </b>
                            <span>Focus Topics</span>
                        </div>

                    </div>

                    <p class="company-focus">
                        <strong>Focus:</strong>
                        ${escapeHtml(topics)}
                    </p>

                    <a
                        href="${escapeHtml(practiceLink)}"
                        class="btn btn-secondary"
                    >
                        View Pattern
                    </a>

                </div>
            `;
    })
    .join("");
}

/* =========================
   COMPANY INITIALS
========================= */
function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .substring(0, 3)
    .toUpperCase();
}

/* =========================
   SAFE HTML OUTPUT
========================= */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   SEARCH
========================= */

let searchTimer;

companySearch.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    loadCompanies();
  }, 300);
});

/* =========================
   INITIAL LOAD
========================= */

loadCompanies();
