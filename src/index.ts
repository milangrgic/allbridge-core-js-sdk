import { Big } from "big.js";
import { ChainSymbol } from "./chains";
import { AllbridgeCoreClientImpl } from "./client/core-api";
import { AllbridgeCachingCoreClient } from "./client/core-api/caching-core-client";
import { TransferStatusResponse } from "./client/core-api/core-api.model";
import { mainnet } from "./configs";
import { InsufficientPoolLiquidity } from "./exceptions";
import { AmountsAndGasFeeOptions, GasFeeOptions, GetTokenBalanceParams, Messenger } from "./models";
import { BridgeService } from "./services/bridge";

import { SolanaBridgeParams } from "./services/bridge/sol";
import { getGasFeeOptions } from "./services/bridge/utils";
import { LiquidityPoolService } from "./services/liquidity-pool";
import { SolanaPoolParams } from "./services/liquidity-pool/sol";
import { Provider } from "./services/models";
import { TokenService } from "./services/token";
import { ChainDetailsMap, TokenWithChainDetails } from "./tokens-info";
import {
  aprInPercents,
  convertFloatAmountToInt,
  convertIntAmountToFloat,
  fromSystemPrecision,
  getFeePercent,
  getPoolInfoByToken,
  swapFromVUsd,
  swapFromVUsdReverse,
  swapToVUsd,
  swapToVUsdReverse,
} from "./utils/calculation";
import {
  swapAndBridgeFeeCalculation,
  swapAndBridgeFeeCalculationReverse,
  SwapAndBridgeCalculationData,
  SwapPoolInfo,
} from "./utils/calculation/swap-and-bridge-fee-calc";

export * from "./configs/mainnet";
export * from "./models";
export { ChainDetailsMap, ChainDetailsWithTokens } from "./tokens-info";

export interface AllbridgeCoreSdkOptions {
  coreApiUrl: string;
  /**
   * A set of headers to be added to all requests to the Core API.
   */
  coreApiHeaders?: Record<string, string>;
  solanaRpcUrl: string;
  polygonApiUrl: string;

  wormholeMessengerProgramId: string;
}

export class AllbridgeCoreSdk {
  /**
   * @internal
   */
  private readonly api: AllbridgeCachingCoreClient;
  /**
   * @internal
   */
  private readonly tokenService: TokenService;

  readonly params: AllbridgeCoreSdkOptions;

  bridge: BridgeService;
  pool: LiquidityPoolService;

  /**
   * Initializes the SDK object.
   * @param params
   * Optional.
   * If not defined, the default {@link mainnet} parameters are used.
   */
  constructor(params: AllbridgeCoreSdkOptions = mainnet) {
    const apiClient = new AllbridgeCoreClientImpl({
      coreApiUrl: params.coreApiUrl,
      coreApiHeaders: params.coreApiHeaders,
      polygonApiUrl: params.polygonApiUrl,
    });
    const solBridgeParams: SolanaBridgeParams = {
      solanaRpcUrl: params.solanaRpcUrl,
      wormholeMessengerProgramId: params.wormholeMessengerProgramId,
    };
    this.api = new AllbridgeCachingCoreClient(apiClient);
    this.tokenService = new TokenService(this.api, solBridgeParams);
    this.bridge = new BridgeService(this.api, solBridgeParams, this.tokenService);
    const solPoolParams: SolanaPoolParams = {
      solanaRpcUrl: params.solanaRpcUrl,
    };
    this.pool = new LiquidityPoolService(this.api, solPoolParams, this.tokenService);
    this.params = params;
  }

  /**
   * Returns {@link ChainDetailsMap} containing a list of supported tokens groped by chain.
   */
  async chainDetailsMap(): Promise<ChainDetailsMap> {
    return this.api.getChainDetailsMap();
  }

  /**
   * Returns a list of supported {@link TokenWithChainDetails | tokens}.
   */
  async tokens(): Promise<TokenWithChainDetails[]> {
    return this.api.tokens();
  }

  /**
   * Returns a list of supported {@link TokenWithChainDetails | tokens} on the selected chain.
   */
  async tokensByChain(chainSymbol: ChainSymbol): Promise<TokenWithChainDetails[]> {
    const map = await this.api.getChainDetailsMap();
    return map[chainSymbol].tokens;
  }

  /**
   * Fetches information about tokens transfer by chosen chainSymbol and transaction Id from the Allbridge Core API.
   * @param chainSymbol
   * @param txId
   */
  async getTransferStatus(chainSymbol: ChainSymbol, txId: string): Promise<TransferStatusResponse> {
    return this.api.getTransferStatus(chainSymbol, txId);
  }

