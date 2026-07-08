# Use the lightweight official Node.js LTS image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the rest of the application files
COPY . .

# Expose port (Render uses $PORT env var, defaults to 10000)
EXPOSE 10000

# Set environment to production
ENV NODE_ENV=production

# Run the server
CMD ["node", "server.mjs"]
