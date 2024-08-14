const core = require("@actions/core");
const glob = require("@actions/glob");
const github = require("@actions/github");
const fs = require("fs");
const { parse: parseJunit, TestCase } = require("junit2json");

const SUMMARY_HEADER = "tbDEX Test Vectors Report";

/**
 * @typedef {Object} ActionInputs
 * @property {string} junitReportPaths - The paths to the JUnit XML files
 * @property {string} specPath - The path to the spec files
 * @property {string} testCasesPrefix - The prefix of the test cases to be filtered
 * @property {string} gitToken - The GitHub token to use for adding a comment to the PR
 * @property {boolean} commentOnPr - Whether to add the report as a comment to the PR
 * @property {boolean} failOnMissingVectors - Whether to fail the job if missing test vectors are found
 * @property {boolean} failOnFailedTestCases - Whether to fail the job if failed test cases are found
 */

/**
 * @typedef {Object} TestVector
 * @property {string} category - The category of the test vector
 * @property {string} name - The name of the test vector
 * @property {string} file - The file path of the test vector
 * @property {TestCase[]} testCases - The test cases of the test vector
 */

/**
 * @typedef {Object} TestVectorReport
 * @property {number} totalJunitFiles - The total number of JUnit XML files
 * @property {number} totalTestVectors - The total number of test vectors
 * @property {number} totalJunitTestCases - The total number of JUnit test cases
 * @property {number} specTestCases - The total number of test cases in the spec
 * @property {number} specFailedTestCases - The number of failed spec test cases
 * @property {number} specPassedTestCases - The number of passed spec test cases
 * @property {number} specSkippedTestCases - The number of skipped spec test cases
 * @property {TestVector[]} missingVectors - The test vectors that are missing
 * @property {TestVector[]} failedVectors - The test vectors that have failed test cases
 * @property {TestVector[]} skippedVectors - The test vectors that have skipped test cases
 * @property {TestVector[]} successVectors - The test vectors that have passed test cases
 */

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const {
      junitReportPaths,
      specPath,
      testCasesPrefix,
      gitToken,
      commentOnPr,
      failOnMissingVectors,
      failOnFailedTestCases,
    } = readInputs();
    const reportFiles = await getFiles(junitReportPaths);
    const testVectors = await getTestVectors(specPath);
    const report = await buildTestVectorReport(
      reportFiles,
      testVectors,
      testCasesPrefix
    );
    const summary = await generateSummary(report);
    if (commentOnPr) {
      await addCommentToPr(summary, gitToken);
    }
    setJobStatus(report, failOnMissingVectors, failOnFailedTestCases);
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message);
  }
}

/**
 * Reads the inputs for the action.
 * @returns {ActionInputs} The inputs for the action.
 */
const readInputs = () => {
  const junitReportPaths = core.getInput("junit-report-paths", {
    required: true,
  });
  const specPath = core.getInput("spec-path", { required: true });
  const testCasesPrefix = core.getInput("test-cases-prefix");
  const gitToken = core.getInput("git-token");
  const commentOnPr = core.getInput("comment-on-pr") === "true";
  const failOnMissingVectors =
    core.getInput("fail-on-missing-vectors") === "true";
  const failOnFailedTestCases =
    core.getInput("fail-on-failed-test-cases") === "true";
  return {
    junitReportPaths,
    specPath,
    testCasesPrefix,
    gitToken,
    commentOnPr,
    failOnMissingVectors,
    failOnFailedTestCases,
  };
};

/**
 * Retrieves files based on the input glob pattern.
 * @returns {Promise<string[]>} A promise that resolves to an array of file paths.
 */
const getFiles = async (paths) => {
  const globPattern = Array.isArray(paths) ? paths.join("\n") : paths;
  const globber = await glob.create(globPattern);
  const files = await globber.glob();
  core.info(`Got ${files.length} files ...`);
  core.info(files.join("\n"));
  return files;
};

/**
 * Reads the test vectors from the spec path.
 * @returns {Promise<TestVector[]>} A promise that resolves to an array of test vectors.
 */
const getTestVectors = async (specPath) => {
  const specPathGlob = `${specPath}/**/test-vectors/**/*.json`;
  const testVectorsFiles = await getFiles(specPathGlob);
  return testVectorsFiles.filter(checkTestVectorFile).map(mapTestVectorFile);
};

