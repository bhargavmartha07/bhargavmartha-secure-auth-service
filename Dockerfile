# -------------------------
# Stage 1: Builder
# -------------------------
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# -------------------------
# Stage 2: Runtime
# -------------------------
FROM node:20-slim
WORKDIR /app
ENV TZ=UTC

# Install cron + tzdata
RUN apt-get update && \
    apt-get install -y cron tzdata procps && \
    rm -rf /var/lib/apt/lists/* && \
    ln -snf /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone

# Copy built app from builder
COPY --from=builder /app /app

# Create required directories
RUN mkdir -p /cron /data && \
    touch /cron/output.log /cron/last_code.txt && \
    chmod 664 /cron/output.log /cron/last_code.txt

# -------------------------
# Copy cron job files
# -------------------------
COPY cron/simple-cron /etc/cron.d/simple-cron
COPY cron/2fa-cron /etc/cron.d/2fa-cron

# Correct permissions (cron requires this)
RUN chmod 0644 /etc/cron.d/simple-cron /etc/cron.d/2fa-cron

# DO NOT RUN crontab manually — cron.d loads automatically

EXPOSE 8080

# Start cron AND Node server
CMD ["sh", "-c", "cron && node server.js"]
