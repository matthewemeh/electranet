# Electranet (Backend)

#### By [Matthew Emeh](https://github.com/matthewemeh) @29th of September, 2025

<br>

## Certification

This is to certify that this project was carried out by [EMEH MATTHEW CHUKWUEMEKA](https://github.com/matthewemeh) with the matriculation number 180408011 in the department of Electrical and Electronics Engineering, Faculty of Engineering, University of Lagos under the supervision of Dr. (Mrs.) Khadeejah Adebisi Abdulsalam.

<br>

## Overview

Electranet is a distributed, microservices-based voting platform designed for secure, scalable, and transparent elections. The system is composed of several independent services, each responsible for a specific domain, all coordinated through a central API Gateway. Electranet supports authentication, voting, results collation, notifications, and more, with robust logging, rate limiting, and validation throughout.

## Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)

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
  - `*.env` files - Add these files as needed for secrets and environment-specific settings. Kindly make a request from owner - [Matthew Emeh](https://github.com/matthewemeh)

## Getting Started

### Prerequisites

- [**Node.js**](https://nodejs.org/) (version 22.16.0 or higher)
- [**npm**](https://www.npmjs.com/) or [**yarn**](https://yarnpkg.com/)
- [**Git**](https://git-scm.com/) (To clone the repository)
- [**MongoDB**](https://www.mongodb.com/) (local or cloud instance)
- [**Redis**](https://github.com/tporadowski/redis/releases) (for rate limiting, optional but recommended)

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
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request
