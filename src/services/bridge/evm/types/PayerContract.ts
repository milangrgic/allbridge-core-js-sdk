/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import type BN from "bn.js";
import type { ContractOptions } from "web3-eth-contract";
import type { EventLog } from "web3-core";
import type { EventEmitter } from "events";
import type { BaseContract, BlockType, Callback, ContractEventLog, NonPayableTransactionObject } from "./types";

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

export interface PayerContract extends BaseContract {
  methods: {
    approvePool(poolAddress: string, tokenAddress: string): NonPayableTransactionObject<void>;

    getBridgingCostInUsd(
      _chainId: number | string | BN,
      messenger: number | string | BN
    ): NonPayableTransactionObject<string>;

    owner(): NonPayableTransactionObject<string>;

    priceFeed(): NonPayableTransactionObject<string>;

    renounceOwnership(): NonPayableTransactionObject<void>;

    swapAndBridge(
      tokenAddress: string | number[],
      amount: number | string | BN,
      recipient: string | number[],
      destinationChainId: number | string | BN,
      receiveTokenAddress: string | number[],
      nonce: number | string | BN,
      messenger: number | string | BN,
      feeTokenAmount: number | string | BN
    ): NonPayableTransactionObject<void>;

    transferOwnership(newOwner: string): NonPayableTransactionObject<void>;

    usdDecimals(): NonPayableTransactionObject<string>;

    withdraw(amount: number | string | BN): NonPayableTransactionObject<void>;

    withdrawTokens(tokenAddress: string): NonPayableTransactionObject<void>;
  };
  events: {
    OwnershipTransferred(cb?: Callback<OwnershipTransferred>): EventEmitter;
    OwnershipTransferred(options?: EventOptions, cb?: Callback<OwnershipTransferred>): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  constructor(jsonInterface: any[], address?: string, options?: ContractOptions): PayerContract;

  clone(): PayerContract;

  once(event: "OwnershipTransferred", cb: Callback<OwnershipTransferred>): void;

  once(event: "OwnershipTransferred", options: EventOptions, cb: Callback<OwnershipTransferred>): void;
}
