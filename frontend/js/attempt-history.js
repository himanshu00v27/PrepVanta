const ATTEMPT_HISTORY_API_BASE_URL = "http://localhost:5000/api";

function getAttemptHistoryToken() {
  return localStorage.getItem("prepvanta-token");
}

function escapeAttemptHistoryHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAttemptHistoryDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString();
}

async function fetchAttemptHistory() {
  const token = getAttemptHistoryToken();

  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  const response = await fetch(
    `${ATTEMPT_HISTORY_API_BASE_URL}/attempts/history/all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json().catch(() => ([]));

  if (response.status === 401) {
    localStorage.removeItem("prepvanta-token");
    localStorage.removeItem("prepvanta-user");
    window.location.href = "login.html";
    return null;
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to load attempt history");
  }

  return Array.isArray(data) ? data : [];
}

function renderAttemptHistoryEmpty(container) {
  container.innerHTML = `
    <div class="attempt-history-empty">
      <h2>No completed attempts yet</h2>
      <p>Complete a Practice Set and your result will appear here.</p>
      <a class="btn btn-primary" href="practice-sets.html">Browse Practice Sets</a>
    </div>
  `;
}

function renderAttemptHistory(attempts) {
  const container = document.getElementById("attemptHistoryBody");

  if (!container) {
    return;
  }

  if (!attempts.length) {
    renderAttemptHistoryEmpty(container);
    return;
  }

  container.innerHTML = `
    <div class="attempt-history-list">
      ${attempts
        .map((attempt) => {
          const practiceSet = attempt.practiceSet || {};
          const topic = practiceSet.topic || {};

          const score = Number(attempt.score) || 0;
          const totalQuestions = Number(attempt.totalQuestions) || 0;
          const incorrect = Math.max(totalQuestions - score, 0);
          const accuracy =
            totalQuestions > 0
              ? Math.round((score / totalQuestions) * 100)
              : 0;

          const attemptId = escapeAttemptHistoryHtml(attempt._id || "");
          const title = escapeAttemptHistoryHtml(
            practiceSet.title || "Practice Set",
          );
          const topicName = escapeAttemptHistoryHtml(
            topic.name || "Topic unavailable",
          );
          const category = escapeAttemptHistoryHtml(
            topic.category || "Category unavailable",
          );
          const submittedAt = escapeAttemptHistoryHtml(
            formatAttemptHistoryDate(attempt.submittedAt),
          );

          return `
            <article class="attempt-history-card">
              <div class="attempt-history-card-head">
                <div>
                  <h2>${title}</h2>
                  <p>${topicName} · ${category}</p>
                </div>
                <span class="attempt-history-status">Completed</span>
              </div>

              <div class="attempt-history-stats">
                <div>
                  <span>Score</span>
                  <strong>${score} / ${totalQuestions}</strong>
                </div>

                <div>
                  <span>Accuracy</span>
                  <strong>${accuracy}%</strong>
                </div>

                <div>
                  <span>Correct</span>
                  <strong>${score}</strong>
                </div>

                <div>
                  <span>Incorrect</span>
                  <strong>${incorrect}</strong>
                </div>
              </div>

              <div class="attempt-history-footer">
                <span>Submitted: ${submittedAt}</span>

                <a
                  class="btn btn-primary"
                  href="attempt-result.html?id=${encodeURIComponent(attemptId)}"
                >
                  View Result
                </a>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAttemptHistoryError(message) {
  const container = document.getElementById("attemptHistoryBody");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="attempt-history-error">
      <h2>Unable to load attempt history</h2>
      <p>${escapeAttemptHistoryHtml(message)}</p>
      <a class="btn btn-primary" href="practice-sets.html">Back to Practice Sets</a>
    </div>
  `;
}

async function initAttemptHistory() {
  try {
    const attempts = await fetchAttemptHistory();

    if (attempts) {
      renderAttemptHistory(attempts);
    }
  } catch (error) {
    console.error("Attempt history error:", error);
    renderAttemptHistoryError(error.message);
  }
}

document.addEventListener("DOMContentLoaded", initAttemptHistory);
