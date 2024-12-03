[**@paraswap/sdk**](../../README.md) • **Docs**

***

[@paraswap/sdk](../../globals.md) / [\<internal\>](../README.md) / EnumerateLiteral

# Type Alias: EnumerateLiteral\<T\>

> **EnumerateLiteral**\<`T`\>: \{ \[K in keyof T\]: T\[K\] extends \`$\{infer n\}\` ? n : never \}\[keyof `T`\]

## Type Parameters

• **T** *extends* [`Record`](Record.md)\<`string`, `any`\>

## Defined in

[src/types.ts:26](https://github.com/paraswap/paraswap-sdk/blob/master/src/types.ts#L26)