/**
 * Checks if the test vector file is valid.
 * @param {string} file - The file path of the test vector file
 * @returns {boolean} True if the test vector file is valid, false otherwise
 */
const checkTestVectorFile = (file) => {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));

  // description is a mandatory field
  if (!json.description) return false;

  const tbDexSpecFormat = Boolean(json.input && json.output);
  const web5SpecFormat = Boolean(json.vectors);

  return tbDexSpecFormat || web5SpecFormat;
};

/**
 * Maps the test vector file to a test vector object.
 * @param {string} file - The file path of the test vector file
 * @returns {TestVector} The test vector object
 */
const mapTestVectorFile = (file) => {
  const fileFullPath = file.split("/");
  const fileName = fileFullPath.pop();

  let fileFolderName = fileFullPath.pop();
  if (fileFolderName === "vectors") {
    // ignore the vectors folder to get the parent folder name
    // eg. .../protocol/vectors/parse-balance.json category = protocol
    fileFolderName = fileFullPath.pop();
  }

  const category = fileFolderName.replace(/-/g, "_").toLowerCase();
  const name = fileName.split(".")[0].replace(/-/g, "_").toLowerCase();

  const testVector = {
    category,
    name,
    file,
    testCases: [],
  };

  core.info(`Test vector: ${JSON.stringify(testVector)}`);
  return testVector;
};

/**
 * Parses the test vector results from the JUnit XML files.
 * @param {string[]} reportFiles - An array of file paths.
 * @param {TestVector[]} testVectors - An array of test vectors.
 * @param {string} testCasesPrefix - The prefix of the test cases to be filtered
 * @returns {Promise<TestVectorReport>} A promise that resolves to a test vector report object.
 */
const buildTestVectorReport = async (
  reportFiles,
  testVectors,
  testCasesPrefix
) => {
  const testVectorReport = {
    totalJunitFiles: reportFiles.length,
    totalTestVectors: testVectors.length,
    totalJunitTestCases: 0,
    specTestCases: 0,
    specFailedTestCases: 0,
    specPassedTestCases: 0,
    specSkippedTestCases: 0,
    missingVectors: [],
    failedVectors: [],
    skippedVectors: [],
    successVectors: [],
  };

  const junitReports = await parseJunitReport(reportFiles);
  const { totalJunitTestCases, totalSpecTestCases } =
    addJunitToVectorsTestCases(junitReports, testVectors, testCasesPrefix);
  testVectorReport.totalJunitTestCases = totalJunitTestCases;
  testVectorReport.specTestCases = totalSpecTestCases;
  core.info(
    "JUnit test cases parsed!" +
      JSON.stringify({ totalJunitTestCases, totalSpecTestCases }, null, 2)
  );

  for (const testVector of testVectors) {
    if (testVector.testCases.length === 0) {
      testVectorReport.missingVectors.push(testVector);
      continue;
    }

    let hasFailedCases = false;
    let hasSkippedCases = false;

    for (const testCase of testVector.testCases) {
      if (testCase.skipped) {
        hasSkippedCases = true;
        testVectorReport.specSkippedTestCases++;
      } else if (testCase.failure || testCase.error) {
        hasFailedCases = true;
        testVectorReport.specFailedTestCases++;
      } else {
        testVectorReport.specPassedTestCases++;
      }
    }

    if (hasFailedCases) {
      testVectorReport.failedVectors.push(testVector);
    } else if (hasSkippedCases) {
      testVectorReport.skippedVectors.push(testVector);
    } else {
      testVectorReport.successVectors.push(testVector);
    }
  }

  core.info(
    "Test vector report computed!" + JSON.stringify(testVectorReport, null, 2)
  );
  return testVectorReport;
};

