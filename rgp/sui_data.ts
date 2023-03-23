import { Checkpoint, DelegatedStake, SuiSystemStateSummary } from "@mysten/sui.js";
import { ActiveValidator } from "./sui_rpc.ts";

export class SuiData {

    #validatorAddress: string;
    #validatorStakes: DelegatedStake[];
    #latestSystemState: SuiSystemStateSummary;
    #latestCheckpoint: Checkpoint;

    constructor(
        validatorAddress: string,
        validatorStakes: DelegatedStake[],
        latestSystemState: SuiSystemStateSummary,
        latestCheckpoint: Checkpoint
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
        return this.#latestSystemState.activeValidators.find((validator) => validator.suiAddress === this.#validatorAddress);
    }

    /**
     * Get the total amount of stake that will be active in the next epoch.
     *
     * @returns Total amount of stake in the network in MIST.
     */
    getNextEpochNetworkTotalStake(): number {
        return this.#latestSystemState.activeValidators.reduce((totalStake, validator) => totalStake + validator.nextEpochStake, 0);
    }

    /**
     * Get all DelegatedStake objects that have been delegated by the validator to itself, e.g. self-stake.
     * TODO: make the return type more strict.
     *
     * @returns DelegatedStake objects that are assigned to validatorAddress.
     */
    getValidatorSelfStakes(): DelegatedStake[] {
        return this.#validatorStakes.filter((stake) => stake.validatorAddress === this.#validatorAddress);
    }

    /**
     * Get the total amount of self-stakes.
     * TODO: this currently also includes estimatedRewards. This needs to be confirmed! Also verify return type.
     *
     * @returns Total amount of self-stakes in MIST.
     */
    getValidatorSelfStakesAmount(): number {
        return this.getValidatorSelfStakes().map((stake) => {
            return stake.stakes.reduce((amount, stake) => amount + stake.principal + (stake.estimatedReward ?? 0), 0);
        }).reduce((amount, stake) => amount + stake, 0)
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
}
