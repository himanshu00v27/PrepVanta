/* ===================================
   PREPVANTA COMPILER
=================================== */

(function () {
  const API_BASE = "http://localhost:5000/api/compiler";

  const langSelect = document.getElementById("langSelect");
  const codeArea = document.getElementById("codeArea");
  const inputArea = document.getElementById("inputArea");
  const consoleArea = document.getElementById("consoleArea");
  const runBtn = document.getElementById("runBtn");

  const executionMeta = document.getElementById("executionMeta");
  const executionStatus = document.getElementById("executionStatus");
  const executionTime = document.getElementById("executionTime");
  const executionMemory = document.getElementById("executionMemory");

  if (!langSelect || !codeArea || !inputArea || !consoleArea || !runBtn) {
    console.error("Compiler UI could not be initialized.");
    return;
  }

  /* ===================================
       CODING QUESTION PRACTICE MODE
    =================================== */

  const practiceQuestionPanel = document.getElementById(
    "compilerPracticeQuestion",
  );
  const practiceQuestionTitle = document.getElementById(
    "compilerPracticeQuestionTitle",
  );
  const practiceDifficulty = document.getElementById(
    "compilerPracticeDifficulty",
  );
  const practiceTopic = document.getElementById("compilerPracticeTopic");
  const practiceDescription = document.getElementById(
    "compilerPracticeDescription",
  );
  const practiceError = document.getElementById("compilerPracticeError");

  let practiceTopicId = null;
  let practiceQuestionId = null;

  async function initCodingPracticeMode() {
    const params = new URLSearchParams(window.location.search);

    if (params.get("mode") !== "practice") {
      return;
    }

    practiceTopicId = params.get("topic");
    practiceQuestionId = params.get("question");

    const topicId = practiceTopicId;
    const questionId = practiceQuestionId;

    if (!practiceQuestionPanel) {
      return;
    }

    practiceQuestionPanel.hidden = false;

    if (!topicId || !questionId) {
      if (practiceError) {
        practiceError.hidden = false;
        practiceError.textContent =
          "This coding practice link is incomplete. Please return to the topic and open the question again.";
      }

      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = "login.html";
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/questions/topic-practice/${encodeURIComponent(topicId)}/coding/${encodeURIComponent(questionId)}`,
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
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load this coding question.",
        );
      }

      const question = data.question || {};
      const topic = data.topic || {};

      if (practiceQuestionTitle) {
        practiceQuestionTitle.textContent =
          question.title || "Coding Question";
      }

      if (practiceDifficulty) {
        practiceDifficulty.textContent =
          question.difficulty || "Coding";
      }

      if (practiceTopic) {
        practiceTopic.textContent = topic.name
          ? `Topic: ${topic.name}`
          : "";
      }

      if (practiceDescription) {
        practiceDescription.textContent =
          question.description || "No question description provided.";
      }

      document.title = question.title
        ? `${question.title} | PrepVanta`
        : "Coding Practice | PrepVanta";
    } catch (error) {
      console.error("Coding practice question error:", error);

      if (practiceError) {
        practiceError.hidden = false;
        practiceError.textContent =
          error.message || "Unable to load this coding question.";
      }
    }
  }
  /* ===================================
       STARTER CODE
    =================================== */

  const samples = {
    javascript: `console.log("Hello from PrepVanta");`,

    python: `print("Hello from PrepVanta")`,

    java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from PrepVanta");
    }
}`,

    c: `#include <stdio.h>

int main() {
    printf("Hello from PrepVanta\\n");
    return 0;
}`,

    cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from PrepVanta" << endl;
    return 0;
}`,

    sql: `SELECT 'Hello from PrepVanta' AS message;`,
  };

  /* ===================================
       EDITOR
    =================================== */

  function loadSample(language) {
    codeArea.value = samples[language] || "// Write your code here";
  }

  loadSample(langSelect.value);
  initCodingPracticeMode();

  langSelect.addEventListener("change", function () {
    loadSample(langSelect.value);
    clearOutput();
  });

  /* ===================================
       OUTPUT HELPERS
    =================================== */

  function clearOutput() {
    consoleArea.innerHTML = "";

    executionMeta.hidden = true;
    executionStatus.textContent = "--";
    executionTime.textContent = "--";
    executionMemory.textContent = "--";
  }

  function printOutput(text, className = "") {
    const line = document.createElement("div");

    if (className) {
      line.className = className;
    }

    line.textContent = text;
    consoleArea.appendChild(line);
  }

  function setRunningState(running) {
    runBtn.disabled = running;

    if (running) {
      runBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
    } else {
      runBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Code';
    }
  }

  function showExecutionMeta(run) {
    executionMeta.hidden = false;

    executionStatus.textContent = run.status || "unknown";

    executionTime.textContent =
      typeof run.executionTime === "number" ? `${run.executionTime}s` : "--";

    executionMemory.textContent =
      typeof run.memoryUsed === "number" ? `${run.memoryUsed} KB` : "--";
  }

  /* ===================================
       AUTHENTICATION
    =================================== */

  function getToken() {
    return localStorage.getItem("prepvanta-token");
  }

  /* ===================================
       RUN CODE
    =================================== */

  async function runCode() {
    const token = getToken();

    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const language = langSelect.value;
    const code = codeArea.value;
    const input = inputArea.value;

    if (!code.trim()) {
      clearOutput();
      printOutput("Please enter some code before running.", "err");
      return;
    }

    clearOutput();
    setRunningState(true);

    printOutput(
      `Running ${langSelect.options[langSelect.selectedIndex].text}...`,
      "muted",
    );

    try {
      const response = await fetch(`${API_BASE}/run`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          language,
          code,
          input,
          ...(practiceTopicId && practiceQuestionId
            ? {
                topicId: practiceTopicId,
                questionId: practiceQuestionId,
              }
            : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("prepvanta-token");
        localStorage.removeItem("prepvanta-user");

        window.location.href = "login.html";
        return;
      }

      if (response.status === 403) {
        throw new Error(data.message || "Your account cannot execute code.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to execute code.");
      }

      const run = data.run;

      if (!run) {
        throw new Error("Invalid response from the compiler.");
      }

      consoleArea.innerHTML = "";

      const suppressPracticeOutput =
        practiceTopicId &&
        practiceQuestionId &&
        !input.trim();

      if (run.output && !suppressPracticeOutput) {
        printOutput(run.output, "ok");
      }

      if (run.error) {
        printOutput(run.error, "err");
      }

      if (!run.output && !run.error && !suppressPracticeOutput) {
        printOutput("Program finished without producing output.", "muted");
      }

      if (data.judging) {
        const passedTests = Number(data.judging.passedTests) || 0;
        const totalTests = Number(data.judging.totalTests) || 0;

        if (data.judging.allPassed) {
          printOutput(
            `All ${totalTests} test case${totalTests === 1 ? "" : "s"} passed.`,
            "ok",
          );
        } else if (totalTests > 0) {
          printOutput(
            `Passed ${passedTests}/${totalTests} test cases.`,
            "err",
          );
        } else {
          printOutput(
            "This coding question does not have test cases configured yet.",
            "muted",
          );
        }
      }

      showExecutionMeta(run);
    } catch (error) {
      console.error("Compiler error:", error);

      consoleArea.innerHTML = "";

      printOutput(error.message || "Unable to execute code.", "err");
    } finally {
      setRunningState(false);
    }
  }

  /* ===================================
       EVENTS
    =================================== */

  runBtn.addEventListener("click", runCode);

  codeArea.addEventListener("keydown", function (event) {
    if (event.key === "Tab") {
      event.preventDefault();

      const start = codeArea.selectionStart;
      const end = codeArea.selectionEnd;

      codeArea.value =
        codeArea.value.substring(0, start) +
        "    " +
        codeArea.value.substring(end);

      codeArea.selectionStart = codeArea.selectionEnd = start + 4;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      runCode();
    }
  });
})();




