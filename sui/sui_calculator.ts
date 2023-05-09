import { Checkpoint, EventId, SuiEvent, VALIDATORS_EVENTS_QUERY } from "@mysten/sui.js";
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
     * Get ValidatorEpochInfoEvents that were emitted by validators during epoch changes.
     *
     * @returns ValidatorEpochInfoEvents.
     */
    async getValidatorEpochInfoEvents(): Promise<SuiEvent[]> {
        // RPC default limit is 50 events per page, so we need to make multiple requests to get more.
        const limit = 100; // TODO: this should be actually suiLatestSystemState.activeValidators.length
        const order = "descending";

        let hasNextPage = true;
        let cursor: EventId | null | undefined;
        const events: SuiEvent[] = [];

        while (hasNextPage && events.length < limit) {
            const validatorEventsResponse = await this.#rpc.queryEvents({
                query: {
                    All: [
                        { MoveEventType: VALIDATORS_EVENTS_QUERY },
                        { MoveEventField: { path: "/validator_address", value: this.#validatorAddress } }
                    ]
                },
                cursor,
                limit,
                order,
            });

            cursor = validatorEventsResponse.nextCursor;
            hasNextPage = validatorEventsResponse.hasNextPage;
            events.push(...validatorEventsResponse.data);
        }

        return events;
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
