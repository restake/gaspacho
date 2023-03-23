import { DelegatedStake, Checkpoint, SuiSystemStateSummary } from "@mysten/sui.js";
import { SuiData } from "./sui_data.ts";

import { ActiveValidator, SuiRpc } from "./sui_rpc.ts";
import Config from '../config.ts';

export class SuiRgp {

    #rpc: SuiRpc;
    #validatorAddress: string;
    #latestSystemState: SuiSystemStateSummary | undefined;
    #latestCheckpoint: Checkpoint | undefined;

    constructor(rpc: SuiRpc, validatorAddress: string) {
        this.#rpc = rpc;
        this.#validatorAddress = validatorAddress;
    }

    /**
     * Helper method to get the latest checkpoint.
     *
     * @returns Latest checkpoint.
     */
    async getLatestCheckpoint(): Promise<Checkpoint> {
        return await this.#rpc.getCheckpoint(
            await this.#rpc.getLatestCheckpointSequenceNumber()
        );
    }

    /**
     * SuiData object is responsible for holding and processing all the data that is needed for our RGP calculations.
     *
     * @returns
     */
    async getSuiData(): Promise<SuiData> {
        this.#latestSystemState = await this.#rpc.getLatestSuiSystemState();
        this.#latestCheckpoint = await this.getLatestCheckpoint();
        // TODO: we could potentially keep validatorStakes in memory as well.
        const validatorStakes = await this.#rpc.getValidatorStakes(this.#validatorAddress);

        return new SuiData(
            this.#validatorAddress,
            validatorStakes,
            this.#latestSystemState,
            this.#latestCheckpoint
        );
    }

    async getProcessedGasUnits(): Promise<number> {
        if (!this.#latestCheckpoint) {
            return 0;
        }
        const rgp = await this.#rpc.getReferenceGasPrice();

        return this.#latestCheckpoint.epochRollingGasCostSummary.computationCost / rgp;
    }

    async getBreakevenGasPrice() {
        const data = await this.getSuiData();

        const nextEpochNetworkTotalStake = data.getNextEpochNetworkTotalStake();
        const validatorData = data.getLatestValidatorData();

        const u = this.getProcessedGasUnits();
        const beta = Number(data.getValidatorSelfStakesAmount()) / data.getPoolTotalTokenBalance();
        const sigma = data.getPoolTotalTokenBalance() / nextEpochNetworkTotalStake;

        // Storage fund share.
        const oneMinusAlpha = ((state.storageFund + latestCheckpoint.epochRollingGasCostSummary.storageCost -
                latestCheckpoint.epochRollingGasCostSummary.storageRebate) * 1e-9) / nextEpochNetworkTotalStake * 1e-9;

        const alpha = 1 - oneMinusAlpha;
        const delta = Number(validatorData?.nextEpochCommissionRate) ||  0;
        const mu = 1; // TODO: check if we are being tallied or not.
        const gamma = 0.95; // % of rewards that are distributed between validators
        const N = this.#state.activeValidators.length; // number of active validators

        const K = alpha * (beta + delta * (1 - beta)) * mu * sigma + (1 - alpha) * gamma / N;

        const S = Number(nextEpochNetworkTotalStake);

        const suiPrice = Config.SUI_PRICE_USD;
        const serverCosts = Config.SERVER_COSTS_USD;
        const hoursInEpoch = 24;

        const epochCosts = (serverCosts / (24 * 30)) * hoursInEpoch;

        console.log("epochCosts", epochCosts);
        console.log("suiPrice", suiPrice);
        console.log("K", K);
        console.log("S", S);
        console.log("u", u);

        // const breakevenGasPrice = ((epochCosts / (suiPrice * K) - S / 10000) * 1e9) / u;
        // K: share of the network stake
        const breakevenGasPrice = ((epochCosts / (suiPrice * K) - S / 10000) * 1e9) / u;

        console.log(breakevenGasPrice);

        return breakevenGasPrice;
    }
}
