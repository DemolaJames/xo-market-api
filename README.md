 # XO Market API 

> **Decentralized prediction markets with real-time notifications**

## 🚀 Setup Instructions

Prerequisites

Node.js 18+
PostgreSQL 14+
(Optional) Ethereum Sepolia testnet access for blockchain features

### Installation
```bash
# Clone and install
npm install

# Setup environment
cp .env.example .env
# Edit with your secret variables

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development
npm run start:dev
```

### Viewing & Testing the API
```bash
# View Swagger API docs
open http://localhost:3000/api

# Connect to SSE stream
curl -N http://localhost:3000/notifications/stream

# Test authentication
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xUser1"}'
```

### Automated Tests

#### Run Tests:
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

#### Test Coverage:
- ✅ Market type validation (all 3 types)
- ✅ Market creation and approval flow
- ✅ Authentication and authorization
- ✅ Error handling and edge cases

#### Demo Scenarios

If you want to demo via swagger, you can follow the flow below

#### 1. **Market Creation Flow:**
```bash
# Login → Get market types → Create market → See live notification
```

#### 2. **Admin Approval:**
```bash  
# Admin login → Approve market → Blockchain deployment → Status updates
```

#### 3. **Real-time Notifications:**
```bash
# Connect SSE → Perform actions → See live updates
```

#### 4. **Validation Testing:**
```bash
# Test all market type rules (Low Risk, High Risk, Meme)
```


## 📚 Architecture & Things to note

#### Summary 
I focused on the core set of features around markets. You can create, approve, and list them easily. Market types are fully flexible and database-driven, so we can define custom validation rules without needing to re-deploy the application depending on the use case.

Authentication is handled with JWTs, tied to wallet-based logins, and I’ve added role support for admin access. Markets also gets created on the blockchain to the provided smart contract.

#### Technology choices & Architecture explanation

- **Prisma:** I chose Prisma over TypeORM mainly because of performance and stability. Prisma is just faster, especially with complex queries, thanks to its Rust-based engine.
- **Poject structure:** I tried to think long-term when setting this up. I kept things monolithic for now since microservices aren’t needed yet, but I broke features into separate modules so it’s easy to scale later. If we ever need to split things out into microservices, the structure is already halfway there. It’s clean, modular, and easy to reason about. 

#### Future Improvements 
- **Caching:** There are a few areas that could really benefit from caching
    - Fetching market types: since they're dynamic but stored in the DB and don’t change often, caching them would save some round trips. 
    - Other spots to look at could be user info or endpoints that return hot metrics or frequently accessed data. 
- **Centralized Logging & Monitoring**
- **Message queues**
- **Rate limiting endpoints**

## How the approval logic is structured

When designing how the approval logic will be implemented, the requirement for ensuring Approval logic is modular and flexibile got me thinking and here is how i approached it.  

 First thought was implementig a **strategy pattern** in the code that will enable market type  & their validatoin logic separated into classes that can be interchanged at runtime when approving a market but then it would require a deploment everytime a new change is about to be made. That constraint made me go with what i have implemented which is a runtime database changable validation logic. 
 
 Admin can now setup market type and their repective validation logic **via the API**. No redeploys. Just provide a title and the actual validation rules in a **JSON file**, like in the example below.

>*Check  **MarketTypesService**  to see implementation of seededTypes*
##### **Market Type System Json Template:**
```json
{
  "validationRules": {
        "minExpiryHours": 1,
        "minConvictionLevel": 0.01,
        "maxConvictionLevel": 1.0,
        "bannedWords": ['rug', 'scam', 'ponzi', 'exit'],
    }
}
```
**Note:**
- I didn’t build full Admin CRUD endpoints for adding Market Types and their validation logic, mainly due to time constraints—and because it’s pretty straightforward to do. The main focus was showing how that validation logic is actually used in the market approval process. Hence I **seeded** some market types in the flow.
- The validation logic (in JSON format) currently checks things like conviction level, expiry date, and banned words. It can easily be updated to support new rules or variables later.

**Other important things around approval**
- Single Approval: Markets can only be approved once
- Admin Only: Regular users cannot approve markets
- Points System: Creators earn +1 conviction point per approval thats updates on their profile
- Audit Trail: Approver and timestamp are recorded
- Real-time Updates: All subscribed stakeholders notified immediately


## How on-chain is handled

For the blockchain integration, I focused on showing how the app interacts with the blockchain. I used the provided contract ABI and made sure to handle both success and error cases properly.

One key thing I did was keep the blockchain module completely separate from the rest of the app. This way, it can scale or evolve on its own without affecting other parts of the system.

For production, we’ll definitely need to:
- Add enums for supported chains
- Expose an endpoint to list supported chains, that way the frontend/UI can pass the selected chain when users create markets

#### Flow:
```
Market Approved → DEPLOYING → Smart Contract Call → 
Transaction Confirmed → Parse Events → LIVE Status
```

**Other important things around on-chain handling**
- When a market is successfully created, I update its marketId in the database with the transaction hash from the blockchain.
- If the transaction fails, I still update the market record to reflect the failure.
- I also emit real-time events at each step to keep subscribed users updated.


## How real-time updates are implemented

For real-time interactivity, I used Server-Sent Events (SSE) to push live updates. For example, when a market is created, users get notified immediately, useful for both regular users and admins. There's also personalized notifications for things like approval updates, and blockchain deployment status gets streamed live too. I exposed two streams: one global stream for all events, and another that's user-specific.

I went with SSE instead of WebSocket because most of the updates flow from server to client (like market status, approvals, etc.) and SSE handles that well. It reconnects automatically if the connection drops, and it’s easier to scale without worrying about sticky sessions or WebSocket-specific load balancers.

####  Real-time Demo

##### SSE Connection:
```javascript
// Connect to real-time stream
const eventSource = new EventSource('http://localhost:3000/notifications/stream');

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('Live update:', notification);
};

// Notification types:
// - market_created: New market created
// - market_approved: Market approved by admin
// - market_deployed: Blockchain deployment success
// - market_failed: Blockchain deployment failed
```

#### Complete Flow Demo of Real time updates:
```bash
# Terminal 1: Connect to SSE
curl -N http://localhost:3000/notifications/stream

# Terminal 2: Create market
curl -X POST http://localhost:3000/markets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Demo Market",
    "description": "Testing real-time",
    "expiry": "2025-12-31T23:59:59Z",
    "convictionLevel": 0.8,
  }'

# See live notification in Terminal 1!
```
## Indexing on-chain events 
There are different providers that help with this at a cost, but before picking one, we need to first understand what data and metrics we really care about. That said, I’ve actually written document on building a custom scalable indexer for companies that want to fully own and control their data. You can check out the document below for more on that.

https://carpal-engineer-9d0.notion.site/Technical-Design-Custom-Indexer-For-Onchain-Data-DeFi-1c102f4cc39f80e1b794edbbc825626d 


