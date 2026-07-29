FROM node:20-alpine AS build

WORKDIR /app

# Copy package descriptors and lockfiles
COPY package.json package-lock.json ./

# Install dependencies (use legacy-peer-deps to ignore potential package conflicts)
RUN npm ci --legacy-peer-deps
 
# Copy rest of the frontend code
COPY . .

# Build output
RUN npm run build

# Serve with Nginx SSL gateway
FROM nginx:alpine

# Install openssl to generate self-signed keys
RUN apk add --no-cache openssl

# Create directories and generate self-signed SSL credentials
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/trafficiq.key \
    -out /etc/nginx/certs/trafficiq.crt \
    -subj "/C=US/ST=State/L=City/O=TrafficIQ/CN=localhost"

# Copy reverse proxy config
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
