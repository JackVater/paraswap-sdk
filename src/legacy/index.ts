import type Web3 from 'web3';
import type { ContractTransaction as EthersV5ContractTransaction } from '@ethersproject/contracts';

import { API_URL, DEFAULT_VERSION, SwapSide } from '../constants';

import { SwapSDKMethods, constructSwapSDK } from '../methods/swap';
import { assert } from 'ts-essentials';
import {
  constructAxiosFetcher,
  constructFetchFetcher,
  constructEthersV5ContractCaller,
  constructEthersV6ContractCaller,
  constructWeb3ContractCaller,
  isFetcherError,
  Web3UnpromiEvent,
  EthersProviderDeps,
} from '../helpers';

import { constructGetRate, type RateOptions } from '../methods/swap/rates';
import {
  constructBuildTx,
  type BuildOptions,
  type TransactionParams,
} from '../methods/swap/transaction';
import type {
  AddressOrSymbol,
  Token,
  FetcherFunction,
  ParaSwapVersionUnion,
  Address,
  PriceString,
  OptimalRate,
  TxSendOverrides,
} from '../types';
import { constructGetBalances, type Allowance } from '../methods/swap/balance';
import type { AxiosRequirement } from '../helpers/fetchers/axios';
import { isDataWithError } from '../helpers/misc';
import { constructPartialSDK } from '../sdk/partial';
import { constructGetTokens } from '../methods/swap/token';
import { constructGetSpender } from '../methods/swap/spender';
import { constructGetAdapters } from '../methods/swap/adapters';
import { ContractTransactionResponse as EthersV6ContractTransactionResponse } from 'ethers';

export type APIError = {
  message: string;
  status?: number;
  data?: any;
};
type Fetch = typeof fetch;

type TxResponse =
  | Web3UnpromiEvent
  | EthersV5ContractTransaction
  | EthersV6ContractTransactionResponse;

type LegacyOptions = {
  chainId?: number;
  apiURL?: string;
  version?: ParaSwapVersionUnion;
  apiKey?: string;
  web3Provider?: Web3;
  ethersDeps?: EthersProviderDeps; // need to be a provider with signer for approve requests
  account?: Address;
  axios?: AxiosRequirement;
  fetch?: Fetch;
};

/** @deprecated */
export class ParaSwap {
  sdk: Partial<SwapSDKMethods<TxResponse>> = {};
  fetcher: FetcherFunction;

  chainId: number;
  apiURL: string;
  version: ParaSwapVersionUnion;
  web3Provider?: Web3;
  ethersDeps?: EthersProviderDeps; // need to be a provider with signer for approve requests
  account?: Address;

  constructor({
    chainId = 1,
    apiURL = API_URL,
    version = DEFAULT_VERSION,
    apiKey,
    web3Provider,
    ethersDeps,
    account,
    axios,
    fetch,
  }: LegacyOptions) {
    this.chainId = chainId;
    this.apiURL = apiURL;
    this.version = version;
    this.web3Provider = web3Provider;
    this.ethersDeps = ethersDeps;
    this.account = account;

    const fetcher = axios
      ? constructAxiosFetcher(axios, { apiKey })
      : fetch
      ? constructFetchFetcher(fetch, { apiKey })
      : null;

    assert(fetcher, 'at least one fetcher is needed');
    this.fetcher = fetcher;

    if (!web3Provider && !ethersDeps) {
      this.sdk = constructPartialSDK(
        { fetcher, apiURL, version, apiKey, chainId },
        constructGetBalances,
        constructGetTokens,
        constructGetSpender,
        constructBuildTx,
        constructGetAdapters,
        constructGetRate
      );

      return;
    }

    const contractCaller = ethersDeps
      ? 'ethersV6ProviderOrSigner' in ethersDeps
        ? constructEthersV6ContractCaller(ethersDeps, account)
        : constructEthersV5ContractCaller(ethersDeps, account)
      : web3Provider
      ? constructWeb3ContractCaller(web3Provider, account)
      : null;

    if (contractCaller) {
      this.sdk = constructSwapSDK<TxResponse>({
        fetcher,
        contractCaller,
        apiURL,
        version,
        chainId,
      });
    }
  }

  private static handleAPIError(e: unknown): APIError {
    // @CONSIDER if some errors should not be replaced
    if (!isFetcherError(e)) {
      return { message: `Unknown error: ${e}` };
    }

    if (!e.response) {
      return { message: e.message };
    }

    const { status, data } = e.response;

    return {
      status,
      message: isDataWithError(data) ? data.error : e.message,
      data,
    };
  }

  private static async extractHashFromTxResponse(
    txResponse: TxResponse
  ): Promise<string> {
    if ('once' in txResponse) {
      return new Promise<string>((resolve, reject) => {
        txResponse.once('transactionHash', resolve);
        txResponse.once('error', reject);
      });
    }

    const { hash } = await txResponse;
    return hash;
  }

  setWeb3Provider(web3Provider: Web3, account?: string): this {
    const contractCaller = constructWeb3ContractCaller(web3Provider, account);
    const { apiURL, chainId, fetcher } = this;

    this.sdk = constructSwapSDK({
      fetcher,
      contractCaller,
      apiURL,
      version: this.version,
      chainId,
    });

    this.web3Provider = web3Provider;
    this.ethersDeps = undefined;
    this.account = account;

    return this;
  }

