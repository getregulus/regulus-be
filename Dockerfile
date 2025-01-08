# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json, then install dependencies
COPY package*.json ./
RUN npm install

# Copy all files, including Prisma schema, into the container
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Install Prisma CLI globally for debugging (optional)
RUN npm install -g prisma

ENV PORT=3000
EXPOSE 3000 5555

# Start the application
CMD ["node", "src/server.js"]
