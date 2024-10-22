[@paraswap/sdk](../README.md) / [Exports](../modules.md) / ConstructProviderFetchInput

# Interface: ConstructProviderFetchInput<T, D\>

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `T` |
| `D` | extends keyof [`ContractCallerFunctions`](ContractCallerFunctions.md)<`T`\> = keyof [`ContractCallerFunctions`](ContractCallerFunctions.md)<`T`\> |

## Hierarchy

- [`ConstructFetchInput`](ConstructFetchInput.md)

  ↳ **`ConstructProviderFetchInput`**

## Table of contents

### Properties

- [apiURL](ConstructProviderFetchInput.md#apiurl)
- [chainId](ConstructProviderFetchInput.md#chainid)
- [contractCaller](ConstructProviderFetchInput.md#contractcaller)
- [fetcher](ConstructProviderFetchInput.md#fetcher)
- [version](ConstructProviderFetchInput.md#version)

## Properties

### apiURL

• `Optional` **apiURL**: `string`

#### Inherited from

[ConstructFetchInput](ConstructFetchInput.md).[apiURL](ConstructFetchInput.md#apiurl)

#### Defined in

[src/types.ts:38](https://github.com/paraswap/paraswap-sdk/blob/master/src/types.ts#L38)

___

### chainId

• **chainId**: `number`

#### Inherited from

[ConstructFetchInput](ConstructFetchInput.md).[chainId](ConstructFetchInput.md#chainid)

#### Defined in

[src/types.ts:40](https://github.com/paraswap/paraswap-sdk/blob/master/src/types.ts#L40)

___

### contractCaller

• **contractCaller**: [`Pick`](../modules/internal_.md#pick)<[`ContractCallerFunctions`](ContractCallerFunctions.md)<`T`\>, `D`\>

#### Defined in

[src/types.ts:125](https://github.com/paraswap/paraswap-sdk/blob/master/src/types.ts#L125)

___

### fetcher

• **fetcher**: [`FetcherFunction`](../modules.md#fetcherfunction)

#### Inherited from

[ConstructFetchInput](ConstructFetchInput.md).[fetcher](ConstructFetchInput.md#fetcher)

#### Defined in

[src/types.ts:66](https://github.com/paraswap/paraswap-sdk/blob/master/src/types.ts#L66)

___

### version

• `Optional` **version**: [`ParaSwapVersion`](../modules.md#paraswapversion)

#### Inherited from

[ConstructFetchInput](ConstructFetchInput.md).[version](ConstructFetchInput.md#version)

#### Defined in

[src/types.ts:39](https://github.com/paraswap/paraswap-sdk/blob/master/src/types.ts#L39)
