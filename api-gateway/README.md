# Electranet API Gateway

#### By [Matthew Emeh](https://github.com/matthewemeh) @5th of June, 2025

<br>

## Overview

This project serves as the central API Gateway for the voting platform - Electranet. It routes, authenticates, and manages requests between clients and backend services.

## Architecture

- **Frameworks**: Express, Node.js
- **Database**: MongoDB
- **Authentication**: JWT-based authentication using `jsonwebtoken`

## Features

- Centralized routing for microservices
- Authentication and authorization
- Request validation and transformation
- Rate limiting and logging

## Getting Started

### Prerequisites

- **Node.js** (version 22.16.0 or higher)
- **npm** or **yarn**
- **Git** (To clone the repository)

### Setup

1. Clone the repository: <br> For https ::

   ```bash
    git clone https://github.com/matthewemeh/electranet.git
   ```

   For ssh ::

   ```bash
    git clone git@github.com:matthewemeh/electranet.git
   ```

2. Install dependencies:

   ```bash
   cd api-gateway && npm install
   ```

3. Start the server
   ```bash
   npm start
   ```
   The gateway will start on the configured port (default: `3000`).

## Project Structure

- `src/` – Source code
- `src/config/` – Configuration files for CORS and rate limiting (using Redis as the Store)
- `src/middlewares/` - Custom middleware functions for authentication, logging, and request validation
- `src/utils/` - Utility functions for initiating logger

## Contributing

1. Fork the repository
2. Create a new branch
3. Submit a pull request

## API Endpoints

API Documentation @ [Electranet API Swagger Documentation](https://electranet-f0ls.onrender.com/api-docs)

## License

This project is licensed under the MIT License.
