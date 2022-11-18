import BN from "bn.js";
import erc20abi from "erc-20-abi";
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { ChainType } from "../../chains";
import { AllbridgeCoreClient } from "../../client/core-api";
import {
  ApproveData,
  Bridge,
  GetAllowanceParamsDto,
  GetTokenBalanceData,
  RawTransaction,
  SendParamsWithChainSymbols,
  SendParamsWithTokenInfos,
  TransactionResponse,
  TxSendParams,
} from "../models";
import { getNonce, prepareTxSendParams } from "../utils";
import abi from "./abi/Abi.json";
import { Abi as BridgeContract } from "./types/Abi";
import { BaseContract } from "./types/types";

export const MAX_AMOUNT =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

export class EvmBridge extends Bridge {
  chainType: ChainType.EVM = ChainType.EVM;

  constructor(public web3: Web3, public api: AllbridgeCoreClient) {
    super();
  }

  getAllowance(params: GetAllowanceParamsDto): Promise<string> {
    const {
      tokenInfo: { tokenAddress, poolAddress: spender },
      owner,
    } = params;
    const tokenContract = this.getContract(erc20abi as AbiItem[], tokenAddress);
    return tokenContract.methods.allowance(owner, spender).call();
  }

  async getTokenBalance(data: GetTokenBalanceData): Promise<string> {
    return await this.getContract(erc20abi as AbiItem[], data.tokenAddress)
      .methods.balanceOf(data.account)
      .call();
  }

  async sendTx(params: TxSendParams): Promise<TransactionResponse> {
    const {
      amount,
      contractAddress,
      fromAccountAddress,
      fromTokenAddress,
      toChainId,
      toAccountAddress,
      toTokenAddress,
      messenger,
      fee,
    } = params;

    const bridgeContract = this.getBridgeContract(contractAddress);
    const nonce = new BN(getNonce());

    const swapAndBridgeMethod = bridgeContract.methods.swapAndBridge(
      fromTokenAddress,
      amount,
      toAccountAddress,
      toChainId,
      toTokenAddress,
      nonce,
      messenger
    );
    const estimateGas = await swapAndBridgeMethod.estimateGas({
      from: fromAccountAddress,
      value: fee,
    });

    const { transactionHash } = await swapAndBridgeMethod.send({
      from: fromAccountAddress,
      value: fee,
      gas: estimateGas,
    });
    return { txId: transactionHash };
  }

  async buildRawTransactionSend(
    params: SendParamsWithChainSymbols | SendParamsWithTokenInfos
  ): Promise<RawTransaction> {
    const txSendParams = await prepareTxSendParams(
      this.chainType,
      params,
      this.api
    );
    return this.buildRawTransactionSendFromParams(txSendParams);
  }

  buildRawTransactionSendFromParams(params: TxSendParams): RawTransaction {
    const {
      amount,
      contractAddress,
      fromAccountAddress,
      fromTokenAddress,
      toChainId,
      toAccountAddress,
      toTokenAddress,
      messenger,
      fee,
    } = params;

    const bridgeContract = this.getBridgeContract(contractAddress);
    const nonce = new BN(getNonce());

    const swapAndBridgeMethod = bridgeContract.methods.swapAndBridge(
      fromTokenAddress,
      amount,
      toAccountAddress,
      toChainId,
      toTokenAddress,
      nonce,
      messenger
    );

    return {
      from: fromAccountAddress,
      to: contractAddress,
      value: fee,
      data: swapAndBridgeMethod.encodeABI(),
      type: 2,
    };
  }

  async approve(approveData: ApproveData): Promise<TransactionResponse> {
    const { tokenAddress, spender, owner } = approveData;
    const tokenContract = this.getContract(erc20abi as AbiItem[], tokenAddress);

    const approveMethod = await tokenContract.methods.approve(
      spender,
      MAX_AMOUNT
    );
    const estimateGas = await approveMethod.estimateGas({ from: owner });

    const { transactionHash } = await approveMethod.send({
      from: owner,
      gas: estimateGas,
    });
    return { txId: transactionHash };
  }

  async buildRawTransactionApprove(
    approveData: ApproveData
  ): Promise<RawTransaction> {
    const { tokenAddress, spender, owner } = approveData;
    const tokenContract = this.getContract(erc20abi as AbiItem[], tokenAddress);
    const approveMethod = await tokenContract.methods.approve(
      spender,
      MAX_AMOUNT
    );
    return {
      from: owner,
      to: tokenAddress,
      value: "0",
      data: approveMethod.encodeABI(),
      type: 2,
    };
  }

  private getContract<T extends BaseContract>(
    abiItem: AbiItem[],
    contractAddress: string
  ): T {
    return new this.web3.eth.Contract(abiItem, contractAddress) as any;
  }

  private getBridgeContract(contractAddress: string): BridgeContract {
    return this.getContract<BridgeContract>(abi as AbiItem[], contractAddress);
  }
}
