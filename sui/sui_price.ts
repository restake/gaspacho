import Config from "../config.ts";

interface CurrentPriceResponse {
    [key: string]: {
        usd: number;
    };
}

interface PingResponse {
    gecko_says: string;
}

export class SuiPrice {
    static #apiUrl: string = Config.COINGECKO_API_URL;
    static #coinId: string = Config.COINGECKO_COIN_ID;

    private static async getJson<T>(response: Response): Promise<T> {
        return await response.json() as T;
    }

    /**
     * Get current token price from the Coingecko API.
     *
     * @returns Current price response.
     */
    private static async getCurrentPriceResponse(): Promise<CurrentPriceResponse> {
        const query = new URLSearchParams({
            ids: this.#coinId,
            vs_currencies: "usd",
        });
        const response = await fetch(`${this.#apiUrl}/simple/price?${query.toString()}`, {
            method: "GET",
        });

        return this.getJson(response);
    }

    /**
     * Get ping response from the Coingecko API.
     *
     * @returns Ping response.
     */
    static async getPingResponse(): Promise<PingResponse> {
        const response = await fetch(`${this.#apiUrl}/ping`, {
            method: "GET",
        });

        return this.getJson(response);
    }

    /**
     * Get the current price of Sui token in USD.
     * Accessor for the internal #getCurrentPriceResponse method.
     *
     * @returns Token price in USD.
     */
    static async getCurrentPrice(): Promise<number> {
        const response = await this.getCurrentPriceResponse();

        return response[this.#coinId].usd;
    }
}
