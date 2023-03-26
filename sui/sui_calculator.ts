import { Checkpoint } from "@mysten/sui.js";
import { SuiRgp } from "./sui_rgp.ts";
import { SuiRpc } from "./sui_rpc.ts";

export class SuiCalculator {
    #rpc: SuiRpc;
    #validatorAddress: string;
    #rgp: SuiRgp | undefined;

    constructor(rpc: SuiRpc, validatorAddress: string) {
        this.#rpc = rpc;
        this.#validatorAddress = validatorAddress;
    }

    /**
     * Fetch all necessary data from the Sui RPC and initialize the SuiRgp class object.
     * SuiRgp is responsible for holding and processing all the data that is needed for our RGP calculations.
     */
    async initialize(): Promise<void> {
        this.#rgp = new SuiRgp(
            this.#validatorAddress,
            await this.#rpc.getValidatorStakes(this.#validatorAddress),
            await this.#rpc.getLatestSuiSystemState(),
            await this.getLatestCheckpoint(),
        );
    }

    /**
     * Helper method to get the latest checkpoint.
     *
     * @returns Latest checkpoint.
     */
    async getLatestCheckpoint(): Promise<Checkpoint> {
        return await this.#rpc.getCheckpoint(
            await this.#rpc.getLatestCheckpointSequenceNumber(),
        );
    }

    /**
     * Get all ValidatorEpochInfoEvents that have been emitted for the validator.
     *
     * @returns ValidatorEpochInfoEvents.
     */
    async getValidatorEpochInfoEvents() {
        return (await this.#rpc.queryEvents({
            MoveEventType: "0x2::validator_set::ValidatorEpochInfoEvent",
        })).data.filter((item) => {
            return item?.parsedJson?.validator_address === this.#validatorAddress;
        });
    }

    /**
     * Calculate the breakeven RGP for the validator.
     *
     * @returns The RGP in MIST.
     */
    calculate() {
        if (!this.#rgp) {
            throw new Error("RGP calculator has not been initialized.");
        }

        // TODO: add some sanity checks for the returned value.
        return this.#rgp.getValidatorBreakevenRgp();
    }
}
