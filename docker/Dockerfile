FROM denoland/deno:alpine-1.31.3

WORKDIR /app
ENV DENO_DIR=/app/cache

# Copy project files
COPY . .
RUN deno cache --lock=deno.lock index.ts

CMD ["deno", "run", "--allow-net", "--allow-ffi=/app/cache", "--allow-read=/app/cache,/etc", "--allow-env", "/app/index.ts"]
