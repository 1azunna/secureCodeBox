const k8s = require("@kubernetes/client-node");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sCRDApi = kc.makeApiClient(k8s.CustomObjectsApi);
const k8sBatchApi = kc.makeApiClient(k8s.BatchV1Api);

const namespace = "integration-tests";

const sleep = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration * 1000));

async function deleteScan(name) {
  await k8sCRDApi.deleteNamespacedCustomObject(
    "execution.experimental.securecodebox.io",
    "v1",
    namespace,
    "scans",
    name,
    {}
  );
}

async function getScan(name) {
  const { body: scan } = await k8sCRDApi.getNamespacedCustomObjectStatus(
    "execution.experimental.securecodebox.io",
    "v1",
    namespace,
    "scans",
    name
  );
  return scan;
}

async function logJobs() {
  try {
    const { body: jobs } = await k8sBatchApi.listNamespacedJob(namespace);

    for (const job of jobs.items) {
      console.log(`Job: '${job.metadata.name}' Spec:`);
      console.dir(job.spec);
      console.log(`Job: '${job.metadata.name}' Status:`);
      console.dir(job.status);
    }
  } catch (error) {
    console.info(`Failed to list Jobs'`);
  }
}

/**
 *
 * @param {string} name name of the scan. Actual name will be sufixed with a random number to avoid conflicts
 * @param {string} scanType type of the scan. Must match the name of a ScanType CRD
 * @param {string[]} parameters cli argument to be passed to the scanner
 * @param {number} timeout in seconds
 * @returns {scan.findings} returns findings { categories, severities, count } 
 */
async function scan(name, scanType, parameters = [], timeout = 180) {
  const scanDefinition = {
    apiVersion: "execution.experimental.securecodebox.io/v1",
    kind: "Scan",
    metadata: {
      // Use `generateName` instead of name to generate a random sufix and avoid name clashes
      generateName: `${name}-`,
    },
    spec: {
      scanType,
      parameters,
    },
  };

  const { body } = await k8sCRDApi.createNamespacedCustomObject(
    "execution.experimental.securecodebox.io",
    "v1",
    namespace,
    "scans",
    scanDefinition
  );

  const actualName = body.metadata.name;

  for (let i = 0; i < timeout; i++) {
    await sleep(1);
    const { status } = await getScan(actualName);

    if (status && status.state === "Done") {
      await deleteScan(actualName);
      return status.findings;
    } else if (status && status.state === "Errored") {
      await deleteScan(actualName);
      throw new Error(
        `Scan failed with description "${status.errorDescription}"`
      );
    }
  }

  console.error("Scan Timed out!");

  const scan = await getScan(actualName);
  console.log("Last Scan State:");
  console.dir(scan);
  await logJobs();

  throw new Error("timed out while waiting for scan results");
}

module.exports.scan = scan;
