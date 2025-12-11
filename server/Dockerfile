# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY ./server/package.json ./package.json
COPY ./server/package-lock.json ./package-lock.json
RUN npm ci
COPY ./server/. .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY ./server/package.json .
#COPY ./server/.env .
# Copy required data/config directories
COPY --from=builder /app/src/personas ./src/personas
COPY --from=builder /app/src/prompts ./src/prompts
COPY --from=builder /app/src/scenarios ./src/scenarios
COPY --from=builder /app/src/util ./src/util
# Also copy scenarios to dist for runtime
COPY --from=builder /app/src/scenarios ./dist/scenarios
# Also copy util to dist for runtime (for moods.json and others)
COPY --from=builder /app/src/util ./dist/util
# Copy service-specific templates to dist folder to match compiled code paths
COPY --from=builder /app/src/services/conversation-evaluation.prompty ./dist/services/
# Make sure we copy any other prompty files that might be added in the future
# COPY --from=builder /app/src/services/*.prompty ./dist/services/
# Ensure data directory exists and is writable
RUN mkdir -p ./data && chmod 777 ./data
# Copy startup script
COPY ./server/startup.sh .
RUN chmod +x startup.sh
EXPOSE 5000
CMD ["./startup.sh"]
