# Electranet

#### By [Matthew Emeh](https://github.com/matthewemeh) @5th of June, 2025

<br>

## Overview

Electranet is a distributed, microservices-based voting platform designed for secure, scalable, and transparent elections. The system is composed of several independent services, each responsible for a specific domain, all coordinated through a central API Gateway. Electranet supports authentication, voting, results collation, notifications, and more, with robust logging, rate limiting, and validation throughout.

## Architecture

- **API Gateway**: Central entry point for all client requests. Handles routing, authentication, rate limiting, and request validation.
- **Microservices**:
  - **Election Service**: Manages elections, parties, and contestants.
  - **Vote Service**: Handles vote casting and validation.
  - **Results Service**: Aggregates and provides election results.
  - **Identity Service**: Manages user registration, authentication, and identity verification.
  - **Notification Service**: Sends notifications to users (email, SMS, etc.) and monitors platform activities through logs.
  - **Face ID Service**: Provides biometric verification for enhanced security.
- **Database**: MongoDB for persistent storage across services.
- **Authentication**: JWT-based authentication using `jsonwebtoken`.

## Features

- Centralized routing and authentication
- Modular microservices for scalability and maintainability
- Request validation, transformation, and logging
- Rate limiting (with Redis support)
- Biometric (Face ID) and multi-factor authentication
- Real-time notifications
- API documentation via Swagger

## Project Structure

- `api-gateway/` – Central API Gateway (Express.js)
- `election-service/` – Election, party, and contestant management
- `vote-service/` – Voting logic and validation
- `results-service/` – Results collation and reporting
- `identity-service/` – User management and authentication
- `notification-service/` – User notifications and logs
- `face-id-service/` – Biometric authentication
- Each service contains:
  - `src/` – Source code
  - `config/` – Configuration files
  - `controllers/` – Request handlers
  - `middlewares/` – Express middleware
  - `models/` – Data models
  - `routes/` – API route definitions
  - `utils/` – Utility functions

## Getting Started

### Prerequisites

- **Node.js** (version 22.16.0 or higher)
- **npm** or **yarn**
- **Git** (To clone the repository)
- **MongoDB** (local or cloud instance)
- **Redis** (for rate limiting, optional but recommended)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/matthewemeh/electranet.git
   # or
   git clone git@github.com:matthewemeh/electranet.git
   ```
2. Install dependencies for each service (example for API Gateway):
   ```bash
   cd api-gateway && npm install
   ```
   Repeat for each service as needed.
3. Start each service:
   ```bash
   npm start
   ```
   The API Gateway will start on the configured port (default: `3000`).

## API Endpoints

- All endpoints are routed through the API Gateway.
- Each microservice exposes its own set of RESTful endpoints (see Swagger docs for details).
- API Documentation: [Electranet API Swagger Documentation](https://electranet-f0ls.onrender.com/api-docs)

## Contributing

1. Fork the repository
2. Create a new branch
3. Submit a pull request
