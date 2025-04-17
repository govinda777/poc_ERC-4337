FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Compile contracts
RUN npm run compile

# Expose port for local hardhat node
EXPOSE 8545

# Default command to run the application
CMD ["npm", "run", "start:complete"] 