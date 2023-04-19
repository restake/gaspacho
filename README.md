# gaspacho

Gaspacho is a tool for automating Sui's reference gas price calculations.

**Disclaimer: this utility is in active development. The calculations have not been fully tested and may be subject to change/improve.**

## Features

- **Reference Gas Price Calculation**: a simple way for validator operators to determine their reference gas price (RGP).

- **Flexible Configuration**: the utility allows validator operators to configure various parameters, such as the monthly operating costs and Sui token price.

- **Ease of Integration**: Gaspacho is designed to be easily integratable into existing validator node ops processes.

## Getting Started

There's two ways to run Gaspacho - as a Docker container or directly from source.

### Docker

We have prebuilt Docker images available on [Docker Hub](https://hub.docker.com/repository/docker/restake/gaspacho/tags). Feel free to use them.

```sh
docker run --rm -ti --name gaspacho --env-file .env restake/gaspacho:latest
```
The supplied `.env` file can be found in the project root.

If you want to build the image yourself, run:

```sh
./docker/build_docker.sh
```

### From Source

Gaspacho can be run locally from source by setting up [Deno](https://deno.land) and [direnv](https://direnv.net) (great tool for managing your `env`). First, make a copy of `.env.sample` to `.env` and adjust the variables according to your needs:

```sh
cp .env.sample .env
```
Now, activate the `.envrc` in the project's root directory with:

```sh
direnv allow
```
Keep in mind that that you will need to re-activate the `env` every time you make changes to your `.envrc` files.

Finally, run the project with Deno:

```sh
deno run -A index.ts
```

## To-Do

- Sui price fetching from Coingecko (WIP)
- Automatic RGP submitting at epoch boundaries
- Slack notifications of submitted RGP
- Unit tests to validate calculations

And here's an image of a real Gazpacho (rendered with Stable Diffusion AI):

![gaspacho](https://i.imgur.com/pdEU35O.jpeg)
