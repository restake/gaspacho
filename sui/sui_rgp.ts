import { Checkpoint, DelegatedStake, SuiSystemStateSummary } from "@mysten/sui.js";
import { ActiveValidator } from "./sui_rpc.ts";
import Config from "../config.ts";
import { mistToSui, suiToMist } from "../mist.ts";

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
            return Number(totalStake) + Number(validator.nextEpochStake);
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
                return Number(amount) + Number(stake.principal) + Number(stake.estimatedReward ?? 0);
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

        return Number(data.poolTokenBalance) + Number(data.pendingStake) - Number(data.pendingPoolTokenWithdraw);
    }

    /**
     * Get processed gas units for the current epoch (also known as `u` in the RGP formula).
     *
     * @returns Processed gas units in MIST.
     */
    getProcessedGasUnits(): number {
        return Number(this.#latestCheckpoint.epochRollingGasCostSummary.computationCost) /
            Number(this.#latestSystemState.referenceGasPrice) /
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
        const currentStorageFund = Number(this.#latestSystemState.storageFundNonRefundableBalance) +
            Number(this.#latestSystemState.storageFundTotalObjectStorageRebates);

        const nextEpochStorageFundChange = (Number(this.#latestCheckpoint.epochRollingGasCostSummary.storageCost) -
            Number(this.#latestCheckpoint.epochRollingGasCostSummary.storageRebate)) / this.getEpochProgress();

        const nextEpochStorageFund = currentStorageFund + nextEpochStorageFundChange;

        return nextEpochStorageFund / this.getNextEpochNetworkTotalStake();
    }

    /**
     * Get the validator's commission rate for the next epoch (also known as `delta` in the RGP formula).
     *
     * @returns Commission rate.
     */
    getValidatorNextEpochCommissionRate(): number {
        const data = this.getLatestValidatorData();
        if (!data) {
            return 0;
        }

        return Number(data.nextEpochCommissionRate) / 10000;
    }

    /**
     * Get epoch progress, i.e. where exactly we are in the current epoch.
     * This is a value between 0 and 1.
     *
     * @returns
     */
    getEpochProgress(): number {
        return ((new Date()).getTime() - Number(this.#latestSystemState.epochStartTimestampMs)) /
            Number(this.#latestSystemState.epochDurationMs);
    }

    /**
     * Get validator's operating costs per epoch in USD.
     * Note: we assume that server billing period is 30 days.
     *
     * @returns Costs per epoch in USD.
     */
    getValidatorEpochCosts(): number {
        return (Config.VALIDATOR_COSTS_USD / (24 * 30)) * (Number(this.#latestSystemState.epochDurationMs) / 1000 / 3600);
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
        const alpha = 1 - this.getStorageFundShare();
        const delta = this.getValidatorNextEpochCommissionRate();
        const mu = this.getValidatorTallyingStatus();

        const gamma = 0.95; // % of rewards that are distributed between validators

        const N = this.getActiveValidators().length;

        return alpha * (beta + delta * (1 - beta)) * mu * sigma + (1 - alpha) * gamma / N;
    }

    getValidatorVotingPower(address: string): number {
        const activeValidators = this.getActiveValidators();
        const validator = activeValidators.find((validator) => validator.suiAddress === address);

        return Number(validator?.votingPower) / 10000;
    }

    getValidatorTallyingStatus(): number {
        const reports = this.#latestSystemState.validatorReportRecords;
        const tallyScore = reports.reduce((acc, report) => {
            const reporter = report[0];
            if (this.#validatorAddress in report[1]) {
                acc += this.getValidatorVotingPower(reporter);
            }
            return acc;
        }, 0);

        return Number(tallyScore <= 2 / 3);
    }

    getNextEpochStakeSubsidy(): number {
        let stakeSubidy = Number(this.#latestSystemState.stakeSubsidyCurrentDistributionAmount);
        if (Number(this.#latestSystemState.stakeSubsidyPeriodLength) === 1) {
            stakeSubidy *= 1 - Number(this.#latestSystemState.stakeSubsidyDecreaseRate) / 10000;
        }

        return stakeSubidy;
    }

    /**
     * Get breakeven RGP for the validator.
     *
     * @returns RGP in MIST.
     */
    getValidatorBreakevenRgp(): number {
        const epochCosts = this.getValidatorEpochCosts();

        const K = this.getValidatorRewardShare();
        const u = this.getProcessedGasUnits();
        const S = this.getNextEpochStakeSubsidy();

        return Math.max(0, suiToMist(epochCosts / (Config.SUI_PRICE_USD * K) - mistToSui(S)) / u);
    }
}
