# **Regulus MVP**

Regulus is a modular and customizable Anti-Money Laundering (AML) monitoring system. Designed for financial systems and fintech platforms, it evaluates transactions, applies rules, monitors watchlists, and generates alerts for suspicious activity.

## **Features**

- **Transaction Monitoring**: Evaluate transactions based on predefined and custom rules.
- **Custom Rules**: Define dynamic conditions (e.g., `amount > 10000`).
- **Watchlist Matching**: Flag transactions involving high-risk entities or countries.
- **Alerts**: Automatically generate alerts for flagged transactions.
- **API Documentation**: Comprehensive Swagger integration at `/api-docs`.
- **Logging**: Structured request and response logging with `pino`.

## **Tech Stack** 

- **Backend**: Node.js (Express)
- **Database**: PostgreSQL
- **Logging**: Pino
- **API Documentation**: Swagger
- **Containerization**: Docker + Docker Compose

## **Getting Started**

### Clone the Repository

```bash
git clone <repository_url>
cd regulus
```

### Configure Environment Variables
Create a .env file in the root directory:

```
NODE_ENV=development
PORT=3000
DB_HOST=regulus-db
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=regulus
LOG_LEVEL=info
```

#### Start the Application
Run the app using Docker:

```bash
docker-compose up --build
```

## **API Endpoints**

Transactions

- GET ```/transactions```: Fetch all transactions.
- POST ```/transactions```: Create and evaluate a transaction.

Alerts

- GET ```/alerts```: Retrieve all alerts.
- DELETE ```/alerts/:id``` : Delete a specific alert.

Rules

- GET ```/rules```: Fetch all custom rules.
- POST ```/rules```: Add a new rule.
- PUT ```/rules/:id```: Update an existing rule.
- DELETE ```/rules/:id```: Remove a rule by ID.

Watchlist
- GET ```/watchlist```: Retrieve all watchlist entries.
- POST ```/watchlist```: Add a new watchlist entry.
- DELETE ```/watchlist/:id```: Remove a watchlist entry by ID.

Swagger Documentation
Interactive API documentation is available at:
```
http://localhost:3000/api-docs
```

### Project Structure
```
src/
├── controllers/       # Handles business logic for routes
├── middleware/        # Middleware for request logging
├── models/            # Database configuration and query helpers
├── routes/            # API route definitions
├── utils/             # Utility functions
├── swagger.js         # Swagger setup for API docs
├── app.js             # App entry and middleware setup
├── server.js          # Server configuration
```

### Development
Running Locally
To run the app locally without Docker:

1.Install dependencies:
```bash
npm install
```

2.Start the app:
```bash
npm start
```

Testing
1. Use Swagger to test all endpoints:
```
http://localhost:3000/api-docs
```
2. Check logs using Docker:
```
docker-compose logs regulus-aml
```
