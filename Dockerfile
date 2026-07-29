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

# Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config if we want, or use default
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
