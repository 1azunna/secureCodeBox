const { handle, elasticClient } = require("./hook");

beforeEach(() => {
  elasticClient.index.mockClear();
  elasticClient.bulk.mockClear();
});

const scan = {
  metadata: {
    uid: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
    name: "demo-scan",
    labels: {
      company: "iteratec",
    },
  },
  spec: {
    scanType: "Nmap",
    parameters: ["-Pn", "localhost"],
  },
};

const now = new Date('2020-11-11');

test("should only send scan summary document if no findings are passing in", async () => {
  const findings = [];

  const getFindings = async () => findings;

  await handle({ getFindings, scan, now, tenant: "default", appendNamespace: true });

  expect(elasticClient.index).toBeCalledTimes(1);
  expect(elasticClient.index).toBeCalledWith({
    body: {
      "@timestamp": now,
      id: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
      labels: {
        company: "iteratec",
      },
      name: "demo-scan",
      parameters: ["-Pn", "localhost"],
      scan_type: "Nmap",
      type: "scan",
    },
    index: `scbv2_default_${now.toISOString().substr(0, 10)}`,
  });
  expect(elasticClient.bulk).not.toBeCalled();
});

test("should send findings to elasticsearch with given prefix", async () => {
  const findings = [
    {
      id: "4560b3e6-1219-4f5f-9b44-6579f5a32407",
      name: "Port 5601 is open",
      category: "Open Port",
    },
  ];

  const getFindings = async () => findings;

  await handle({ getFindings, scan, now, tenant: "default", indexPrefix: "myPrefix", appendNamespace: true });

  expect(elasticClient.index).toBeCalledTimes(1);
  expect(elasticClient.index).toBeCalledWith({
    body: {
      "@timestamp": now,
      id: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
      labels: {
        company: "iteratec",
      },
      name: "demo-scan",
      parameters: ["-Pn", "localhost"],
      scan_type: "Nmap",
      type: "scan",
    },
    index: `myPrefix_default_${now.toISOString().substr(0, 10)}`,
  });

  expect(elasticClient.bulk).toBeCalledTimes(1);
  expect(elasticClient.bulk).toBeCalledWith({
    refresh: true,
    body: [
      {
        index: {
          _index: `myPrefix_default_${now.toISOString().substr(0, 10)}`,
        },
      },
      {
        "@timestamp": now,
        category: "Open Port",
        id: "4560b3e6-1219-4f5f-9b44-6579f5a32407",
        name: "Port 5601 is open",
        scan_id: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
        scan_labels: {
          company: "iteratec",
        },
        scan_name: "demo-scan",
        scan_type: "Nmap",
        type: "finding",
      },
    ],
  });
});

test("should not append namespace if 'appendNamespace' is null", async () => {
  const findings = [];

  const getFindings = async () => findings;

  await handle({ getFindings, scan, now, tenant: "default" });

  expect(elasticClient.index).toBeCalledTimes(1);
  expect(elasticClient.index).toBeCalledWith({
    body: {
      "@timestamp": now,
      id: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
      labels: {
        company: "iteratec",
      },
      name: "demo-scan",
      parameters: ["-Pn", "localhost"],
      scan_type: "Nmap",
      type: "scan",
    },
    index: `scbv2_${now.toISOString().substr(0, 10)}`,
  });
});

test("should append date format YYYY", async () => {
  const findings = [];

  const getFindings = async () => findings;

  await handle({ getFindings, scan, now, tenant: "default", indexSuffix: "YYYY" });

  expect(elasticClient.index).toBeCalledTimes(1);
  expect(elasticClient.index).toBeCalledWith({
    body: {
      "@timestamp": now,
      id: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
      labels: {
        company: "iteratec",
      },
      name: "demo-scan",
      parameters: ["-Pn", "localhost"],
      scan_type: "Nmap",
      type: "scan",
    },
    index: `scbv2_${now.toISOString().substr(0, 4)}`,
  });
});

test("should append week format like YYYY/[W]w -> 2020/W46", async () => {
  const findings = [];

  const getFindings = async () => findings;

  await handle({ getFindings, scan, now, tenant: "default", indexSuffix: "YYYY/[W]w" });

  expect(elasticClient.index).toBeCalledTimes(1);
  expect(elasticClient.index).toBeCalledWith({
    body: {
      "@timestamp": now,
      id: "09988cdf-1fc7-4f85-95ee-1b1d65dbc7cc",
      labels: {
        company: "iteratec",
      },
      name: "demo-scan",
      parameters: ["-Pn", "localhost"],
      scan_type: "Nmap",
      type: "scan",
    },
    index: `scbv2_2020/W46`,
  });
});
