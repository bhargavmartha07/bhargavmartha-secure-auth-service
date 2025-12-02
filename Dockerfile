# -------------------------
# Stage 1: Builder
# -------------------------
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files for caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# -------------------------
# Stage 2: Runtime
# -------------------------
FROM node:20-slim
WORKDIR /app
ENV TZ=UTC

# Install cron and timezone data
RUN apt-get update && \
    apt-get install -y cron tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    ln -snf /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone

# Copy node modules and source code from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Ensure log file exists
RUN mkdir -p /cron && touch /cron/output.log && chmod 664 /cron/output.log

# Copy cron job
COPY cron/simple-cron /etc/cron.d/simple-cron
RUN chmod 0644 /etc/cron.d/simple-cron

# Register cron job
RUN crontab /etc/cron.d/simple-cron

# Copy 2FA cron job
COPY cron/2fa-cron /etc/cron.d/2fa-cron
RUN chmod 0644 /etc/cron.d/2fa-cron
RUN crontab /etc/cron.d/2fa-cron


# Expose port
EXPOSE 8080

# Start cron + server
CMD ["sh", "-c", "cron && node server.js"]
