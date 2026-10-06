const PRACTICE_API_BASE_URL = "http://localhost:5000/api";

function getParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    cat: params.get("cat") || "topics",
    name: params.get("name") || "General Practice",
    id: params.get("id"),
  };
}

function getAuthToken() {
  const token = localStorage.getItem("prepvanta-token");

  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }

  return token;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   LOAD PRACTICE SET BY ID
========================= */

async function loadPracticeSet(practiceSetId) {
  const token = getAuthToken();

  const response = await fetch(
    `${PRACTICE_API_BASE_URL}/practice/${encodeURIComponent(practiceSetId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(error.message || "Failed to load practice set.");
  }

  return response.json();
}

/* =========================
   RESOLVE PRACTICE SET
========================= */

async function resolvePracticeSet() {
  const { cat, name, id } = getParams();

  // Direct MongoDB ID links remain supported.
  if (id) {
    const practiceSet = await loadPracticeSet(id);

    return {
      practiceSet: practiceSet.practiceSet || practiceSet.data || practiceSet,
      practiceSetId: id,
    };
  }

  if (!cat || !name) {
    throw new Error(
      "Practice set ID or category/topic information is missing from URL.",
    );
  }

  const token = getAuthToken();

  const query = new URLSearchParams({
    category: cat,
    name,
  });

  const response = await fetch(
    `${PRACTICE_API_BASE_URL}/practice/resolve/topic?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(
      error.message || `No published practice set available for ${name}.`,
    );
  }

  const data = await response.json();

  const practiceSet = data.practiceSet || data.data || data;

  const practiceSetId = practiceSet._id || practiceSet.id;

  if (!practiceSetId) {
    throw new Error("Practice set ID was not returned by backend.");
  }

  return {
    practiceSet,
    practiceSetId,
  };
}

/* =========================
   START PRACTICE ATTEMPT
========================= */

async function startPracticeAttempt(practiceSetId) {
  const token = getAuthToken();

  const response = await fetch(
    `${PRACTICE_API_BASE_URL}/attempts/start/${encodeURIComponent(practiceSetId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(error.message || "Failed to start practice attempt.");
  }

  return response.json();
}

/* =========================
   SUBMIT PRACTICE ATTEMPT
========================= */

async function submitPracticeAttempt(attemptId, answers) {
  const token = getAuthToken();

  const response = await fetch(
    `${PRACTICE_API_BASE_URL}/attempts/${encodeURIComponent(attemptId)}/submit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answers,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    throw new Error(error.message || "Failed to submit practice.");
  }

  return response.json();
}

/* =========================
   QUESTION RENDERING
========================= */

function renderQuestion(question, index) {
  const questionId = question._id || question.id || `question-${index}`;

  const questionTitle =
    question.question || question.title || question.text || "Question";

  const description = question.description || "";

  const options = Array.isArray(question.options) ? question.options : [];

  const optionsHTML = options
    .map((option) => {
      const optionText =
        typeof option === "object"
          ? option.text || option.label || option.value || ""
          : String(option);

      return `
        <label class="option-item">
          <input
            type="radio"
            name="question-${escapeHtml(questionId)}"
            value="${escapeHtml(optionText)}"
            data-question-id="${escapeHtml(questionId)}"
          >
          <span>${escapeHtml(optionText)}</span>
        </label>
      `;
    })
    .join("");

  return `
    <div class="mcq-card practice-question-card">
      <div class="question-number">
        Question ${index + 1}
      </div>

      <h3>${escapeHtml(questionTitle)}</h3>

      ${description ? `<p>${escapeHtml(description)}</p>` : ""}

      <div class="options-list">
        ${optionsHTML || "<p>No options available for this question.</p>"}
      </div>
    </div>
  `;
}

/* =========================
   ERROR RENDERING
========================= */

