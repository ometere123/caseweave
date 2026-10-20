import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Wallet } from "ethers";
import { createAccount, createClient, chains } from "../app/node_modules/genlayer-js/dist/index.js";
import {
  CalldataAddress,
  TransactionStatus,
} from "../app/node_modules/genlayer-js/dist/types/index.js";

const RPC = "https://studio.genlayer.com/api";
const CHAIN_ID = 61999;
const EXPLORER = "https://explorer-studio.genlayer.com";
const keyDirectory = process.env.CASEWEAVE_E2E_KEYS_DIR;
const keyPassword = process.env.CASEWEAVE_E2E_KEY_PASSWORD;
const outputPath = process.env.CASEWEAVE_DEPLOY_OUTPUT;

if (!keyDirectory || !keyPassword || !outputPath) {
  throw new Error(
    "CASEWEAVE_E2E_KEYS_DIR, CASEWEAVE_E2E_KEY_PASSWORD, and CASEWEAVE_DEPLOY_OUTPUT are required",
  );
}

function loadAccount(fileName) {
  const encrypted = readFileSync(resolve(keyDirectory, fileName), "utf8");
  const privateKey = Wallet.fromEncryptedJsonSync(encrypted, keyPassword).privateKey;
  return createAccount(privateKey);
}

function toCalldataAddress(value) {
  const normalized = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(normalized)) {
    throw new Error(`Not a 20-byte address: ${value}`);
  }
  return new CalldataAddress(
    Uint8Array.from({ length: 20 }, (_, index) =>
      Number.parseInt(normalized.slice(2 + index * 2, 4 + index * 2), 16),
    ),
  );
}

function leaderReceipt(receipt) {
  return receipt.consensus_data?.leader_receipt?.find((item) => item.mode === "leader")
    ?? receipt.consensus_data?.leader_receipt?.[0];
}

function executionError(receipt) {
  const resultName = receipt.resultName ?? receipt.result_name;
  if (receipt.consensus_data != null) {
    if (resultName && resultName !== "MAJORITY_AGREE") return `consensus result ${resultName}`;
    if (typeof receipt.result === "number" && receipt.result !== 6) {
      return `consensus result ${receipt.result}`;
    }
  }
  const leader = leaderReceipt(receipt);
  if (receipt.txExecutionResultName === "FINISHED_WITH_ERROR" || receipt.txExecutionResult === 2) {
    return leader?.error ?? receipt.txExecutionResultName ?? "FINISHED_WITH_ERROR";
  }
  if (leader?.execution_result && leader.execution_result !== "SUCCESS") {
    return leader.error ?? leader.execution_result;
  }
  if (leader?.execution_result === "SUCCESS") return null;
  if (
    Array.isArray(receipt.consensus_data?.validators) &&
    receipt.consensus_data.validators.length > 0 &&
    receipt.consensus_data.validators.every((item) => item.execution_result === "SUCCESS")
  ) {
    return null;
  }
  if (receipt.txExecutionResultName === "FINISHED_WITH_RETURN" || receipt.txExecutionResult === 1) {
    return null;
  }
  return "receipt did not include a conclusive successful execution result";
}

async function fullReceipt(client, hash) {
  let lastError;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await client.getTransaction({ hash });
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, Math.min(1000 * (attempt + 1), 5000)));
    }
  }
  throw lastError ?? new Error(`Unable to retrieve finalized transaction ${hash}`);
}

async function waitFinalized(client, hash) {
  const waited = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 240,
    interval: 3000,
  });
  const full = await fullReceipt(client, hash);
  const receipt = { ...waited, ...full, consensus_data: full.consensus_data ?? waited.consensus_data };
  const error = executionError(receipt);
  if (error) {
    throw new Error(`Finalized transaction ${hash} failed: ${error}`);
  }
  return receipt;
}

function txRecord(label, hash, receipt, contract, method) {
  const leader = leaderReceipt(receipt);
  return {
    label,
    contract,
    method,
    hash,
    explorer: `${EXPLORER}/tx/${hash}`,
    finality: receipt.statusName ?? receipt.status,
    consensusResult: receipt.resultName ?? receipt.result,
    executionResult: leader?.execution_result ?? "UNKNOWN",
    executionResultName: receipt.txExecutionResultName ?? null,
    consensusFinal: receipt.consensus_data?.final ?? null,
  };
}

async function deploy(client, code, label, args = []) {
  const hash = await client.deployContract({ code, args });
  const receipt = await waitFinalized(client, hash);
  assertSourceCode(receipt, code, label);
  const address = receipt.data?.contract_address ?? receipt.contractAddress;
  if (!address) throw new Error(`${label} did not return a contract address`);
  return { address, transaction: txRecord(label, hash, receipt, address, "deploy") };
}

function assertSourceCode(receipt, code, label) {
  const encoded = receipt.data?.contract_code;
  if (typeof encoded !== "string") {
    throw new Error(`${label} receipt did not include deployed contract source`);
  }
  const deployed = Buffer.from(encoded, "base64");
  const expectedHash = createHash("sha256").update(code).digest("hex").toUpperCase();
  const deployedHash = createHash("sha256").update(deployed).digest("hex").toUpperCase();
  if (deployedHash !== expectedHash) {
    throw new Error(`${label} deployed source hash ${deployedHash} did not match ${expectedHash}`);
  }
}

