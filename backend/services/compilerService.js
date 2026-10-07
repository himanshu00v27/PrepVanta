const JDOODLE_EXECUTE_URL = "https://api.jdoodle.com/v1/execute";

const LANGUAGE_CONFIG = {
  javascript: {
    language: "nodejs",
    versionIndex: "0",
  },
  python: {
    language: "python3",
    versionIndex: "0",
  },
  java: {
    language: "java",
    versionIndex: "0",
  },
  c: {
    language: "c",
    versionIndex: "0",
  },
  cpp: {
    language: "cpp17",
    versionIndex: "0",
  },
  sql: {
    language: "sql",
    versionIndex: "0",
  },
};

function getSupportedLanguages() {
  return Object.keys(LANGUAGE_CONFIG);
}

async function executeCode({ language, code, input = "" }) {
  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    const error = new Error(`Unsupported language: ${language}`);
    error.statusCode = 400;
    throw error;
  }

  if (!code || !code.trim()) {
    const error = new Error("Code is required.");
    error.statusCode = 400;
    throw error;
  }

  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error("Compiler service is not configured.");
    error.statusCode = 500;
    throw error;
  }

  let response;

  try {
    response = await fetch(JDOODLE_EXECUTE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        clientSecret,
        script: code,
        stdin: input,
        language: config.language,
        versionIndex: config.versionIndex,
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      const timeoutError = new Error("Code execution timed out.");
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    const connectionError = new Error(
      "Unable to connect to the compiler service.",
    );
    connectionError.statusCode = 502;
    throw connectionError;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error("Invalid response from compiler service.");
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(
      data.error ||
        data.message ||
        "Compiler service rejected the execution request.",
    );

    error.statusCode = 502;
    throw error;
  }

  const rawOutput = typeof data.output === "string" ? data.output : "";
  const hasError =
    Boolean(data.error) || Boolean(data.isExecutionSuccess === false);

  return {
    language,
    output: hasError ? "" : rawOutput,
    error: hasError
      ? String(data.error || rawOutput || "Code execution failed.")
      : "",
    status: hasError ? "error" : "success",
    executionTime: Number.parseFloat(data.cpuTime) || 0,
    memoryUsed: Number.parseFloat(data.memory) || 0,

    provider: {
      statusCode: data.statusCode ?? null,
      isExecutionSuccess: data.isExecutionSuccess ?? null,
    },
  };
}

module.exports = {
  executeCode,
  getSupportedLanguages,
};