  /**
   * Get token balance
   * @param params
   * @param provider
   * @returns Token balance
   */
  async getTokenBalance(params: GetTokenBalanceParams, provider?: Provider): Promise<string> {
    return this.tokenService.getTokenBalance(params, provider);
  }

  /**
   * Calculates the percentage of fee from the initial amount that is charged when swapping from the selected source chain.
   * (Does not include fee related to the destination chain. Does not include gas fee)
   * @param amountFloat initial amount of tokens to swap
   * @param sourceChainToken selected token on the source chain
   * @returns fee percent
   */
  async calculateFeePercentOnSourceChain(
    amountFloat: number | string | Big,
    sourceChainToken: TokenWithChainDetails
  ): Promise<number> {
    const amountInt = convertFloatAmountToInt(amountFloat, sourceChainToken.decimals);
    if (amountInt.eq(0)) {
      return 0;
    }
    const vUsdInSystemPrecision = swapToVUsd(
      amountInt,
      sourceChainToken,
      await getPoolInfoByToken(this.api, sourceChainToken)
    ).amountIncludingCommissionInSystemPrecision;
    const vUsdInSourcePrecision = fromSystemPrecision(vUsdInSystemPrecision, sourceChainToken.decimals);
    return getFeePercent(amountInt, vUsdInSourcePrecision);
  }

  /**
   * Calculates the percentage of fee that is charged when swapping to the selected destination chain. The destination chain fee percent applies to the amount after the source chain fee.
   * (Does not include fee related to the source chain. Does not include gas fee)
   * @see {@link calculateFeePercentOnSourceChain}
   * @param amountFloat initial amount of tokens to swap
   * @param sourceChainToken selected token on the source chain
   * @param destinationChainToken selected token on the destination chain
   * @returns fee percent
   */
  async calculateFeePercentOnDestinationChain(
    amountFloat: number | string | Big,
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails
  ): Promise<number> {
    const amountInt = convertFloatAmountToInt(amountFloat, sourceChainToken.decimals);
    if (amountInt.eq(0)) {
      return 0;
    }
    const vUsdInSystemPrecision = swapToVUsd(
      amountInt,
      sourceChainToken,
      await getPoolInfoByToken(this.api, sourceChainToken)
    ).amountIncludingCommissionInSystemPrecision;
    const usd = swapFromVUsd(
      vUsdInSystemPrecision,
      destinationChainToken,
      await getPoolInfoByToken(this.api, destinationChainToken)
    ).amountIncludingCommissionInTokenPrecision;
    const vUsdInDestinationPrecision = fromSystemPrecision(vUsdInSystemPrecision, destinationChainToken.decimals);
    return getFeePercent(vUsdInDestinationPrecision, usd);
  }

  /**
   * Calculates the amount of tokens the receiving party will get as a result of the transfer
   * and fetches {@link GasFeeOptions} which contains available ways to pay the gas fee.
   * @param amountToSendFloat the amount of tokens that will be sent
   * @param sourceChainToken selected token on the source chain
   * @param destinationChainToken selected token on the destination chain
   * @param messenger
   */
  async getAmountToBeReceivedAndGasFeeOptions(
    amountToSendFloat: number | string | Big,
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails,
    messenger: Messenger
  ): Promise<AmountsAndGasFeeOptions> {
    return {
      amountToSendFloat: Big(amountToSendFloat).toFixed(),
      amountToBeReceivedFloat: await this.getAmountToBeReceived(
        amountToSendFloat,
        sourceChainToken,
        destinationChainToken
      ),
      gasFeeOptions: await this.getGasFeeOptions(sourceChainToken, destinationChainToken, messenger),
    };
  }

  /**
   * Calculates the amount of tokens to send based on the required amount of tokens the receiving party should get as a result of the swap
   * and fetches {@link GasFeeOptions} which contains available ways to pay the gas fee.
   * @param amountToBeReceivedFloat the amount of tokens that should be received
   * @param sourceChainToken selected token on the source chain
   * @param destinationChainToken selected token on the destination chain
   * @param messenger
   */
  async getAmountToSendAndGasFeeOptions(
    amountToBeReceivedFloat: number | string | Big,
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails,
    messenger: Messenger
  ): Promise<AmountsAndGasFeeOptions> {
    return {
      amountToSendFloat: await this.getAmountToSend(amountToBeReceivedFloat, sourceChainToken, destinationChainToken),
      amountToBeReceivedFloat: Big(amountToBeReceivedFloat).toFixed(),
      gasFeeOptions: await this.getGasFeeOptions(sourceChainToken, destinationChainToken, messenger),
    };
  }

