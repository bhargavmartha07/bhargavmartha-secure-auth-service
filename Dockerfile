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

RUN apt-get update && \
    apt-get install -y cron tzdata && \
    rm -rf /var/lib/apt/lists/* && \
    ln -snf /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone

COPY --from=builder /app /app

# Create required folders
RUN mkdir -p /cron && mkdir -p /data

# Ensure log file exists
RUN touch /cron/output.log && chmod 664 /cron/output.log
RUN touch /cron/last_code.txt && chmod 664 /cron/last_code.txt

# Copy cron jobs (IMPORTANT)
COPY cron/simple-cron /etc/cron.d/simple-cron
COPY cron/2fa-cron /etc/cron.d/2fa-cron

# Correct permissions
RUN chmod 0644 /etc/cron.d/simple-cron
RUN chmod 0644 /etc/cron.d/2fa-cron

# Register both cron jobs
RUN crontab /etc/cron.d/simple-cron
RUN crontab /etc/cron.d/2fa-cron

EXPOSE 8080

CMD ["sh", "-c", "cron && node server.js"]
