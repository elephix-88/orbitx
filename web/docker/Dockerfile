# Use Node.js base image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json and lock file first (better for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of your source code
COPY . .

# Expose Vite dev server port (default 5173)
EXPOSE 5173

# Run dev server
CMD ["npm", "run", "dev", "--", "--host"]