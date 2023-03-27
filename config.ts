interface Config {
    SUI_RPC_URL: string;
    SUI_PRICE_USD: number;
    VALIDATOR_ADDRESS: string;
    VALIDATOR_COSTS_USD: number;
    COINGECKO_API_URL: string;
    COINGECKO_COIN_ID: string;
}

export default <Config> {
    SUI_RPC_URL: Deno.env.get("SUI_RPC_URL"),
    SUI_PRICE_USD: Number(Deno.env.get("SUI_PRICE_USD")),
    VALIDATOR_ADDRESS: Deno.env.get("VALIDATOR_ADDRESS"),
    VALIDATOR_COSTS_USD: Number(Deno.env.get("VALIDATOR_COSTS_USD")),
    COINGECKO_API_URL: Deno.env.get("COINGECKO_API_URL"),
    COINGECKO_COIN_ID: Deno.env.get("COINGECKO_COIN_ID"),
};
