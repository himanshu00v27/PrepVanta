const ATTEMPT_RESULT_API_BASE_URL = "http://localhost:5000/api";

function getAttemptResultToken() {
  return localStorage.getItem("prepvanta-token");
}

function escapeAttemptResultHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAttemptResultId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchAttemptResult(attemptId) {
  const token = getAttemptResultToken();

  if (!token) {
    window.location.href = "login.html";
    return null;
  }

  const response = await fetch(
    `${ATTEMPT_RESULT_API_BASE_URL}/attempts/${encodeURIComponent(attemptId)}/result`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("prepvanta-token");
    localStorage.removeItem("prepvanta-user");
    window.location.href = "login.html";
    return null;
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to load practice result.");
  }

  return data;
}

function renderAttemptResultQuestion(item, index) {
  const question = item.question || {};
  const userAnswer = String(item.answer || "").trim();
  const correctAnswer = String(question.answer || "").trim();
  const isCorrect = item.isCorrect === true;

  return `
    <article class="attempt-result-question ${isCorrect ? "is-correct" : "is-incorrect"}">
      <div class="attempt-result-question-head">
        <span class="attempt-result-question-number">
          Question ${index + 1}
        </span>

        <span class="attempt-result-status ${isCorrect ? "is-correct" : "is-incorrect"}">
          ${isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>

      <h3>
        ${escapeAttemptResultHtml(question.title || "Question unavailable")}
      </h3>

      <div class="attempt-result-answer-grid">
        <div class="attempt-result-answer">
          <span>Your Answer</span>
          <strong class="${userAnswer ? "" : "attempt-result-unanswered"}">
            ${
              userAnswer
                ? escapeAttemptResultHtml(userAnswer)
                : "Not answered"
            }
          </strong>
        </div>

        <div class="attempt-result-answer correct-answer">
          <span>Correct Answer</span>
          <strong>
            ${escapeAttemptResultHtml(correctAnswer || "Not available")}
          </strong>
        </div>
      </div>
    </article>
  `;
}

function renderAttemptResult(result) {
  const mount = document.getElementById("attemptResultBody");

  if (!mount) {
    return;
  }

  const practiceSet = result.practiceSet || {};
  const topic = practiceSet.topic || {};
  const answers = Array.isArray(result.answers) ? result.answers : [];

  const score = Number(result.score) || 0;
  const totalQuestions = Number(result.totalQuestions) || 0;
  const percentage = Number(result.percentage) || 0;
  const incorrectCount = Math.max(0, totalQuestions - score);

  const questionReview = answers
    .map((item, index) => renderAttemptResultQuestion(item, index))
    .join("");

  mount.innerHTML = `
    <div class="attempt-result-header">
      <h1>${escapeAttemptResultHtml(practiceSet.title || "Practice Result")}</h1>

      <p>Your completed practice-set result.</p>

      ${
        topic.name
          ? `
            <span class="attempt-result-topic">
              <i class="fa-solid fa-book-open"></i>
              ${escapeAttemptResultHtml(topic.name)}
              ${
                topic.category
                  ? ` · ${escapeAttemptResultHtml(topic.category)}`
                  : ""
              }
            </span>
          `
          : ""
      }
    </div>

    <div class="attempt-result-summary">
      <div class="attempt-result-stat">
        <span>Score</span>
        <strong>
          ${escapeAttemptResultHtml(score)} / ${escapeAttemptResultHtml(totalQuestions)}
        </strong>
      </div>

      <div class="attempt-result-stat">
        <span>Accuracy</span>
        <strong>${escapeAttemptResultHtml(percentage)}%</strong>
      </div>

      <div class="attempt-result-stat is-correct">
        <span>Correct</span>
        <strong>${escapeAttemptResultHtml(score)}</strong>
      </div>

      <div class="attempt-result-stat is-incorrect">
        <span>Incorrect</span>
        <strong>${escapeAttemptResultHtml(incorrectCount)}</strong>
      </div>
    </div>

    <h2 class="attempt-result-review-heading">Question Review</h2>

    <div class="attempt-result-review">
      ${
        questionReview ||
        `
          <div class="mcq-card">
            <p>No answer review is available for this attempt.</p>
          </div>
        `
      }
    </div>

    <div class="attempt-result-actions">
      ${
        practiceSet._id
          ? `
            <a
              class="btn btn-primary"
              href="practice-set.html?id=${encodeURIComponent(practiceSet._id)}"
            >
              Try Again
            </a>
          `
          : ""
      }

      <a class="btn btn-secondary" href="practice-sets.html">
        Back to Practice Sets
      </a>
    </div>
  `;

  document.title = practiceSet.title
    ? `${practiceSet.title} Result | PrepVanta`
    : "Practice Result | PrepVanta";
}

function renderAttemptResultError(message) {
  const mount = document.getElementById("attemptResultBody");

  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <div class="attempt-result-error">
      ${escapeAttemptResultHtml(message)}
    </div>

    <div class="attempt-result-actions">
      <a class="btn btn-primary" href="practice-sets.html">
        Back to Practice Sets
      </a>
    </div>
  `;
}

async function initAttemptResultPage() {
  const attemptId = getAttemptResultId();

  if (!attemptId) {
    renderAttemptResultError(
      "No practice attempt was specified. Please open a result from a completed practice set.",
    );
    return;
  }

  try {
    const result = await fetchAttemptResult(attemptId);

    if (result) {
      renderAttemptResult(result);
    }
  } catch (error) {
    console.error("Attempt result error:", error);

    renderAttemptResultError(
      error.message || "Unable to load this practice result.",
    );
  }
}

document.addEventListener("DOMContentLoaded", initAttemptResultPage);

