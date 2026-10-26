const TOPIC_PRACTICE_API_BASE_URL = "/api";

function getTopicPracticeParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    cat: params.get("cat") || "",
    name: params.get("name") || "",
  };
}

function getTopicPracticeToken() {
  const token = localStorage.getItem("prepvanta-token");

  if (!token) {
    throw new Error("Authentication token not found. Please login first.");
  }

  return token;
}

function escapeTopicPracticeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTopicCategory(category) {
  const categoryMap = {
    aptitude: "Aptitude",
    reasoning: "Reasoning",
    topics: "Technical",
  };

  const key = String(category || "").trim().toLowerCase();

  return categoryMap[key] || String(category || "").trim();
}

function getTopicBackLink(category) {
  const categoryMap = {
    aptitude: "aptitude.html",
    reasoning: "reasoning.html",
    topics: "topics.html",
  };

  return categoryMap[String(category || "").trim().toLowerCase()] || "topics.html";
}

async function resolveTopic(category, name) {
  const token = getTopicPracticeToken();
  const dbCategory = getTopicCategory(category);

  const query = new URLSearchParams({
    category: dbCategory,
    search: name,
  });

  const response = await fetch(
    `${TOPIC_PRACTICE_API_BASE_URL}/topics?${query.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load topic.");
  }

  const topics = await response.json();

  const topic = Array.isArray(topics)
    ? topics.find(
        (item) =>
          String(item.name || "").trim().toLowerCase() ===
          String(name || "").trim().toLowerCase(),
      )
    : null;

  if (!topic) {
    throw new Error(`Published topic "${name}" was not found.`);
  }

  return topic;
}

async function loadTopicPractice(topicId) {
  const token = getTopicPracticeToken();

  const response = await fetch(
    `${TOPIC_PRACTICE_API_BASE_URL}/questions/topic-practice/${encodeURIComponent(topicId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to load topic questions.");
  }

  return response.json();
}

async function checkTopicPracticeAnswers(topicId, answers) {
  const token = getTopicPracticeToken();

  const response = await fetch(
    `${TOPIC_PRACTICE_API_BASE_URL}/questions/topic-practice/${encodeURIComponent(topicId)}/check`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answers }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to check answers.");
  }

  return response.json();
}

async function getTopicSolvedStatus(topicId) {
  const response = await fetch(
    `${TOPIC_PRACTICE_API_BASE_URL}/questions/topic-practice/${encodeURIComponent(topicId)}/status`,
    {
      headers: {
        Authorization: `Bearer ${getTopicPracticeToken()}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to load saved question progress.");
  }

  return response.json();
}
async function revealTopicPracticeSubjectiveAnswer(topicId, questionId) {
  const token = getTopicPracticeToken();

  const response = await fetch(
    `${TOPIC_PRACTICE_API_BASE_URL}/questions/topic-practice/${encodeURIComponent(topicId)}/subjective/${encodeURIComponent(questionId)}/answer`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to reveal answer.");
  }

  return response.json();
}
function renderTopicPracticeQuestion(question, index) {
  const questionId = question._id || question.id;
  const options = Array.isArray(question.options) ? question.options : [];

  const optionsHtml = options
    .map(
      (option) => `
        <label class="mcq-option" data-option>
          <input
            type="radio"
            name="topic-question-${escapeTopicPracticeHtml(questionId)}"
            value="${escapeTopicPracticeHtml(option.text || "")}"
            data-question-id="${escapeTopicPracticeHtml(questionId)}"
          >
          <span>${escapeTopicPracticeHtml(option.text || "")}</span>
        </label>
      `,
    )
    .join("");

  return `
    <div
      class="mcq-card practice-question-card"
      data-question-card="${escapeTopicPracticeHtml(questionId)}"
    >
      <div class="question-number">
        Question ${index + 1}
      </div>

      <h3>${escapeTopicPracticeHtml(question.title || "Question")}</h3>

      ${
        question.description
          ? `<p>${escapeTopicPracticeHtml(question.description)}</p>`
          : ""
      }

      <div class="options-list">
        ${optionsHtml || "<p>No options available for this question.</p>"}
      </div>

      <div data-answer-feedback></div>
    </div>
  `;
}

function renderTopicPracticeSubjectiveQuestion(question, index) {
  const questionId = question._id || question.id;

  return `
    <div
      class="mcq-card practice-question-card subjective-practice-card"
      data-subjective-card="${escapeTopicPracticeHtml(questionId)}"
    >
      <div class="question-number">
        Question ${index + 1}
      </div>

      <h3>${escapeTopicPracticeHtml(question.title || "Question")}</h3>

      ${
        question.description
          ? `<p>${escapeTopicPracticeHtml(question.description)}</p>`
          : ""
      }

      <div class="subjective-practice-actions">
        <button
          type="button"
          class="btn btn-primary"
          data-show-subjective-answer="${escapeTopicPracticeHtml(questionId)}"
        >
          Show Answer
        </button>
      </div>

      <div
        class="subjective-answer-container"
        data-subjective-answer="${escapeTopicPracticeHtml(questionId)}"
        hidden
      ></div>
    </div>
  `;
}

function renderTopicPracticeCodingQuestion(question, index, topicId) {
  return `
    <div class="mcq-card practice-question-card coding-practice-card">
      <div class="question-number">
        Question ${index + 1}
      </div>

      <div class="coding-practice-heading">
        <h3>${escapeTopicPracticeHtml(question.title || "Coding Question")}</h3>
        <span class="qtype-badge">
          ${escapeTopicPracticeHtml(question.difficulty || "coding")}
        </span>
      </div>

      ${
        question.description
          ? `<p>${escapeTopicPracticeHtml(question.description)}</p>`
          : ""
      }

      <div class="coding-practice-actions">
        <a class="btn btn-primary" href="compiler.html?mode=practice&topic=${encodeURIComponent(topicId)}&question=${encodeURIComponent(question._id || question.id)}">
          <i class="fa-solid fa-code"></i>
          Practice in Compiler
        </a>
      </div>
    </div>
  `;
}
function renderTopicPracticeError(error) {
  const mount = document.getElementById("topicPracticeBody");

  if (!mount) {
    return;
  }

  mount.innerHTML = `
    <div class="mcq-card">
      <h3>Unable to load topic practice</h3>
      <p>${escapeTopicPracticeHtml(error.message)}</p>
    </div>
  `;
}

async function initTopicPractice() {
  const { cat, name } = getTopicPracticeParams();

  const breadcrumb = document.getElementById("topicPracticeBreadcrumb");
  const title = document.getElementById("topicPracticeTitle");
  const subtitle = document.getElementById("topicPracticeSubtitle");
  const mount = document.getElementById("topicPracticeBody");

  if (!breadcrumb || !title || !subtitle || !mount) {
    return;
  }

  if (!cat || !name) {
    renderTopicPracticeError(
      new Error("Topic category or topic name is missing from the URL."),
    );
    return;
  }

  const backLink = getTopicBackLink(cat);
  const categoryLabel = getTopicCategory(cat);

  breadcrumb.innerHTML = `
    <a href="${escapeTopicPracticeHtml(backLink)}">
      ${escapeTopicPracticeHtml(categoryLabel)}
    </a>
    <span>/</span>
    <span class="current">${escapeTopicPracticeHtml(name)}</span>
  `;

  title.textContent = `${name} Practice`;
  subtitle.textContent = "Loading published questions...";

  try {
    const topic = await resolveTopic(cat, name);
    const data = await loadTopicPractice(topic._id);

    const solvedQuestionIds = new Set();

    try {
      const savedProgress = await getTopicSolvedStatus(topic._id);

      (savedProgress.solvedQuestionIds || []).forEach((questionId) => {
        solvedQuestionIds.add(String(questionId));
      });
    } catch (error) {
      console.warn("Could not load saved question progress:", error);
    }

    const allQuestions = Array.isArray(data.questions) ? data.questions : [];
    const isTechnical = getTopicCategory(cat) === "Technical";

    const questionsByType = {
      objective: allQuestions.filter(
        (question) => question.type === "objective",
      ),
      subjective: allQuestions.filter(
        (question) => question.type === "subjective",
      ),
      coding: allQuestions.filter(
        (question) => question.type === "coding",
      ),
    };

    const allowedTypes = isTechnical
      ? ["objective", "subjective", "coding"]
      : ["objective"];

    let questionSearch = "";
    let selectedDifficulty = "all";
    let currentQuestionId = null;

    let activeType =
      allowedTypes.find((type) => questionsByType[type].length > 0) ||
      allowedTypes[0];

    title.textContent = `${topic.name} Practice`;

    function updateSubtitle(type) {
      const count = questionsByType[type].length;
      const label =
        type === "objective"
          ? "objective"
          : type === "subjective"
            ? "subjective"
            : "coding";

      subtitle.textContent =
        `${count} published ${label} question${count === 1 ? "" : "s"} in this topic.`;
    }

    function renderTypeSwitcher() {
      if (!isTechnical) {
        return "";
      }

      const labels = {
        objective: "Objective",
        subjective: "Subjective",
        coding: "Coding",
      };

      return `
        <div class="topic-practice-type-switcher" role="tablist" aria-label="Question type">
          ${allowedTypes
            .map(
              (type) => `
                <button
                  type="button"
                  class="topic-practice-type-btn${type === activeType ? " active" : ""}"
                  data-topic-practice-type="${type}"
                  role="tab"
                  aria-selected="${type === activeType ? "true" : "false"}"
                >
                  ${labels[type]}
                  <span>${questionsByType[type].length}</span>
                </button>
              `,
            )
            .join("")}
        </div>
      `;
    }

    function renderEmptyType(type) {
      const labels = {
        objective: "objective",
        subjective: "subjective",
        coding: "coding",
      };

      return `
        <div class="mcq-card topic-practice-empty">
          <h3>No ${labels[type]} questions available</h3>
          <p>
            This topic does not have published ${labels[type]} questions yet.
          </p>
        </div>
      `;
    }

    function renderObjectivePractice(questions) {
      if (questions.length === 0) {
        return renderEmptyType("objective");
      }

      return `
        <div class="topic-practice-layout">

          <aside class="topic-question-navigator">
            <button
              type="button"
              class="topic-nav-toggle"
              id="topicNavigatorToggle"
              aria-expanded="false"
            >
              Question Navigator
              <span>&#9662;</span>
            </button>

            <div class="topic-navigator-inner" id="topicNavigatorInner">
              <h3 class="topic-navigator-heading">Question Navigator</h3>

              <p id="topicSolvedCount">0 of ${questions.length} correctly solved</p>

              <div class="topic-progress-track">
                <div id="topicProgressFill"></div>
              </div>

              <div class="topic-number-grid" id="topicNumberGrid"></div>

              <p class="topic-nav-legend">
                &#10003; Solved &nbsp; &#9675; Not Solved &nbsp; &#9679; Current
              </p>
            </div>
          </aside>

          <div class="topic-active-question" id="topicActiveQuestion"></div>

        </div>
      `;
    }
    function renderSubjectivePractice(questions) {
      if (questions.length === 0) {
        return renderEmptyType("subjective");
      }

      return `
        <div class="practice-test-container">
          ${questions
            .map((question, index) =>
              renderTopicPracticeSubjectiveQuestion(question, index),
            )
            .join("")}
        </div>
      `;
    }

    function renderCodingPractice(questions) {
      if (questions.length === 0) {
        return renderEmptyType("coding");
      }

      return `
        <div class="practice-test-container">
          ${questions
            .map((question, index) =>
              renderTopicPracticeCodingQuestion(question, index, topic._id),
            )
            .join("")}
        </div>
      `;
    }

    function bindObjectivePractice(questions) {
      const grid = document.getElementById("topicNumberGrid");
      const activeQuestion = document.getElementById("topicActiveQuestion");
      const solvedCount = document.getElementById("topicSolvedCount");
      const progressFill = document.getElementById("topicProgressFill");
      const navigatorToggle = document.getElementById("topicNavigatorToggle");
      const navigatorInner = document.getElementById("topicNavigatorInner");

      if (!grid || !activeQuestion) return;

      if (!questions.some((question) =>
        String(question._id || question.id) === String(currentQuestionId)
      )) {
        currentQuestionId = String(questions[0]._id || questions[0].id);
      }

      const questionId = (question) => String(question._id || question.id);

      function updateNavigator() {
        const allObjectiveQuestions = questionsByType.objective;
        const total = allObjectiveQuestions.length;
        const solved = allObjectiveQuestions.filter((question) =>
          solvedQuestionIds.has(questionId(question))
        ).length;

        if (solvedCount) {
          solvedCount.textContent = `${solved} of ${total} correctly solved`;
        }

        if (progressFill) {
          progressFill.style.width = `${total ? (solved / total) * 100 : 0}%`;
        }

        grid.innerHTML = questions.map((question, index) => {
          const id = questionId(question);
          const isSolved = solvedQuestionIds.has(id);
          const isCurrent = id === currentQuestionId;

          const originalIndex = allObjectiveQuestions.findIndex(
            (item) => questionId(item) === id
          );

          return `
            <button
              type="button"
              class="topic-number-btn${isSolved ? " is-solved" : ""}${isCurrent ? " is-current" : ""}"
              data-navigate-question="${escapeTopicPracticeHtml(id)}"
              aria-label="Question ${originalIndex + 1}${isSolved ? ", solved" : ""}"
              aria-current="${isCurrent ? "true" : "false"}"
            >
              ${originalIndex + 1}${isSolved ? " &#10003;" : ""}
            </button>
          `;
        }).join("");

        grid.querySelectorAll("[data-navigate-question]").forEach((button) => {
          button.addEventListener("click", () => {
            currentQuestionId = button.dataset.navigateQuestion;
            renderCurrentQuestion();
          });
        });
      }

      function renderCurrentQuestion() {
        const index = questions.findIndex(
          (question) => questionId(question) === currentQuestionId
        );

        if (index < 0) return;

        const question = questions[index];
        const id = questionId(question);
        const solved = solvedQuestionIds.has(id);

        const originalIndex = questionsByType.objective.findIndex(
          (item) => questionId(item) === id
        );

        activeQuestion.innerHTML = `
          ${solved ? '<div class="topic-already-solved">&#10003; Already Solved</div>' : ""}

          ${renderTopicPracticeQuestion(question, originalIndex)}

          <div class="topic-question-actions">
            <button type="button" id="topicPreviousQuestion"
              ${index === 0 ? "disabled" : ""}>
              &larr; Previous
            </button>

            <button type="button" id="topicCheckSingleAnswer">
              Check Answer
            </button>

            <button type="button" id="topicNextQuestion"
              ${index === questions.length - 1 ? "disabled" : ""}>
              Next &rarr;
            </button>
          </div>
        `;

        updateNavigator();

        const previous = document.getElementById("topicPreviousQuestion");
        const next = document.getElementById("topicNextQuestion");
        const check = document.getElementById("topicCheckSingleAnswer");

        previous.addEventListener("click", () => {
          if (index > 0) {
            currentQuestionId = questionId(questions[index - 1]);
            renderCurrentQuestion();
          }
        });

        next.addEventListener("click", () => {
          if (index < questions.length - 1) {
            currentQuestionId = questionId(questions[index + 1]);
            renderCurrentQuestion();
          }
        });

        check.addEventListener("click", async () => {
          const selected = activeQuestion.querySelector(
            `input[name="topic-question-${CSS.escape(id)}"]:checked`
          );

          const feedback = activeQuestion.querySelector(
            "[data-answer-feedback]"
          );

          if (!selected) {
            if (feedback) {
              feedback.textContent = "Please select an answer first.";
            }
            return;
          }

          const selectedAnswer = selected.value;

          check.disabled = true;
          check.textContent = "Checking...";

          try {
            const response = await checkTopicPracticeAnswers(topic._id, [
              { questionId: id, answer: selectedAnswer }
            ]);

            const result = (response.results || []).find(
              (item) => String(item.questionId) === id
            );

            if (!result || !result.valid) {
              throw new Error("Unable to check this answer.");
            }

            if (currentQuestionId !== id) return;

            if (result.isCorrect) {
              solvedQuestionIds.add(id);

              const card = activeQuestion.querySelector(
                "[data-question-card]"
              );

              if (card) {
                card.querySelectorAll("[data-option]").forEach((label) => {
                  const input = label.querySelector("input");
                  if (input && input.checked) {
                    label.classList.add("correct");
                  }
                  if (input) input.disabled = true;
                });
              }

              const details =
                result.explanation ||
                result.solution ||
                "No explanation available.";

              if (feedback) {
                feedback.innerHTML = `
                  <div class="answer-reveal is-correct">
                    <strong>Correct!</strong><br>
                    ${escapeTopicPracticeHtml(details)}
                  </div>
                `;
              }

              if (!activeQuestion.querySelector(".topic-already-solved")) {
                activeQuestion.insertAdjacentHTML(
                  "afterbegin",
                  '<div class="topic-already-solved">&#10003; Already Solved</div>'
                );
              }

              check.textContent = "Correct";
              check.disabled = true;
              updateNavigator();
            } else {
              if (feedback) {
                feedback.innerHTML = `
                  <div class="topic-try-again">
                    Incorrect. Try Again!
                  </div>
                `;
              }

              check.disabled = false;
              check.textContent = "Check Answer";
            }
          } catch (error) {
            if (currentQuestionId !== id) return;

            if (feedback) {
              feedback.textContent = error.message;
            }

            check.disabled = false;
            check.textContent = "Check Answer";
          }
        });
      }

      if (navigatorToggle && navigatorInner) {
        navigatorToggle.addEventListener("click", () => {
          const expanded =
            navigatorToggle.getAttribute("aria-expanded") === "true";

          navigatorToggle.setAttribute("aria-expanded", String(!expanded));
          navigatorInner.classList.toggle("is-open", !expanded);
        });
      }

      renderCurrentQuestion();
    }

    function bindSubjectivePractice() {
      const buttons = mount.querySelectorAll(
        "[data-show-subjective-answer]",
      );

      buttons.forEach((button) => {
        button.addEventListener("click", async () => {
          const questionId = button.dataset.showSubjectiveAnswer;
          const answerContainer = mount.querySelector(
            `[data-subjective-answer="${CSS.escape(String(questionId))}"]`,
          );

          if (!answerContainer) {
            return;
          }

          if (button.dataset.loaded === "true") {
            const shouldHide = !answerContainer.hidden;
            answerContainer.hidden = shouldHide;
            button.textContent = shouldHide ? "Show Answer" : "Hide Answer";
            return;
          }

          button.disabled = true;
          button.textContent = "Loading...";

          try {
            const result = await revealTopicPracticeSubjectiveAnswer(
              topic._id,
              questionId,
            );

            const explanation =
              result.explanation || result.solution || "";

            answerContainer.innerHTML = `
              <div class="subjective-answer-reveal">
                <div>
                  <strong>Answer</strong>
                  <p>
                    ${escapeTopicPracticeHtml(result.answer || "No answer available.")}
                  </p>
                </div>

                ${
                  explanation
                    ? `
                      <div class="subjective-answer-explanation">
                        <strong>Explanation</strong>
                        <p>${escapeTopicPracticeHtml(explanation)}</p>
                      </div>
                    `
                    : ""
                }
              </div>
            `;

            answerContainer.hidden = false;
            button.dataset.loaded = "true";
            button.textContent = "Hide Answer";
          } catch (error) {
            answerContainer.innerHTML = `
              <div class="topic-practice-inline-error">
                ${escapeTopicPracticeHtml(error.message)}
              </div>
            `;
            answerContainer.hidden = false;
            button.textContent = "Show Answer";
          } finally {
            button.disabled = false;
          }
        });
      });
    }

    function getFilteredQuestions() {
      return questionsByType[activeType].filter((question) => {
        const searchableText = `${question.title || ""} ${question.description || ""}`.toLowerCase();
        const matchesSearch = searchableText.includes(questionSearch.toLowerCase());
        const matchesDifficulty =
          selectedDifficulty === "all" ||
          String(question.difficulty || "").toLowerCase() === selectedDifficulty;

        return matchesSearch && matchesDifficulty;
      });
    }

    function renderQuestionFilters() {
      return `
        <div class="mcq-card" style="margin:20px 0;padding:20px;">
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
            <input
              id="questionSearchInput"
              type="search"
              placeholder="Search questions..."
              value="${escapeTopicPracticeHtml(questionSearch)}"
              aria-label="Search questions"
              style="flex:2;min-width:200px;padding:12px;border:1px solid #aaa;border-radius:8px;"
            >

            <select
              id="questionDifficultyFilter"
              aria-label="Filter by difficulty"
              style="flex:1;min-width:150px;padding:12px;border:1px solid #aaa;border-radius:8px;"
            >
              <option value="all" ${selectedDifficulty === "all" ? "selected" : ""}>All Difficulties</option>
              <option value="easy" ${selectedDifficulty === "easy" ? "selected" : ""}>Easy</option>
              <option value="medium" ${selectedDifficulty === "medium" ? "selected" : ""}>Medium</option>
              <option value="hard" ${selectedDifficulty === "hard" ? "selected" : ""}>Hard</option>
            </select>

            <button type="button" class="btn btn-primary" id="resetQuestionFilters">
              Reset Filters
            </button>
          </div>
        </div>
      `;
    }
    function renderActiveType() {
      const questions = getFilteredQuestions();

      updateSubtitle(activeType);
      subtitle.textContent = `${questions.length} matching question${questions.length === 1 ? "" : "s"} in this topic.`;

      let content = "";

      if (activeType === "objective") {
        content = renderObjectivePractice(questions);
      } else if (activeType === "subjective") {
        content = renderSubjectivePractice(questions);
      } else {
        content = renderCodingPractice(questions);
      }

      mount.innerHTML = `
        ${renderTypeSwitcher()}
        ${renderQuestionFilters()}
        <div class="topic-practice-type-content">
          ${content}
        </div>
      `;

      mount
        .querySelectorAll("[data-topic-practice-type]")
        .forEach((button) => {
          button.addEventListener("click", () => {
            activeType = button.dataset.topicPracticeType;
            renderActiveType();
          });
        });

      const searchInput = document.getElementById("questionSearchInput");
      const difficultySelect = document.getElementById("questionDifficultyFilter");
      const resetButton = document.getElementById("resetQuestionFilters");

      searchInput?.addEventListener("input", (event) => {
        questionSearch = event.target.value;
        const cursor = event.target.selectionStart;
        renderActiveType();
        const nextInput = document.getElementById("questionSearchInput");
        nextInput?.focus();
        if (cursor !== null) nextInput?.setSelectionRange(cursor, cursor);
      });

      difficultySelect?.addEventListener("change", (event) => {
        selectedDifficulty = event.target.value;
        renderActiveType();
      });

      resetButton?.addEventListener("click", () => {
        questionSearch = "";
        selectedDifficulty = "all";
        renderActiveType();
      });
      if (activeType === "objective") {
        bindObjectivePractice(questions);
      } else if (activeType === "subjective") {
        bindSubjectivePractice();
      }
    }

    renderActiveType();
  } catch (error) {
    subtitle.textContent = "";
    renderTopicPracticeError(error);
  }
}
document.addEventListener("DOMContentLoaded", initTopicPractice);
