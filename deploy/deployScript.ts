import { readFileSync } from "fs";
import path from "path";
import { TransactionHash, TransactionStatus, GenLayerClient } from "genlayer-js/types";


export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/caseweave.py");

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    await client.initializeConsensusSmartContract();

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [],
    });

    const waitedReceipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.FINALIZED,
      retries: 200,
      interval: 3000,
    });
    const receipt = (await client.getTransaction({
      hash: deployTransaction as TransactionHash,
    })) ?? waitedReceipt;

    const leader = receipt.consensus_data?.leader_receipt?.[0];
    if (
      receipt.txExecutionResultName === "FINISHED_WITH_ERROR" ||
      receipt.txExecutionResult === 2 ||
      leader?.execution_result !== "SUCCESS"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    console.log("\n Contract deployed successfully.", {
      "Transaction Hash": deployTransaction,
      "Contract Address": receipt.data?.contract_address,
      "Finality": receipt.statusName ?? receipt.status,
      "Execution": receipt.txExecutionResultName ?? leader?.execution_result,
    });
  } catch (error) {
    throw new Error((`Error during deployment:, ${error}`));
  }
}
