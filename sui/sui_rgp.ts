import { Checkpoint, DelegatedStake, SuiSystemStateSummary } from "@mysten/sui.js";
import { ActiveValidator } from "./sui_rpc.ts";
import Config from "../config.ts";
import { suiToMist } from "../mist.ts";

export class SuiRgp {
    #validatorAddress: string;
    #validatorStakes: DelegatedStake[];
    #latestSystemState: SuiSystemStateSummary;
    #latestCheckpoint: Checkpoint;

    constructor(
        validatorAddress: string,
        validatorStakes: DelegatedStake[],
        latestSystemState: SuiSystemStateSummary,
        latestCheckpoint: Checkpoint,
    ) {
        this.#validatorAddress = validatorAddress;
        this.#validatorStakes = validatorStakes;
        this.#latestSystemState = latestSystemState;
        this.#latestCheckpoint = latestCheckpoint;
    }

    /**
     * Get the latest validator data from the Sui system state.
     *
     * @returns Latest validator data.
     */
    getLatestValidatorData(): ActiveValidator | undefined {
        return this.#latestSystemState.activeValidators.find((validator) => {
            return validator.suiAddress === this.#validatorAddress;
        });
    }

    /**
     * Get all validators currently participating in the consensus.
     * TODO: also include the next epoch validators (e.g. pending validators)?
     *
     * @returns All active validators.
     */
    getActiveValidators(): ActiveValidator[] {
        return this.#latestSystemState.activeValidators;
    }

    /**
     * Get the total amount of stake that will be active in the next epoch.
     *
     * @returns Total amount of stake in the network in MIST.
     */
    getNextEpochNetworkTotalStake(): number {
        return this.#latestSystemState.activeValidators.reduce((totalStake, validator) => {
            return totalStake + validator.nextEpochStake;
        }, 0);
    }

    /**
     * Get all DelegatedStake objects that have been delegated by the validator to itself, e.g. self-stake.
     *
     * @returns DelegatedStake objects that are assigned to validatorAddress.
     */
    getValidatorSelfStakes(): DelegatedStake[] {
        return this.#validatorStakes.filter((stake) => {
            return stake.validatorAddress === this.#validatorAddress;
        });
    }

    /**
     * Get the total amount of self-stakes.
     * TODO: this currently also includes estimatedRewards. This needs to be confirmed!
     *
     * @returns Total amount of self-stakes in MIST.
     */
    getValidatorSelfStakesAmount(): number {
        return this.getValidatorSelfStakes().map((stake) => {
            return stake.stakes.reduce((amount, stake) => {
                return amount + stake.principal + (stake.estimatedReward ?? 0);
            }, 0);
        }).reduce((amount, stake) => {
            return amount + stake;
        }, 0);
    }

    /**
     * Get the total token balance for the pool operated by the validator.
     * This is effective from the next epoch.
     * TODO: actually verify that this is the right way to do it.
     *
     * @returns Total token balance for the pool in MIST.
     */
    getPoolTotalTokenBalance(): number {
        const data = this.getLatestValidatorData();
        if (!data) {
            return 0;
        }

        return data.poolTokenBalance + data.pendingStake - data.pendingPoolTokenWithdraw;
    }

    /**
     * Get processed gas units for the current epoch (also known as `u` in the RGP formula).
     *
     * @returns Processed gas units in MIST.
     */
    getProcessedGasUnits(): number {
        return this.#latestCheckpoint.epochRollingGasCostSummary.computationCost / this.#latestSystemState.referenceGasPrice /
            this.getEpochProgress();
    }

    /**
     * Validator's self-stake share of the pool's total token balance (also known as `beta` in the RGP formula).
     *
     * @returns Self-stake share of the pool's total token balance.
     */
    getValidatorSelfStakesShareInPool(): number {
        return this.getValidatorSelfStakesAmount() / this.getPoolTotalTokenBalance();
    }

    /**
     * Validator's share of the network's total stake (also known as `sigma` in the RGP formula).
     *
     * @returns Validator's share of the network's total stake.
     */
    getValidatorShareInNetwork(): number {
        return this.getPoolTotalTokenBalance() / this.getNextEpochNetworkTotalStake();
    }

    /**
     * Get storage fund share (also known as `alpha` in the RGP formula).
     *
     * @returns Storage fund share.
     */
    getStorageFundShare(): number {
        const storageFund = this.#latestSystemState.storageFund +
            this.#latestCheckpoint.epochRollingGasCostSummary.storageCost -
            this.#latestCheckpoint.epochRollingGasCostSummary.storageRebate;

        return 1 - storageFund / this.getNextEpochNetworkTotalStake();
    }

    /**
     * Get the validator's commission rate for the next epoch (also known as `delta` in the RGP formula).
     *
     * @returns Commission rate.
     */
    getValidatorNextEpochCommissionRate(): number {
        const data = this.getLatestValidatorData();
        if (!data) {
            // TODO: what should be the actual fallback value?
            return 0;
        }

        return data.nextEpochCommissionRate;
    }

    /**
     * Get epoch progress, i.e. where exactly we are in the current epoch.
     * This is a value between 0 and 1.
     *
     * @returns
     */
    getEpochProgress(): number {
        return ((new Date()).getTime() - this.#latestSystemState.epochStartTimestampMs) / this.#latestSystemState.epochDurationMs;
    }

    /**
     * Get validator's operating costs per epoch in USD.
     * Note: we assume that server billing period is 30 days.
     *
     * @returns Costs per epoch in USD.
     */
    getValidatorEpochCosts(): number {
        return (Config.VALIDATOR_COSTS_USD / (24 * 30)) * (this.#latestSystemState.epochDurationMs / 1000 / 3600);
    }

    /**
     * Get validator's share of the network's total stake (also known as `K` in the RGP formula).
     * This is also sometimes referred to as the validator's voting power.
     *
     * @returns Share of the network's total stake.
     */
    getValidatorRewardShare(): number {
        const beta = this.getValidatorSelfStakesShareInPool();
        const sigma = this.getValidatorShareInNetwork();
        const alpha = this.getStorageFundShare();
        const delta = this.getValidatorNextEpochCommissionRate();

        const mu = 1; // TODO: check if we are being tallied or not.
        const gamma = 0.95; // % of rewards that are distributed between validators

        const N = this.getActiveValidators().length;

        return alpha * (beta + delta * (1 - beta)) * mu * sigma + (1 - alpha) * gamma / N;
    }

    /**
     * Get breakeven RGP for the validator.
     *
     * @returns RGP in MIST.
     */
    getValidatorBreakevenRgp(): number {
        const epochCosts = this.getValidatorEpochCosts();

        const K = this.getValidatorRewardShare();
        const S = this.getNextEpochNetworkTotalStake();
        const u = this.getProcessedGasUnits();

        return suiToMist(epochCosts / (Config.SUI_PRICE_USD * K) - S / 10000) / u;
    }
}
