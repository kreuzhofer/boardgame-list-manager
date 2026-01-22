# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=http://localhost:3006
ARG VITE_EVENT_NAME=Brettspiel-Event

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_EVENT_NAME=${VITE_EVENT_NAME}

# Debug: print the API URL being used
RUN echo "Building with VITE_API_URL=${VITE_API_URL}"

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
