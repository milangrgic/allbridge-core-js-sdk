/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import type BN from "bn.js";
import type { ContractOptions } from "web3-eth-contract";
import type { EventLog } from "web3-core";
import type { EventEmitter } from "events";
import type {
  Callback,
  PayableTransactionObject,
  NonPayableTransactionObject,
  BlockType,
  ContractEventLog,
  BaseContract,
} from "./types";

export interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export type OwnershipTransferred = ContractEventLog<{
  previousOwner: string;
  newOwner: string;
  0: string;
  1: string;
}>;
export type ReceivedExtraGas = ContractEventLog<{
  recipient: string;
  amount: string;
  0: string;
  1: string;
}>;
export type ReceivedGas = ContractEventLog<{
  sender: string;
  amount: string;
  0: string;
  1: string;
}>;
export type TokensSent = ContractEventLog<{
  amount: string;
  sender: string;
  recipient: string;
  destinationChainId: string;
  nonce: string;
  receivedRelayerFeeFromGas: string;
  receivedRelayerFeeFromTokens: string;
  relayerFee: string;
  receivedRelayerFeeTokenAmount: string;
  adminFeeTokenAmount: string;
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
}>;

export interface CctpBridge extends BaseContract {
  constructor(jsonInterface: any[], address?: string, options?: ContractOptions): CctpBridge;
  clone(): CctpBridge;
  methods: {
    adminFeeShareBP(): NonPayableTransactionObject<string>;

    bridge(
      amount: number | string | BN,
      recipient: string | number[],
      destinationChainId: number | string | BN,
      relayerFeeTokenAmount: number | string | BN
    ): PayableTransactionObject<void>;

    chainId(): NonPayableTransactionObject<string>;

    gasUsage(chainId: number | string | BN): NonPayableTransactionObject<string>;

    getBridgingCostInTokens(destinationChainId: number | string | BN): NonPayableTransactionObject<string>;

    getDomainByChainId(chainId_: number | string | BN): NonPayableTransactionObject<string>;

    getTransactionCost(chainId: number | string | BN): NonPayableTransactionObject<string>;

    isMessageProcessed(
      sourceChainId: number | string | BN,
      nonce: number | string | BN
    ): NonPayableTransactionObject<boolean>;

    owner(): NonPayableTransactionObject<string>;

    receiveTokens(
      recipient: string,
      message: string | number[],
      signature: string | number[]
    ): PayableTransactionObject<void>;

    registerBridgeDestination(
      chainId_: number | string | BN,
      domain: number | string | BN
    ): NonPayableTransactionObject<void>;

    renounceOwnership(): NonPayableTransactionObject<void>;

    setAdminFeeShare(adminFeeShareBP_: number | string | BN): NonPayableTransactionObject<void>;

    setGasOracle(gasOracle_: string): NonPayableTransactionObject<void>;

    setGasUsage(chainId: number | string | BN, gasAmount: number | string | BN): NonPayableTransactionObject<void>;

    transferOwnership(newOwner: string): NonPayableTransactionObject<void>;

    unregisterBridgeDestination(chainId_: number | string | BN): NonPayableTransactionObject<void>;

    withdrawFeeInTokens(): NonPayableTransactionObject<void>;

    withdrawGas(amount: number | string | BN): NonPayableTransactionObject<void>;
  };
  events: {
    OwnershipTransferred(cb?: Callback<OwnershipTransferred>): EventEmitter;
    OwnershipTransferred(options?: EventOptions, cb?: Callback<OwnershipTransferred>): EventEmitter;

    ReceivedExtraGas(cb?: Callback<ReceivedExtraGas>): EventEmitter;
    ReceivedExtraGas(options?: EventOptions, cb?: Callback<ReceivedExtraGas>): EventEmitter;

    ReceivedGas(cb?: Callback<ReceivedGas>): EventEmitter;
    ReceivedGas(options?: EventOptions, cb?: Callback<ReceivedGas>): EventEmitter;

    TokensSent(cb?: Callback<TokensSent>): EventEmitter;
    TokensSent(options?: EventOptions, cb?: Callback<TokensSent>): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "OwnershipTransferred", cb: Callback<OwnershipTransferred>): void;
  once(event: "OwnershipTransferred", options: EventOptions, cb: Callback<OwnershipTransferred>): void;

  once(event: "ReceivedExtraGas", cb: Callback<ReceivedExtraGas>): void;
  once(event: "ReceivedExtraGas", options: EventOptions, cb: Callback<ReceivedExtraGas>): void;

  once(event: "ReceivedGas", cb: Callback<ReceivedGas>): void;
  once(event: "ReceivedGas", options: EventOptions, cb: Callback<ReceivedGas>): void;

  once(event: "TokensSent", cb: Callback<TokensSent>): void;
  once(event: "TokensSent", options: EventOptions, cb: Callback<TokensSent>): void;
}
