import { Checkpoint } from "@mysten/sui.js";
import { SuiData } from "./sui_data.ts";
import { SuiRpc } from "./sui_rpc.ts";

export class SuiRgp {
    #rpc: SuiRpc;
    #validatorAddress: string;
    #data: SuiData | undefined;

    constructor(rpc: SuiRpc, validatorAddress: string) {
        this.#rpc = rpc;
        this.#validatorAddress = validatorAddress;
    }

    /**
     * Fetch all necessary data from the Sui RPC and initialize the SuiData object.
     * SuiData is responsible for holding and processing all the data that is needed for our RGP calculations.
     */
    async initialize(): Promise<void> {
        this.#data = new SuiData(
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
        if (!this.#data) {
            throw new Error("RGP calculator has not been initialized.");
        }

        // TODO: add some sanity checks for the returned value.
        return this.#data.getValidatorBreakevenRgp();
    }
}
