# Regulus

A modular and customizable Anti-Money Laundering (AML) monitoring system. Designed for DeFi and TradFi platforms, Regulus evaluates transactions, applies rules, monitors watchlists, and generates alerts for suspicious activity.

## Features

- **Transaction Monitoring**: Evaluate transactions based on predefined and custom rules.
- **Custom Rules**: Define dynamic conditions with flexible operators.
- **Automated Alerts**: Generate and manage alerts for flagged transactions.
- **Multi-Organization**: Support for multiple organizations with isolated data.
- **User Management**: Role-based access control (admin, auditor, viewer).
- **Crawler Integration**: Automated rule discovery from regulatory sources.
- **Audit Logging**: Complete audit trail for all actions.
- **Notification Channels**: Email and Slack integrations.
- **API Documentation**: Comprehensive Swagger documentation.

## Tech Stack

- **Backend**: Node.js (Express)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Logging**: Pino
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
```bash
git clone <repository_url>
cd regulus
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/regulus

# JWT Authentication
JWT_SECRET=your-secret-key-here
API_KEY_SECRET=your-api-key-secret

# Email (optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@regulus.com

# Slack (optional - for notifications)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Orchestrator Integration (optional)
ORCHESTRATOR_URL=http://localhost:3001
ORCHESTRATOR_API_KEY=your-orchestrator-api-key
WEBHOOK_SECRET=shared-webhook-secret

# Logging
LOG_LEVEL=info
```

4. **Set up database**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with initial data (optional)
npm run seed
```

5. **Start the application**

**With Docker:**
```bash
docker-compose up --build
```

**Without Docker:**
```bash
npm start
```

The API will be available at `http://localhost:3000`


## API Documentation

Full API documentation is available at:
- **Live Documentation**: https://getregulus.co/docs/api-docs
- **Local Swagger UI**: http://localhost:3000/api-docs (when running locally)


## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm start

# View database in Prisma Studio
npx prisma studio

# Check logs
tail -f logs/app.log
```

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name description_of_change

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database schema
npx prisma studio
```

### Testing

Use Swagger UI for API testing:
```
http://localhost:3000/api-docs
```

### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f regulus-aml

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

For issues or questions, check the API documentation or review logs:
```bash
docker-compose logs regulus-aml
# or
tail -f logs/app.log
```