function renderLoadError(error) {
  const mount = document.getElementById("psetBody");

  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <div class="mcq-card">
      <h3>Unable to load practice set</h3>
      <p>${escapeHtml(error.message)}</p>
    </div>
  `;
}

/* =========================
   INIT PRACTICE PAGE
========================= */

async function init() {
  const { cat, name } = getParams();

  if (typeof renderBreadcrumb === "function") {
    renderBreadcrumb(cat, name);
  }

  if (typeof renderHead === "function") {
    renderHead(cat, name);
  }

  try {
    const { practiceSet, practiceSetId } = await resolvePracticeSet();

    const titleElement = document.getElementById("psetTitle");

    const subtitleElement = document.getElementById("psetSubtitle");

    if (titleElement) {
      titleElement.textContent = practiceSet.title || "Practice Set";
    }

    if (subtitleElement) {
      subtitleElement.textContent = practiceSet.description || "";
    }

    const mount = document.getElementById("psetBody");

    if (!mount) {
      throw new Error("Practice set container (#psetBody) not found.");
    }

    const questions = Array.isArray(practiceSet.questions)
      ? practiceSet.questions
      : [];

    if (questions.length === 0) {
      mount.innerHTML = `
        <div class="mcq-card">
          <h3>No questions available</h3>
          <p>
            This practice set does not contain any
            questions yet.
          </p>
        </div>
      `;

      return;
    }

    const attemptResponse = await startPracticeAttempt(practiceSetId);

    const attempt =
      attemptResponse.attempt || attemptResponse.data || attemptResponse;

    const attemptId = attempt._id || attempt.id;

    if (!attemptId) {
      throw new Error("Practice attempt ID was not returned by backend.");
    }

    const questionsHTML = questions
      .map((question, index) => renderQuestion(question, index))
      .join("");

    mount.innerHTML = `
      <div class="practice-test-container">
        ${questionsHTML}

        <div class="practice-actions">
          <button
            type="button"
            class="btn btn-primary"
            id="submitPracticeBtn"
          >
            Submit Practice
          </button>
        </div>

        <div
          id="practiceSubmitMessage"
          style="margin-top: 15px;"
        ></div>
      </div>
    `;

    const submitButton = document.getElementById("submitPracticeBtn");

    const messageBox = document.getElementById("practiceSubmitMessage");

    if (!submitButton || !messageBox) {
      throw new Error("Practice submission controls were not created.");
    }

    submitButton.addEventListener("click", async () => {
      try {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        const answers = questions.map((question) => {
          const questionId = question._id || question.id;

          const selected = document.querySelector(
            `input[name="question-${questionId}"]:checked`,
          );

          return {
            questionId,
            answer: selected ? selected.value : "",
          };
        });

        const result = await submitPracticeAttempt(attemptId, answers);

        const resultAttempt = result.attempt || result.data || result;

        const score = resultAttempt.score ?? result.score ?? 0;

        const totalQuestions =
          resultAttempt.totalQuestions ??
          result.totalQuestions ??
          questions.length;

        messageBox.innerHTML = `
            <div class="mcq-card">
              <h3>
                Practice submitted successfully
              </h3>

              <p>
                Score:
                <strong>
                  ${escapeHtml(score)}
                  /
                  ${escapeHtml(totalQuestions)}
                </strong>
              </p>

              <button
                type="button"
                class="btn btn-primary"
                id="viewResultBtn"
              >
                View Result
              </button>
            </div>
          `;

        submitButton.style.display = "none";

        const viewResultBtn = document.getElementById("viewResultBtn");

        if (viewResultBtn) {
          viewResultBtn.addEventListener("click", () => {
            window.location.href = `attempt-result.html?id=${encodeURIComponent(attemptId)}`;
          });
        }
      } catch (error) {
        console.error("Practice submission error:", error);

        messageBox.innerHTML = `
            <div class="mcq-card">
              <h3>Submission failed</h3>
              <p>${escapeHtml(error.message)}</p>
            </div>
          `;

        submitButton.disabled = false;
        submitButton.textContent = "Submit Practice";
      }
    });
  } catch (error) {
    console.error("Practice set loading error:", error);

    renderLoadError(error);
  }
}

/* =========================
   START
========================= */

init();
