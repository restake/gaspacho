import Config from "./config.ts";
import { Connection } from "@mysten/sui.js";

import { SuiRgp } from "./rgp/sui_rgp.ts";
import { SuiRpc } from "./rgp/sui_rpc.ts";

const connection = new Connection({
    fullnode: Config.RPC_URL,
});

const rpc = new SuiRpc(connection);
const processor = new SuiRgp(rpc, Config.VALIDATOR_ADDRESS);

console.log(await processor.getBreakevenGasPrice());

// const stakes: DelegatedStake[] = await provider.getStakes({
//     owner: validator_address,
// });

// const selfStakeObjects = stakes.find((stake) => stake.validatorAddress === validator_address);
// // Sum all active stakes to get our total stake. Note: this DOES NOT estimatedRewards (for now).
// const selfStakeAmount: number =
//     (selfStakeObjects?.stakes.reduce((sum, item) => sum + item.principal + Number(item?.estimatedReward), 0) || 0) * 1e-9;

// // Since we run this code at the boundary of epoch, we can assume that these are more or less valid for "next epoch".
// const totalPoolTokenBalance: number = (
//     Number(validatorData?.poolTokenBalance) + Number(validatorData?.pendingStake) - Number(validatorData?.pendingPoolTokenWithdraw)
// ) * 1e-9;

// const nextEpochNetworkTotalStake: number = (state.activeValidators.reduce((stake, validator) => stake + validator.nextEpochStake, 0)) *
//     1e-9;

// // Above this line, all token units are in MIST. From here on, we convert to SUI with * 1e-9

// const u: number = latestCheckpoint.epochRollingGasCostSummary.computationCost / currentRgp;
// const beta: number = Number(selfStakeAmount) / Number(totalPoolTokenBalance);
// const sigma: number = Number(totalPoolTokenBalance) / Number(nextEpochNetworkTotalStake); // More or less votingPower when we multiply it by 10000
// const one_minus_alpha: number = ((state.storageFund + latestCheckpoint.epochRollingGasCostSummary.storageCost -
//     latestCheckpoint.epochRollingGasCostSummary.storageRebate) * 1e-9) / Number(nextEpochNetworkTotalStake) * 1e-9;
// const alpha = 1 - one_minus_alpha;

// const delta = Number(validatorData?.nextEpochCommissionRate) || 0;
// const mu = 1; // TODO: check if we are being tallied or not
// const gamma = 0.95; // Wtf is that?
// const N = state.activeValidators.length; // Number of validators

// const K = alpha * (beta + delta * (1 - beta)) * mu * sigma + (1 - alpha) * gamma / N;

// const S = Number(nextEpochNetworkTotalStake);

// const suiPrice = 50;
// const serverCosts = 500;
// const hoursInEpoch = 24;

// const epochCosts = (serverCosts / (24 * 30)) * hoursInEpoch;

// console.log("epochCosts", epochCosts);
// console.log("suiPrice", suiPrice);
// console.log("K", K);
// console.log("S", S);
// console.log("u", u);

// // const breakevenGasPrice = ((epochCosts / (suiPrice * K) - S / 10000) * 1e9) / u;
// // K: share of the network stake
// const breakevenGasPrice = ((epochCosts / (suiPrice * K) - S / 10000) * 1e9) / u;

// console.log(Math.max(0, breakevenGasPrice));

// console.log((await provider.queryEvents({
//     query: { MoveEventType: "0x2::validator_set::ValidatorEpochInfoEvent"}
// })).data.find(item => {
//     return item?.parsedJson.validator_address === "0xc7ec33d8f05aa633a32447207c036af1e479ee62c60963067a729b6df065eddc";
// }));

// console.log(state);
