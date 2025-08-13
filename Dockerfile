# Use official Node.js 18 LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies (production mode)
RUN npm install --legacy-peer-deps --only=production

# Copy the rest of the source code
COPY . .

# Expose API port (change if needed)
EXPOSE 3000

# Start the Node.js API
CMD ["node", "server.js"]