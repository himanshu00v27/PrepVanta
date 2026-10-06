function getParams() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat") || "topics";
  const name = params.get("name") || "General Practice";
  return { cat, name };
}
/* =========================
   LOAD PRACTICE SET
========================= */
async function loadPracticeSet(practiceSetId) {
  const token = localStorage.getItem("prepvanta-token");
  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }
  const response = await fetch(
    `http://localhost:5000/api/practice/${practiceSetId}`,
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
async function resolvePracticeSetId() {
  const params = new URLSearchParams(window.location.search);
  const directId = params.get("id");
  if (directId) {
    return directId;
  }
  const cat = params.get("cat");
  const name = params.get("name");
  if (!cat || !name) {
    throw new Error(
      "Practice set ID or category/topic information is missing from URL.",
    );
  }
  const token = localStorage.getItem("prepvanta-token");
  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }
  const response = await fetch("http://localhost:5000/api/practice", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to find practice set.");
  }
  const data = await response.json();
  const practiceSets = Array.isArray(data)
    ? data
    : data.practiceSets || data.data || [];
  if (practiceSets.length === 0) {
    throw new Error(`No published practice sets found for "${name}".`);
  }
  const requestedName = name.trim().toLowerCase();
  let matchedSet = practiceSets.find((set) => {
    const title = String(set.title || "")
      .trim()
      .toLowerCase();
    return title === requestedName;
  });
  if (!matchedSet) {
    matchedSet = practiceSets.find((set) => {
      const title = String(set.title || "")
        .trim()
        .toLowerCase();
      return title.includes(requestedName) || requestedName.includes(title);
    });
  }
  if (!matchedSet && practiceSets.length === 1) {
    matchedSet = practiceSets[0];
  }
  if (!matchedSet) {
    throw new Error(`No practice set found for "${name}".`);
  }
  const resolvedId = matchedSet._id || matchedSet.id;
  if (!resolvedId) {
    throw new Error("Practice set ID was not returned by backend.");
  }
  console.log("Resolved practice set ID:", resolvedId);
  return resolvedId;
}
/* =========================
   START PRACTICE ATTEMPT
========================= */
async function startPracticeAttempt(practiceSetId) {
  const token = localStorage.getItem("prepvanta-token");
  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }
  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }
  const response = await fetch(
    `http://localhost:5000/api/attempts/start/${practiceSetId}`,
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
  const token = localStorage.getItem("prepvanta-token");
  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }
  const response = await fetch(
    `http://localhost:5000/api/attempts/${attemptId}/submit`,
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
   INIT PRACTICE PAGE
========================= */
async function init() {
  const { cat, name } = getParams(); /*
   * These functions already exist in the original practice-set.js.
   * Keep them if they are present.
   */
  if (typeof renderBreadcrumb === "function") {
    renderBreadcrumb(cat, name);
  }
  if (typeof renderHead === "function") {
    renderHead(cat, name);
  }
  try {
    /* -------------------------
           GET PRACTICE SET ID
        ------------------------- */
    const practiceSetId = await resolvePracticeSetId();
    console.log(
      "Loading practice set:",
      practiceSetId,
    ); /* -------------------------
           LOAD PRACTICE SET
        ------------------------- */
    const practiceSet = await loadPracticeSet(practiceSetId);
    console.log(
      "Loaded practice set:",
      practiceSet,
    ); /* -------------------------
           NORMALIZE RESPONSE
        ------------------------- */
    const actualPracticeSet =
      practiceSet.practiceSet ||
      practiceSet.data ||
      practiceSet; /* -------------------------
           TITLE + DESCRIPTION
        ------------------------- */
    const titleElement = document.getElementById("psetTitle");
    const subtitleElement = document.getElementById("psetSubtitle");
    if (titleElement) {
      titleElement.textContent = actualPracticeSet.title || "Practice Set";
    }
    if (subtitleElement) {
      subtitleElement.textContent = actualPracticeSet.description || "";
    } /* -------------------------
           QUESTIONS
        ------------------------- */
    const mount = document.getElementById("psetBody");
    if (!mount) {
      throw new Error("Practice set container (#psetBody) not found.");
    }
    const questions = actualPracticeSet.questions || [];
    if (questions.length === 0) {
      mount.innerHTML = `
                <div class="mcq-card">
                    <h3>No questions available</h3>
                    <p>
                        This practice set does not contain
                        any questions yet.
                    </p>
                </div>
            `;
      return;
    } /* -------------------------
           START ATTEMPT
        ------------------------- */
    const attemptResponse = await startPracticeAttempt(practiceSetId);
    console.log("Started attempt:", attemptResponse); /*
     * Support both possible backend responses:
     *
     * { _id: "..." }
     *
     * OR
     *
     * { attempt: { _id: "..." } }
     */
    const attempt =
      attemptResponse.attempt || attemptResponse.data || attemptResponse;
    const attemptId = attempt._id || attempt.id;
    if (!attemptId) {
      throw new Error("Practice attempt ID was not returned by backend.");
    } /* -------------------------
           RENDER QUESTIONS
        ------------------------- */
    const questionsHTML = questions
      .map((question, index) => {
        const questionId = question._id || question.id || `question-${index}`;

        const questionTitle =
          question.question || question.title || question.text || "Question";

        const description = question.description || "";

        const options = Array.isArray(question.options) ? question.options : [];

        const optionsHTML = options
          .map((option, optionIndex) => {
            const optionText =
              typeof option === "object"
                ? option.text || option.label || option.value || ""
                : String(option);

            return `
                <label class="option-item">
                    <input
                        type="radio"
                        name="question-${questionId}"
                        value="${String(optionText).replace(/"/g, "&quot;")}"
                        data-question-id="${questionId}"
                    >
                    <span>
                        ${optionText}
                    </span>
                </label>
            `;
          })
          .join("");

        return `
        <div class="mcq-card practice-question-card">

            <div class="question-number">
                Question ${index + 1}
            </div>

            <h3>
                ${questionTitle}
            </h3>

            ${
              description
                ? `
                        <p>
                            ${description}
                        </p>
                    `
                : ""
            }

            <div class="options-list">
                ${
                  optionsHTML ||
                  `
                        <p>
                            No options available
                            for this question.
                        </p>
                    `
                }
            </div>

        </div>
    `;
      })
      .join("");

    /* -------------------------
   PRACTICE UI
------------------------- */

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
            style="margin-top:15px;"
        ></div>
    </div>
`; /* -------------------------
           SUBMIT BUTTON
        ------------------------- */
    const submitButton = document.getElementById("submitPracticeBtn");
    const messageBox = document.getElementById("practiceSubmitMessage");
    if (!submitButton) {
      throw new Error("Submit Practice button was not created.");
    } /* -------------------------
           SUBMIT PRACTICE
        ------------------------- */
    submitButton.addEventListener("click", async () => {
      try {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting..."; /* -------------------------
                       COLLECT ANSWERS
                    ------------------------- */
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
        console.log(
          "Submitting answers:",
          answers,
        ); /* -------------------------
                       SUBMIT TO BACKEND
                    ------------------------- */
        const result = await submitPracticeAttempt(attemptId, answers);
        console.log("Practice submitted:", result); /* -------------------------
                       RESULT DATA
                    ------------------------- */
        const resultAttempt = result.attempt || result.data || result;
        const score = resultAttempt.score ?? result.score ?? 0;
        const totalQuestions =
          resultAttempt.totalQuestions ??
          result.totalQuestions ??
          questions.length; /* -------------------------
                       SHOW SUCCESS
                    ------------------------- */
        messageBox.innerHTML = `
                        <div class="mcq-card">
                            <h3>
                                Practice submitted successfully
                            </h3>
                            <p>
                                Score:
                                <strong>
                                    ${score}
                                    /
                                    ${totalQuestions}
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
        submitButton.style.display = "none"; /* -------------------------
                       VIEW RESULT
                    ------------------------- */
        const viewResultBtn = document.getElementById("viewResultBtn");
        if (viewResultBtn) {
          viewResultBtn.addEventListener("click", () => {
            window.location.href = `attempt-result.html?id=${attemptId}`;
          });
        }
      } catch (error) {
        console.error("Practice submission error:", error);
        messageBox.innerHTML = `
                        <div class="mcq-card">
                            <h3>
                                Submission failed
                            </h3>
                            <p>
                                ${error.message}
                            </p>
                        </div>
                    `;
        submitButton.disabled = false;
        submitButton.textContent = "Submit Practice";
      }
    });
  } catch (error) {
    console.error("Practice set loading error:", error);
    const mount = document.getElementById("psetBody");
    if (mount) {
      mount.innerHTML = `
                <div class="mcq-card">
                    <h3>
                        Unable to load practice set
                    </h3>
                    <p>
                        ${error.message}
                    </p>
                </div>
            `;
    }
  }
}
/* =========================
   START
========================= */
init();
