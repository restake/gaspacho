interface Config {
    RPC_URL: string;
    VALIDATOR_ADDRESS: string;
    SUI_PRICE_USD: number;
    SERVER_COSTS_USD: number;
}

export default <Config> {
    RPC_URL: Deno.env.get("RPC_URL"),
    VALIDATOR_ADDRESS: Deno.env.get("VALIDATOR_ADDRESS"),
    SUI_PRICE_USD: Number(Deno.env.get("SUI_PRICE_USD")),
    SERVER_COSTS_USD: Number(Deno.env.get("SERVER_COSTS_USD")),
};
