import { VersionedTransaction, Keypair, SystemProgram, Transaction, Connection, ComputeBudgetProgram, sendAndConfirmTransaction, PublicKey } from "@solana/web3.js"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import { openAsBlob } from "fs";
import base58 from "bs58"
import { DESCRIPTION, FILE, PRIVATE_KEY, RPC_ENDPOINT, RPC_WEBSOCKET_ENDPOINT, SWAP_AMOUNT, TELEGRAM, TOKEN_CREATE_ON, TOKEN_NAME, TOKEN_SHOW_NAME, TOKEN_SYMBOL, TWITTER, WEBSITE } from "./constants"
import { readJson, saveDataToFile, sleep } from "./utils"
import { PumpFunSDK } from "./src/pumpfun";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";


const commitment = "confirmed"
const connection = new Connection(RPC_ENDPOINT, {
    wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment
})

const mainKp = Keypair.fromSecretKey(base58.decode(PRIVATE_KEY))

const MINT_ADDRESS = "8X5vFuWhoQacpwWeJ5rfE2DcsQfATcHCoWLJGcjwyQ2K"
// const base58String = "2DYpJG8EhdSVE2dA4Jm2oSgfy2NSdUFsp7rF6ThNifEgJnBQYL9kR5wkeEVkYffUBfqnjmNfYcRTvE9KF32PEnnT";
// const mintsecretKey = bs58.decode(base58String);
// const mintKeypair = Keypair.fromSecretKey(mintsecretKey);
// const MINT_ADDRESS = mintKeypair.publicKey.toBase58();
const mintAddress = new PublicKey(MINT_ADDRESS);

let sdk = new PumpFunSDK(new AnchorProvider(connection, new NodeWallet(new Keypair()), { commitment }));

const main = async () => {
    try {

        console.log(await connection.getBalance(mainKp.publicKey) / 10 ** 9, "SOL in main keypair")

        console.log(mintAddress);


        try {
            console.log("====================== Token Buy start ==========================")

            const tokenBuyix = await makeBuyIx(mainKp, Math.floor(SWAP_AMOUNT * 10 ** 9))


            if (!tokenBuyix) {
                console.log("Token buy instruction not retrieved")
                return
            }
            // console.log(tokenBuyix);
            const tx = new Transaction().add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 100_000,
                }),
                ComputeBudgetProgram.setComputeUnitLimit({
                    units: 200_000,
                }),
                ...tokenBuyix

            )

            tx.feePayer = mainKp.publicKey
            tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

            console.log(await connection.simulateTransaction(tx))

            const signature = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: commitment });

            console.log(`Buy Tokens : https://solscan.io/tx/${signature}`)

            console.log("======================= Token Buy end ==========================")

        } catch (error) {
            console.log("======================== Token Buy fail =========================")
        }


        try {
            console.log("======================== Token Sell start =========================")

            const tokenAccount = await getAssociatedTokenAddress(mintAddress, mainKp.publicKey);

            const tokenBalance = (await connection.getTokenAccountBalance(tokenAccount)).value.amount


            if (tokenBalance) {
                // console.log("tokenBalance", Math.floor(tokenBalance * 10 ** 5));


                const tokenSellix = await makeSellIx(mainKp, Number(tokenBalance))
                console.log(tokenSellix);
                if (!tokenSellix) {
                    console.log("Token buy instruction not retrieved")
                    return
                }

                const tx = new Transaction().add(
                    ComputeBudgetProgram.setComputeUnitPrice({
                        microLamports: 100_000,
                    }),
                    ComputeBudgetProgram.setComputeUnitLimit({
                        units: 200_000,
                    }),
                    tokenSellix

                )

                tx.feePayer = mainKp.publicKey
                tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

                console.log(await connection.simulateTransaction(tx))

                const signature = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: commitment });

                console.log(`Sell Tokens : https://solscan.io/tx/${signature}`)

            }

            console.log("======================== Token Sell end ==========================")

        } catch (error) {
            console.log("======================== Token Sell fail =========================")
        }

    } catch (error) {
        console.log("Token trading error");
    }

}


// make buy instructions
const makeBuyIx = async (kp: Keypair, buyAmount: number) => {
    let buyIx = await sdk.getBuyInstructionsBySolAmount(
        kp.publicKey,
        mintAddress,
        BigInt(buyAmount),
        BigInt(10000000),
        commitment
    );
    console.log("Buyamount:", buyAmount);

    return buyIx
}

// make sell instructions
const makeSellIx = async (kp: Keypair, sellAmount: number) => {
    let sellIx = await sdk.getSellInstructionsByTokenAmount(
        kp.publicKey,
        mintAddress,
        BigInt(sellAmount),
        BigInt(100),
        commitment
    );

    console.log("Sellamount:", sellAmount);

    return sellIx
}







main()