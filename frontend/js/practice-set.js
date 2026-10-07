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
        <label class="mcq-option">
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
   PRACTICE TIMER
========================= */

function formatPracticeTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updatePracticeTimerDisplay(timerElement, remainingSeconds) {
  if (!timerElement) {
    return;
  }

  timerElement.classList.remove("is-warning", "is-danger", "is-expired");

  if (remainingSeconds <= 0) {
    timerElement.classList.add("is-expired");
  } else if (remainingSeconds <= 60) {
    timerElement.classList.add("is-danger");
  } else if (remainingSeconds <= 300) {
    timerElement.classList.add("is-warning");
  }

  const timeValue = timerElement.querySelector("[data-practice-time]");

  if (timeValue) {
    timeValue.textContent = formatPracticeTime(remainingSeconds);
  }
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

    const durationMinutes = Number(practiceSet.duration);

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new Error("Practice set has an invalid duration.");
    }

    const durationSeconds = Math.floor(durationMinutes * 60);

    const startedAtTime = new Date(attempt.startedAt).getTime();

    const elapsedSeconds = Number.isFinite(startedAtTime)
      ? Math.max(0, Math.floor((Date.now() - startedAtTime) / 1000))
      : 0;

    const expiresAt = Date.now() + Math.max(0, durationSeconds - elapsedSeconds) * 1000;

    let remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    let timerInterval = null;
    let isSubmitting = false;
    let isSubmitted = false;

    mount.innerHTML = `
      <div class="practice-test-container">
        <div class="practice-timer-bar" id="practiceTimerBar">
          <div class="practice-timer-info">
            <i class="fas fa-hourglass-half" aria-hidden="true"></i>
            <span>
              Time limit: ${escapeHtml(durationMinutes)} minute${durationMinutes === 1 ? "" : "s"}
            </span>
          </div>

          <div
            class="practice-timer"
            id="practiceTimer"
            role="timer"
            aria-live="off"
          >
            <i class="fas fa-clock" aria-hidden="true"></i>
            <span data-practice-time>
              ${formatPracticeTime(remainingSeconds)}
            </span>
          </div>
        </div>

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
    const timerElement = document.getElementById("practiceTimer");
    const timerBar = document.getElementById("practiceTimerBar");

    if (!submitButton || !messageBox || !timerElement || !timerBar) {
      throw new Error("Practice controls were not created.");
    }

    function collectPracticeAnswers() {
      return questions.map((question) => {
        const questionId = question._id || question.id;

        const selected = document.querySelector(
          `input[name="question-${questionId}"]:checked`,
        );

        return {
          questionId,
          answer: selected ? selected.value : "",
        };
      });
    }

    function stopPracticeTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    async function completePractice({ timedOut = false } = {}) {
      if (isSubmitting || isSubmitted) {
        return;
      }

      isSubmitting = true;
      stopPracticeTimer();

      submitButton.disabled = true;
      submitButton.textContent = timedOut
        ? "Time expired - submitting..."
        : "Submitting...";

      if (timedOut) {
        remainingSeconds = 0;
        updatePracticeTimerDisplay(timerElement, remainingSeconds);
        timerBar.classList.add("is-expired");

        messageBox.innerHTML = `
          <div class="mcq-card">
            <p>
              Time is up. Your current answers are being submitted automatically.
            </p>
          </div>
        `;
      }

      try {
        const answers = collectPracticeAnswers();

        const result = await submitPracticeAttempt(attemptId, answers);

        const resultAttempt = result.attempt || result.data || result;

        const score = resultAttempt.score ?? result.score ?? 0;

        const totalQuestions =
          resultAttempt.totalQuestions ??
          result.totalQuestions ??
          questions.length;

        isSubmitted = true;

        messageBox.innerHTML = `
          <div class="mcq-card">
            <h3>
              ${timedOut ? "Time is up - practice submitted" : "Practice submitted successfully"}
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

        const answerInputs = mount.querySelectorAll(
          'input[name^="question-"]',
        );

        answerInputs.forEach((input) => {
          input.disabled = true;
        });

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

        if (!timedOut) {
          isSubmitting = false;
          submitButton.disabled = false;
          submitButton.textContent = "Submit Practice";

          timerInterval = setInterval(updateTimer, 1000);
        } else {
          submitButton.disabled = false;
          submitButton.textContent = "Retry Submission";
          isSubmitting = false;
        }
      }
    }

    function updateTimer() {
      if (isSubmitting || isSubmitted) {
        return;
      }

      remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

      updatePracticeTimerDisplay(timerElement, remainingSeconds);

      if (remainingSeconds <= 0) {
        timerBar.classList.add("is-expired");
        completePractice({ timedOut: true });
      }
    }

    updatePracticeTimerDisplay(timerElement, remainingSeconds);

    submitButton.addEventListener("click", () => {
      completePractice({ timedOut: remainingSeconds <= 0 });
    });

    if (remainingSeconds <= 0) {
      timerBar.classList.add("is-expired");
      completePractice({ timedOut: true });
    } else {
      timerInterval = setInterval(updateTimer, 1000);
    }
  } catch (error) {
    console.error("Practice set loading error:", error);

    renderLoadError(error);
  }
}

/* =========================
   START
========================= */

init();