const addJunitToVectorsTestCases = (
  junitReports,
  testVectors,
  testCasesPrefix
) => {
  const junitTestCases = junitReports
    .flatMap((junit) => junit.testsuite)
    .flatMap((testSuite) => testSuite.testcase)
    .filter((testCase) => testCase);
  const totalJunitTestCases = junitTestCases.length;

  let totalSpecTestCases = 0;
  junitTestCases.forEach((testCase) => {
    if (testCasesPrefix && !testCase.name.startsWith(testCasesPrefix)) return;

    // check if testcase is relevant to any test vector key
    const testVector = testVectors.find((testVector) => {
      const testCaseName = testCase.name.toLowerCase();
      const testCaseNameWords = testCaseName.split(" ");
      return (
        // test case has the same name as the test vector
        testCaseNameWords.find((word) => word === testVector.name) &&
        // and test case contains the test vector category
        testCaseName.includes(testVector.category)
      );
    });
    if (!testVector) return;
    testVector.testCases.push(testCase);
    totalSpecTestCases++;
  });

  return { totalJunitTestCases, totalSpecTestCases };
};

/**
 * Parses the JUnit XML files.
 * @param {string[]} reportFiles - An array of file paths.
 * @returns {Promise<any[]>} A promise that resolves to an array of JUnit XML results.
 */
const parseJunitReport = async (reportFiles) => {
  const junitResults = [];
  for (const file of reportFiles) {
    const fileContent = fs.readFileSync(file, "utf8");
    const junit = await parseJunit(fileContent);
    junitResults.push(junit);
  }
  return junitResults;
};

/**
 * Generates the summary markdown report for the test vector results.
 * @param {TestVectorReport} testVectorReport - The test vector report object
 * @returns {Promise<void>} Resolves when the report is generated.
 */
const generateSummary = async (testVectorReport) => {
  const parentDir = process.cwd().split("/").pop();
  core.summary.addHeading(SUMMARY_HEADER, 2);

  core.info(
    "Generating summary..." + JSON.stringify(testVectorReport, null, 2)
  );

  // Create overall statistics table
  const overallStatsTable = [
    [
      { data: "Total Test Vectors", header: true },
      { data: "Total Test Cases", header: true },
      { data: "✅ Passed", header: true },
      { data: "❌ Failed", header: true },
      { data: "⚠️ Skipped", header: true },
    ],
    [
      `${testVectorReport.totalTestVectors}`,
      `${testVectorReport.specTestCases}`,
      `${testVectorReport.specPassedTestCases}`,
      `${testVectorReport.specFailedTestCases}`,
      `${testVectorReport.specSkippedTestCases}`,
    ],
  ];
  core.info(
    "Overall stats table: " + JSON.stringify(overallStatsTable, null, 2)
  );
  core.summary.addTable(overallStatsTable);

  const success = testVectorReport.successVectors.length;
  const total = testVectorReport.totalTestVectors;
  const hasIssues = success !== total;
  if (!hasIssues) {
    core.summary.addRaw("✅ All test vectors passed");
  } else {
    core.summary.addRaw(
      `ℹ️ ${success} out of ${total} test vectors passed successfully.`
    );
  }

  // Add failed vectors table
  if (testVectorReport.failedVectors.length > 0) {
    core.summary.addHeading(
      `❌ Failed Vectors (${testVectorReport.failedVectors.length})`,
      3
    );
    core.summary.addRaw("These are test vectors with test cases that failed.");
    testVectorReport.failedVectors.forEach((vector) => {
      core.info(`Failed vector: ${JSON.stringify(vector, null, 2)}`);
      core.summary.addHeading(`${vector.category}: ${vector.name}`, 4);
      const relativeFilePath = vector.file.replace(parentDir, "");
      core.summary.addRaw(`File: ${relativeFilePath}\n\n`);
      const failedTestsTable = [
        [
          { data: "Test Case", header: true },
          { data: "Failure Message", header: true },
        ],
        ...vector.testCases
          .filter((testCase) => testCase.failure)
          .map((testCase) => [
            testCase.name,
            failureToMessageRows(testCase.failure),
          ]),
      ];
      core.info(
        `Failed tests table: ${JSON.stringify(failedTestsTable, null, 2)}`
      );
      core.summary.addTable(failedTestsTable);
    });
  }

  // Add missing vectors table
  if (testVectorReport.missingVectors.length > 0) {
    core.info(
      `Missing vectors: ${JSON.stringify(
        testVectorReport.missingVectors,
        null,
        2
      )}`
    );
    core.summary.addHeading(
      `❌ Missing Vectors (${testVectorReport.missingVectors.length})`,
      3
    );
    core.summary.addRaw("These are test vectors without any test cases.");
    const missingVectorsTable = [
      [
        { data: "Category", header: true },
        { data: "Name", header: true },
      ],
      ...testVectorReport.missingVectors.map((vector) => [
        vector.category,
        vector.name,
      ]),
    ];
    core.info(
      `Missing vectors table: ${JSON.stringify(missingVectorsTable, null, 2)}`
    );
    core.summary.addTable(missingVectorsTable);
  }

  // Add skipped vectors table
  if (testVectorReport.skippedVectors.length > 0) {
    core.summary.addHeading(
      `⚠️ Skipped Vectors (${testVectorReport.skippedVectors.length})`,
      3
    );
    core.summary.addRaw(
      "These are test vectors with test cases that are set to skip."
    );
    testVectorReport.skippedVectors.forEach((vector) => {
      core.summary.addHeading(`${vector.category}: ${vector.name}`, 3);
      const relativeFilePath = vector.file.replace(parentDir, "");
      core.summary.addRaw(`<code>File: ${relativeFilePath}</code>\n\n`);

      const skippedTestsTable = [
        [{ data: "Test Case", header: true }],
        ...vector.testCases
          .filter((testCase) => testCase.skipped)
          .map((testCase) => [testCase.name]),
      ];
      core.summary.addTable(skippedTestsTable);
    });
  }

  // Add footer with timestamp and automation info
  core.summary.addSeparator();
  core.summary.addRaw(
    `<em>Automatically generated at: ${new Date().toISOString()}</em>`
  );

  // Set outputs for other workflow steps to use
  const summary = core.summary.stringify();
  core.info(`Generated report summary:\n${summary}`);
  core.setOutput("summary", summary);
  core.setOutput(
    "test-vector-report",
    JSON.stringify(testVectorReport, null, 2)
  );

  core.summary.write();

  return summary;
};