  setEthersProvider(ethersDeps: EthersProviderDeps, account?: string): this {
    const { apiURL, chainId, fetcher } = this;

    if ('ethersV6ProviderOrSigner' in ethersDeps) {
      const contractCaller = constructEthersV6ContractCaller(
        ethersDeps,
        account
      );
      this.sdk = constructSwapSDK({
        fetcher,
        contractCaller,
        apiURL,
        version: this.version,
        chainId,
      });
    } else {
      const contractCaller = constructEthersV5ContractCaller(
        ethersDeps,
        account
      );
      this.sdk = constructSwapSDK({
        fetcher,
        contractCaller,
        apiURL,
        version: this.version,
        chainId,
      });
    }

    this.web3Provider = undefined;
    this.ethersDeps = ethersDeps;
    this.account = account;

    return this;
  }

  // @CONSIDER I still think there's no need for a class Token
  async getTokens(): Promise<Token[] | APIError> {
    assert(this.sdk.getTokens, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getTokens();
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getAdapters() {
    assert(this.sdk.getAdapters, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getAdapters();
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getRateByRoute(
    route: AddressOrSymbol[],
    amount: PriceString,
    userAddress?: Address,
    side: SwapSide = SwapSide.SELL,
    options?: RateOptions,
    srcDecimals?: number,
    destDecimals?: number
  ): Promise<OptimalRate | APIError> {
    assert(this.sdk.getRateByRoute, 'sdk must be initialized with a fetcher');
    if (route.length < 2) {
      return { message: 'Invalid Route' };
    }

    try {
      return await this.sdk.getRateByRoute({
        route,
        amount,
        userAddress,
        side,
        options,
        srcDecimals,
        destDecimals,
      });
    } catch (e) {
      // @TODO this overrides any non FetchError,
      // including Error('Invalid DEX list')
      return ParaSwap.handleAPIError(e);
    }
  }

  async getRate(
    srcToken: AddressOrSymbol,
    destToken: AddressOrSymbol,
    amount: PriceString,
    userAddress?: Address,
    side: SwapSide = SwapSide.SELL,
    options: RateOptions = {},
    srcDecimals?: number,
    destDecimals?: number
  ): Promise<OptimalRate | APIError> {
    assert(this.sdk.getRate, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getRate({
        srcToken,
        destToken,
        amount,
        userAddress,
        side,
        options,
        srcDecimals,
        destDecimals,
      });
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async buildTx(
    srcToken: Address,
    destToken: Address,
    srcAmount: PriceString,
    destAmount: PriceString,
    priceRoute: OptimalRate,
    userAddress: Address,
    partner?: string,
    partnerAddress?: string,
    partnerFeeBps?: number,
    receiver?: Address,
    options: BuildOptions = {},
    srcDecimals?: number,
    destDecimals?: number,
    permit?: string,
    deadline?: string
  ): Promise<TransactionParams | APIError> {
    assert(this.sdk.buildTx, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.buildTx(
        {
          srcToken,
          destToken,
          srcAmount,
          destAmount,
          priceRoute,
          userAddress,
          partner,
          partnerAddress,
          partnerFeeBps,
          receiver,
          srcDecimals,
          destDecimals,
          permit,
          deadline,
        },
        options
      );
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getTokenTransferProxy(_provider?: any): Promise<Address | APIError> {
    assert(this.sdk.getSpender, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getSpender();
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getAllowances(
    userAddress: Address,
    tokenAddresses: Address[]
  ): Promise<Allowance[] | APIError> {
    assert(this.sdk.getAllowances, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getAllowances(userAddress, tokenAddresses);
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getAllowance(
    userAddress: Address,
    tokenAddress: Address
  ): Promise<Allowance | APIError> {
    assert(this.sdk.getAllowance, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getAllowance(userAddress, tokenAddress);
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async approveTokenBulk(
    amount: PriceString,
    userAddress: Address,
    tokenAddresses: Address[],
    /** @deprecated */
    _provider?: any // not used, can't detect if Ethers or Web3 provider without importing them
  ): Promise<string[] | APIError> {
    // @TODO expand sendOptions
    assert(
      this.sdk.approveTokenBulk,
      'sdk must be initialized with a provider'
    );
    try {
      // @TODO allow to pass Web3 specific sendOptions ({from: userAddress})
      const txResponses = await this.sdk.approveTokenBulk(
        amount,
        tokenAddresses
      );

      return await Promise.all(
        txResponses.map(ParaSwap.extractHashFromTxResponse)
      );
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async approveToken(
    amount: PriceString,
    userAddress: Address,
    tokenAddress: Address,
    /** @deprecated */
    _provider?: any, // not used, can't detect if Ethers or Web3 provider without importing them
    sendOptions?: Omit<TxSendOverrides, 'from'>
  ): Promise<string | APIError> {
    // @TODO expand sendOptions
    assert(this.sdk.approveToken, 'sdk must be initialized with a provider');
    try {
      // @TODO allow to pass Web3 specific sendOptions ({from: userAddress})
      const txResponse = await this.sdk.approveToken(
        amount,
        tokenAddress,
        sendOptions
      );

      return await ParaSwap.extractHashFromTxResponse(txResponse);
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getMarketNames(): Promise<string[] | APIError> {
    assert(this.sdk.getAdapters, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getAdapters();
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getBalance(
    userAddress: Address,
    token: AddressOrSymbol
  ): Promise<Token | APIError> {
    assert(this.sdk.getBalance, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getBalance(userAddress, token);
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }

  async getBalances(userAddress: Address): Promise<Token[] | APIError> {
    assert(this.sdk.getBalances, 'sdk must be initialized with a fetcher');
    try {
      return await this.sdk.getBalances(userAddress);
    } catch (e) {
      return ParaSwap.handleAPIError(e);
    }
  }
}