  /**
   * Calculates the amount of tokens the receiving party will get as a result of the swap.
   * @param amountToSendFloat the amount of tokens that will be sent
   * @param sourceChainToken selected token on the source chain
   * @param destinationChainToken selected token on the destination chain
   */
  async getAmountToBeReceived(
    amountToSendFloat: number | string | Big,
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails
  ): Promise<string> {
    const amountToSend = convertFloatAmountToInt(amountToSendFloat, sourceChainToken.decimals);

    const vUsd = swapToVUsd(
      amountToSend,
      sourceChainToken,
      await getPoolInfoByToken(this.api, sourceChainToken)
    ).amountIncludingCommissionInSystemPrecision;
    const resultInt = swapFromVUsd(
      vUsd,
      destinationChainToken,
      await getPoolInfoByToken(this.api, destinationChainToken)
    ).amountIncludingCommissionInTokenPrecision;
    if (Big(resultInt).lte(0)) {
      throw new InsufficientPoolLiquidity();
    }
    return convertIntAmountToFloat(resultInt, destinationChainToken.decimals).toFixed();
  }

  /**
   * Calculates the amount of tokens to send based on the required amount of tokens the receiving party should get as a result of the swap.
   * @param amountToBeReceivedFloat the amount of tokens that should be received
   * @param sourceChainToken selected token on the source chain
   * @param destinationChainToken selected token on the destination chain
   */
  async getAmountToSend(
    amountToBeReceivedFloat: number | string | Big,
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails
  ): Promise<string> {
    const amountToBeReceived = convertFloatAmountToInt(amountToBeReceivedFloat, destinationChainToken.decimals);

    const vUsd = swapFromVUsdReverse(
      amountToBeReceived,
      destinationChainToken,
      await getPoolInfoByToken(this.api, destinationChainToken)
    ).amountIncludingCommissionInTokenPrecision;
    const resultInt = swapToVUsdReverse(
      vUsd,
      sourceChainToken,
      await getPoolInfoByToken(this.api, sourceChainToken)
    ).amountIncludingCommissionInSystemPrecision;
    if (Big(resultInt).lte(0)) {
      throw new InsufficientPoolLiquidity();
    }
    return convertIntAmountToFloat(resultInt, sourceChainToken.decimals).toFixed();
  }

  /**
   * Fetches possible ways to pay the transfer gas fee.
   * @param sourceChainToken selected token on the source chain
   * @param destinationChainToken selected token on the destination chain
   * @param messenger
   * @returns {@link GasFeeOptions}
   */
  async getGasFeeOptions(
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails,
    messenger: Messenger
  ): Promise<GasFeeOptions> {
    return getGasFeeOptions(
      sourceChainToken.allbridgeChainId,
      destinationChainToken.allbridgeChainId,
      sourceChainToken.decimals,
      messenger,
      this.api
    );
  }

  /**
   * Gets the average time in ms to complete a transfer for given tokens and messenger.
   * @param sourceChainToken selected token on the source chain.
   * @param destinationChainToken selected token on the destination chain.
   * @param messenger
   * @returns Average transfer time in milliseconds or null if a given combination of tokens and messenger is not supported.
   */
  getAverageTransferTime(
    sourceChainToken: TokenWithChainDetails,
    destinationChainToken: TokenWithChainDetails,
    messenger: Messenger
  ): number | null {
    return (
      /* eslint-disable-next-line  @typescript-eslint/no-unnecessary-condition */
      sourceChainToken.transferTime?.[destinationChainToken.chainSymbol]?.[messenger] ?? null
    );
  }

  /**
   * Forces refresh of cached information about the state of liquidity pools.
   * Outdated cache leads to calculated amounts being less accurate.
   * The cache is invalidated at regular intervals, but it can be forced to be refreshed by calling this method.
   */
  async refreshPoolInfo(): Promise<void> {
    return this.api.refreshPoolInfo();
  }

  /**
   * Convert APR to percentage view
   * @param apr
   * @returns aprPercentageView
   */
  aprInPercents(apr: number): string {
    return aprInPercents(apr);
  }

  swapAndBridgeFeeCalculation(
    amountInTokenPrecision: string,
    sourcePoolInfo: SwapPoolInfo,
    destinationPoolInfo: SwapPoolInfo
  ): SwapAndBridgeCalculationData {
    return swapAndBridgeFeeCalculation(amountInTokenPrecision, sourcePoolInfo, destinationPoolInfo);
  }
  swapAndBridgeFeeCalculationReverse(
    amountInTokenPrecision: string,
    sourcePoolInfo: SwapPoolInfo,
    destinationPoolInfo: SwapPoolInfo
  ): SwapAndBridgeCalculationData {
    return swapAndBridgeFeeCalculationReverse(amountInTokenPrecision, sourcePoolInfo, destinationPoolInfo);
  }
}
