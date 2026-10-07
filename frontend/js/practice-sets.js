const PRACTICE_SETS_API_BASE_URL = "http://localhost:5000/api";

function getPracticeSetsAuthToken() {
    const token = localStorage.getItem("prepvanta-token");

    if (!token) {
        throw new Error("Authentication token not found. Please login first.");
    }

    return token;
}

function escapePracticeSetsHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderPracticeSetsMessage(message, iconClass) {
    const messageBox = document.getElementById("practiceSetsMessage");

    if (!messageBox) {
        return;
    }

    messageBox.innerHTML = `
        <i class="fa-solid ${escapePracticeSetsHtml(iconClass)}"></i>
        <p>${escapePracticeSetsHtml(message)}</p>
    `;

    messageBox.style.display = "block";
}

function hidePracticeSetsMessage() {
    const messageBox = document.getElementById("practiceSetsMessage");

    if (messageBox) {
        messageBox.style.display = "none";
    }
}

function renderPracticeSetCards(practiceSets) {
    const grid = document.getElementById("practiceSetsGrid");

    if (!grid) {
        throw new Error("Practice sets grid was not found.");
    }

    if (!Array.isArray(practiceSets) || practiceSets.length === 0) {
        grid.innerHTML = "";
        renderPracticeSetsMessage(
            "No published practice sets are available yet.",
            "fa-clipboard-list"
        );
        return;
    }

    hidePracticeSetsMessage();

    grid.innerHTML = practiceSets.map((practiceSet) => {
        const id = practiceSet._id || practiceSet.id;

        if (!id) {
            return "";
        }

        const topic = practiceSet.topic || {};
        const topicName = topic.name || "Practice";

        const questionCount = Number.isFinite(Number(practiceSet.questionCount))
            ? Number(practiceSet.questionCount)
            : 0;

        const duration = Number(practiceSet.duration);

        const durationText =
            Number.isFinite(duration) && duration > 0
                ? `${duration} minute${duration === 1 ? "" : "s"}`
                : "Timed";

        const description =
            practiceSet.description ||
            "Test your knowledge with this structured practice set.";

        return `
            <article class="practice-set-card">
                <div class="practice-set-badge">
                    <i class="fa-solid fa-book-open"></i>
                    ${escapePracticeSetsHtml(topicName)}
                </div>

                <h3>${escapePracticeSetsHtml(practiceSet.title || "Practice Set")}</h3>

                <p class="practice-set-description">
                    ${escapePracticeSetsHtml(description)}
                </p>

                <div class="practice-set-meta">
                    <span>
                        <i class="fa-solid fa-list-check"></i>
                        ${questionCount} question${questionCount === 1 ? "" : "s"}
                    </span>

                    <span>
                        <i class="fa-solid fa-clock"></i>
                        ${escapePracticeSetsHtml(durationText)}
                    </span>
                </div>

                <a
                    href="practice-set.html?id=${encodeURIComponent(id)}"
                    class="btn btn-primary"
                >
                    Start Practice Set
                    <i class="fa-solid fa-arrow-right"></i>
                </a>
            </article>
        `;
    }).join("");

    const renderedCards = grid.querySelectorAll(".practice-set-card");

    if (renderedCards.length === 0) {
        renderPracticeSetsMessage(
            "No valid published practice sets are available.",
            "fa-clipboard-list"
        );
    }
}

async function loadPracticeSets() {
    try {
        const token = getPracticeSetsAuthToken();

        const response = await fetch(
            `${PRACTICE_SETS_API_BASE_URL}/practice/learner/list`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const data = await response.json().catch(() => []);

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load practice sets."
            );
        }

        renderPracticeSetCards(data);
    } catch (error) {
        console.error("Practice sets page error:", error);

        const grid = document.getElementById("practiceSetsGrid");

        if (grid) {
            grid.innerHTML = "";
        }

        renderPracticeSetsMessage(
            error.message || "Unable to load practice sets.",
            "fa-circle-exclamation"
        );
    }
}

document.addEventListener("DOMContentLoaded", loadPracticeSets);