/**
 * Converts the failure object to a markdown string.
 * @param {Detail[]} failure - A list of failure details
 * @returns {string} The failure message prepared for markdown
 */
const failureToMessageRows = (failure) => {
  if (!failure?.length) return "Unknown error";

  return failure
    .map((detail) => {
      const escapedInnerHTML = detail.inner
        ?.trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      return `<b>${detail.message}</b><br/><pre>${
        escapedInnerHTML || "Unknown error"
      }\n</pre>`;
    })
    .join("<br>\n");
};

/**
 * Sets the job status based on the test vector results.
 * @param {TestVectorReport} testVectorResults - The test vector report object
 * @param {boolean} failOnMissingVectors - Whether to fail the job if missing test vectors are found
 * @param {boolean} failOnFailedTestCases - Whether to fail the job if failed test cases are found
 * @returns {void}
 */
const setJobStatus = (
  testVectorResults,
  failOnMissingVectors,
  failOnFailedTestCases
) => {
  if (testVectorResults.specFailedTestCases > 0 && failOnFailedTestCases) {
    core.setFailed("❌ Failed test vectors found");
  } else if (
    testVectorResults.missingVectors.length > 0 &&
    failOnMissingVectors
  ) {
    core.setFailed("❌ Missing test vectors found");
  } else {
    if (testVectorResults.specSkippedTestCases > 0) {
      core.warning("⚠️ Skipped test vectors found");
    }
    core.setOutput("success", "true");
    core.info("✅ All test vectors passed");
  }
};

const addCommentToPr = async (summary, gitToken) => {
  const event = github.context.eventName;
  if (event !== "pull_request") {
    core.info("Not a PR event, skipping comment...");
    return;
  }

  if (!gitToken) {
    core.error("No git token found, skipping comment...");
    core.setFailed("No git token found to add the requested PR comment");
    return;
  }

  const prNumber = github.context.payload.pull_request.number;
  core.info(`PR number: ${prNumber}`);

  const { owner, repo } = github.context.repo;
  const octokit = github.getOctokit(gitToken);

  // get current user
  // const { data: user } = await octokit.rest.users.getAuthenticated();
  // core.info(`Current user: ${user.login}`);

  // check if theres an existing comment
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });
  const existingComment = comments.data.find(
    ({ user, body }) => body.includes(SUMMARY_HEADER) && user.type === "Bot"
  );

  if (existingComment) {
    core.info("Existing comment found, updating...");
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingComment.id,
      body: summary,
    });
  } else {
    core.info("No existing comment found, creating new one...");
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: summary,
    });
  }
};

run();