async function write(client, account, address, functionName, args = []) {
  const hash = await client.writeContract({ account, address, functionName, args });
  const receipt = await waitFinalized(client, hash);
  return { hash, receipt, transaction: txRecord(functionName, hash, receipt, address, functionName) };
}

async function read(client, address, functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

const owner = loadAccount("praest-deployer.json");
const client = createClient({ chain: chains.studionet, account: owner });
if (chains.studionet.id !== CHAIN_ID || chains.studionet.rpcUrls.default.http[0] !== RPC) {
  throw new Error("genlayer-js studionet configuration did not match the required chain");
}

const receiverPath = resolve("contracts/caseweave_settlement_receiver.py");
const courtPath = resolve("contracts/caseweave.py");
const consumerPath = resolve("contracts/caseweave_judgment_consumer.py");
const receiverCode = new Uint8Array(readFileSync(receiverPath));
const courtCode = new Uint8Array(readFileSync(courtPath));
const consumerCode = new Uint8Array(readFileSync(consumerPath));

await client.initializeConsensusSmartContract();

let receiver;
if (process.env.CASEWEAVE_EXISTING_RECEIVER_ADDRESS && process.env.CASEWEAVE_EXISTING_RECEIVER_TX) {
  const receiverAddress = process.env.CASEWEAVE_EXISTING_RECEIVER_ADDRESS;
  const receiverHash = process.env.CASEWEAVE_EXISTING_RECEIVER_TX;
  const receiverReceipt = await fullReceipt(client, receiverHash);
  const receiverError = executionError(receiverReceipt);
  if (receiverError) throw new Error(`existing receiver deployment is not successful: ${receiverError}`);
  if (receiverReceipt.data?.contract_address?.toLowerCase() !== receiverAddress.toLowerCase()) {
    throw new Error("existing receiver deployment address did not match the requested address");
  }
  assertSourceCode(receiverReceipt, receiverCode, "existing CaseWeaveSettlementReceiver");
  receiver = {
    address: receiverAddress,
    transaction: txRecord(
      "reuse verified CaseWeaveSettlementReceiver",
      receiverHash,
      receiverReceipt,
      receiverAddress,
      "deploy",
    ),
  };
} else {
  receiver = await deploy(client, receiverCode, "deploy CaseWeaveSettlementReceiver");
}
const court = await deploy(client, courtCode, "deploy corrected CaseWeaveCourt");
const configuredCourt = await write(
  client,
  owner,
  court.address,
  "configure_settlement_receiver",
  [toCalldataAddress(receiver.address)],
);
const configuredReceiver = await write(
  client,
  owner,
  receiver.address,
  "configure_court",
  [toCalldataAddress(court.address)],
);
const consumer = await deploy(
  client,
  consumerCode,
  "deploy trusted CaseWeaveJudgmentConsumer",
  [toCalldataAddress(court.address)],
);

const verification = {
  owner: owner.address,
  courtOwner: await read(client, court.address, "get_owner"),
  courtReceiver: await read(client, court.address, "get_settlement_receiver"),
  receiverOwner: await read(client, receiver.address, "get_owner"),
  receiverCourt: await read(client, receiver.address, "get_trusted_court"),
  consumerCourt: await read(client, consumer.address, "get_trusted_court"),
};

if (verification.courtOwner.toLowerCase() !== owner.address.toLowerCase()) {
  throw new Error(`unexpected court owner ${verification.courtOwner}`);
}
if (verification.courtReceiver.toLowerCase() !== receiver.address.toLowerCase()) {
  throw new Error(`court receiver binding mismatch ${verification.courtReceiver}`);
}
if (verification.receiverCourt.toLowerCase() !== court.address.toLowerCase()) {
  throw new Error(`receiver court binding mismatch ${verification.receiverCourt}`);
}
if (verification.consumerCourt.toLowerCase() !== court.address.toLowerCase()) {
  throw new Error(`consumer court binding mismatch ${verification.consumerCourt}`);
}

const output = {
  network: "studionet",
  chainId: CHAIN_ID,
  rpc: RPC,
  explorer: EXPLORER,
  cli: "genlayer@0.39.1",
  sdk: "genlayer-js@1.1.8",
  genvmVersion: process.env.GENVM_VERSION ?? null,
  deployer: owner.address,
  sourceSha256: {
    court: createHash("sha256").update(courtCode).digest("hex").toUpperCase(),
    receiver: createHash("sha256").update(receiverCode).digest("hex").toUpperCase(),
    consumer: createHash("sha256").update(consumerCode).digest("hex").toUpperCase(),
  },
  contracts: {
    receiver: { address: receiver.address, deployment: receiver.transaction },
    court: { address: court.address, deployment: court.transaction },
    consumer: { address: consumer.address, deployment: consumer.transaction },
  },
  configuration: {
    court: configuredCourt.transaction,
    receiver: configuredReceiver.transaction,
  },
  verification,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
