import {
    Checkpoint,
    Connection,
    DelegatedStake,
    JsonRpcProvider,
    PaginatedEvents,
    SuiEventFilter,
    SuiSystemStateSummary,
} from "@mysten/sui.js";

export type ActiveValidator = SuiSystemStateSummary["activeValidators"][number];

export class SuiRpc {
    #connection: Connection;
    #provider: JsonRpcProvider;

    constructor(connection: Connection) {
        this.#connection = connection;
        this.#provider = new JsonRpcProvider(this.#connection);
    }

    /**
     * Get the latest SUI system state. This state is not always up to date.
     *
     * @returns Latest SUI system state.
     */
    getLatestSuiSystemState(): Promise<SuiSystemStateSummary> {
        return this.#provider.getLatestSuiSystemState();
    }

    /**
     * Get the current on-chain reference gas price.
     *
     * @returns Current reference gas price in MIST.
     */
    getReferenceGasPrice(): Promise<bigint> {
        return this.#provider.getReferenceGasPrice();
    }

    /**
     * Get the latest checkpoint sequence number.
     *
     * @returns Latest checkpoint sequence number.
     */
    getLatestCheckpointSequenceNumber(): Promise<string> {
        return this.#provider.getLatestCheckpointSequenceNumber();
    }

    /**
     * Get a checkpoint by its sequence number.
     *
     * @param id Sequence number of the checkpoint.
     * @returns
     */
    getCheckpoint(id: string): Promise<Checkpoint> {
        return this.#provider.getCheckpoint({ id });
    }

    /**
     * Get all stakes that have been delegated by the validator.
     *
     * @returns DelegatedStake objects.
     */
    getValidatorStakes(owner: string): Promise<DelegatedStake[]> {
        return this.#provider.getStakes({ owner });
    }

    /**
     * Query on-chain events.
     *
     * @param query
     * @returns Events that match the query.
     */
    queryEvents(query: SuiEventFilter): Promise<PaginatedEvents> {
        // TODO: add support for PaginationArguments and OrderArguments.
        return this.#provider.queryEvents({ query });
    }
}
