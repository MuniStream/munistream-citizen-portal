# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Copy .env.docker as .env for build with placeholders
COPY .env.docker .env

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install Node.js and js-yaml for theme loading
RUN apk add --no-cache nodejs npm && \
    npm install -g js-yaml

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy theme loading script and setup
COPY load-theme.sh /app/load-theme.sh
RUN chmod +x /app/load-theme.sh

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 80

# Use entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]