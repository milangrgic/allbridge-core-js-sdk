import axios, { Axios } from "axios";
import { Big } from "big.js";
import package_json from "../../../package.json";
import { ChainSymbol } from "../../chains";
import { sleep } from "../../services/utils";
import { ChainDetailsMap, PoolMap, PoolKeyObject, TokenWithChainDetails } from "../../tokens-info";
import {
  mapChainDetailsResponseToChainDetailsMap,
  mapChainDetailsResponseToPoolMap,
  mapPoolResponseToPoolMap,
} from "./core-api-mapper";
import {
  ChainDetailsResponse,
  PoolResponse,
  ReceiveTransactionCostRequest,
  ReceiveTransactionCostResponse,
  TransferStatusResponse,
} from "./core-api.model";

export interface AllbridgeCoreClientParams {
  coreApiUrl: string;
  coreApiHeaders?: Record<string, string>;
  polygonApiUrl: string;
}

export interface AllbridgeCoreClient {
  getChainDetailsMap(): Promise<ChainDetailsMap>;
  tokens(): Promise<TokenWithChainDetails[]>;

  getTransferStatus(chainSymbol: ChainSymbol, txId: string): Promise<TransferStatusResponse>;

  getPolygonGasInfo(): Promise<{
    maxPriorityFee: string;
    maxFee: string;
  }>;

  getPolygonMaxPriorityFee(): Promise<string>;

  getPolygonMaxFee(): Promise<string>;

  getReceiveTransactionCost(args: ReceiveTransactionCostRequest): Promise<{
    fee: string;
    sourceNativeTokenPrice?: string;
  }>;
}

export class AllbridgeCoreClientImpl implements AllbridgeCoreClient {
  private api: Axios;
  private readonly polygonApiUrl: string;

  constructor(params: AllbridgeCoreClientParams) {
    this.api = axios.create({
      baseURL: params.coreApiUrl,
      headers: {
        Accept: "application/json",
        ...params.coreApiHeaders,
        "User-Agent": "AllbridgeCoreSDK/" + package_json.version,
      },
    });
    this.polygonApiUrl = params.polygonApiUrl;
  }

  async getChainDetailsMap(): Promise<ChainDetailsMap> {
    const { data } = await this.api.get<ChainDetailsResponse>("/token-info");
    return mapChainDetailsResponseToChainDetailsMap(data);
  }

  async tokens(): Promise<TokenWithChainDetails[]> {
    const map = await this.getChainDetailsMap();
    return Object.values(map).flatMap((chainDetails) => chainDetails.tokens);
  }

  async getChainDetailsMapAndPoolMap(): Promise<{
    chainDetailsMap: ChainDetailsMap;
    poolMap: PoolMap;
  }> {
    const { data } = await this.api.get<ChainDetailsResponse>("/token-info");
    return {
      chainDetailsMap: mapChainDetailsResponseToChainDetailsMap(data),
      poolMap: mapChainDetailsResponseToPoolMap(data),
    };
  }

  async getTransferStatus(chainSymbol: ChainSymbol, txId: string): Promise<TransferStatusResponse> {
    const { data } = await this.api.get<TransferStatusResponse>(`/chain/${chainSymbol}/${txId}`);
    return data;
  }

  async getPolygonMaxPriorityFee(): Promise<string> {
    const gasInfo = await this.getPolygonGasInfoFromGasStation();
    const maxPriorityFeeGwei = gasInfo.maxPriorityFee;
    return Big(maxPriorityFeeGwei).times(1e9).toFixed(0);
  }

  async getPolygonMaxFee(): Promise<string> {
    const gasInfo = await this.getPolygonGasInfoFromGasStation();
    const maxFeeGwei = gasInfo.maxFee;
    return Big(maxFeeGwei).times(1e9).toFixed(0);
  }

  async getPolygonGasInfo(): Promise<{
    maxPriorityFee: string;
    maxFee: string;
  }> {
    const gasInfo = await this.getPolygonGasInfoFromGasStation();
    return {
      maxPriorityFee: Big(gasInfo.maxPriorityFee).times(1e9).toFixed(0),
      maxFee: Big(gasInfo.maxFee).times(1e9).toFixed(0),
    };
  }

  private async getPolygonGasInfoFromGasStation(level: "safeLow" | "standard" | "fast" = "standard"): Promise<{
    maxPriorityFee: number;
    maxFee: number;
  }> {
    let errorMessage = "no message";
    const attempts = 5;
    for (let i = 0; i < attempts; i++) {
      try {
        const { data } = await axios.get(this.polygonApiUrl);
        if (!data[level]) {
          throw new Error(`No data for ${level} level`);
        }
        return data[level];
      } catch (e) {
        errorMessage =
          e instanceof Error
            ? `Cannot get polygon gas: ${e.message}`
            : `Cannot get polygon gas: ${e?.toString() ?? "some error occurred"}`;
        if (i < attempts - 1) {
          await sleep(1000);
        }
      }
    }
    throw new Error(errorMessage);
  }

  async getReceiveTransactionCost(args: ReceiveTransactionCostRequest): Promise<{
    fee: string;
    sourceNativeTokenPrice?: string;
  }> {
    const { data } = await this.api.post<ReceiveTransactionCostResponse>("/receive-fee", args, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return {
      fee: data.fee,
      sourceNativeTokenPrice: data.sourceNativeTokenPrice,
    };
  }

  async getPoolMap(pools: PoolKeyObject[] | PoolKeyObject): Promise<PoolMap> {
    const poolKeys = pools instanceof Array ? pools : [pools];
    const { data } = await this.api.post<PoolResponse>(
      "/pool-info",
      { pools: poolKeys },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return mapPoolResponseToPoolMap(data);
  }
}
