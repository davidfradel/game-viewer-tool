# Candidate Takehome Exercise
This is a simple backend engineer take-home test to help assess candidate skills and practices.  We appreciate your interest in Voodoo and have created this exercise as a tool to learn more about how you practice your craft in a realistic environment.  This is a test of your coding ability, but more importantly it is also a test of your overall practices.

If you are a seasoned Node.js developer, the coding portion of this exercise should take no more than 1-2 hours to complete.  Depending on your level of familiarity with Node.js, Express, and Sequelize, it may not be possible to finish in 2 hours, but you should not spend more than 2 hours.  

We value your time, and you should too.  If you reach the 2 hour mark, save your progress and we can discuss what you were able to accomplish. 

The theory portions of this test are more open-ended.  It is up to you how much time you spend addressing these questions.  We recommend spending less than 1 hour.  


For the record, we are not testing to see how much free time you have, so there will be no extra credit for monumental time investments.  We are looking for concise, clear answers that demonstrate domain expertise.

# Project Overview
This project is a simple game database and consists of 2 components.  

The first component is a VueJS UI that communicates with an API and renders data in a simple browser-based UI.

The second component is an Express-based API server that queries and delivers data from an SQLite data source, using the Sequelize ORM.

This code is not necessarily representative of what you would find in a Voodoo production-ready codebase.  However, this type of stack is in regular use at Voodoo.

# Project Setup
You will need to have Node.js, NPM, and git installed locally.  You should not need anything else.

To get started, initialize a local git repo by going into the root of this project and running `git init`.  Then run `git add .` to add all of the relevant files.  Then `git commit` to complete the repo setup.  You will send us this repo as your final product.
  
Next, in a terminal, run `npm install` from the project root to initialize your dependencies.

Finally, to start the application, navigate to the project root in a terminal window and execute `npm start`

You should now be able to navigate to http://localhost:3000 and view the UI.

You should also be able to communicate with the API at http://localhost:3000/api/games

If you get an error like this when trying to build the project: `ERROR: Please install sqlite3 package manually` you should run `npm rebuild` from the project root.

# Practical Assignments
Pretend for a moment that you have been hired to work at Voodoo.  You have grabbed your first tickets to work on an internal game database application. 

#### FEATURE A: Add Search to Game Database
The main users of the Game Database have requested that we add a search feature that will allow them to search by name and/or by platform.  The front end team has already created UI for these features and all that remains is for the API to implement the expected interface.  The new UI can be seen at `/search.html`

The new UI sends 2 parameters via POST to a non-existent path on the API, `/api/games/search`

The parameters that are sent are `name` and `platform` and the expected behavior is to return results that match the platform and match or partially match the name string.  If no search has been specified, then the results should include everything (just like it does now).

Once the new API method is in place, we can move `search.html` to `index.html` and remove `search.html` from the repo.

#### FEATURE B: Populate your database with the top 100 apps
Add a populate button that calls a new route `/api/games/populate`. This route should populate your database with the top 100 games in the App Store and Google Play Store.
To do this, our data team have put in place 2 files at your disposal in an S3 bucket in JSON format:

- https://wizz-technical-test-dev.s3.eu-west-3.amazonaws.com/ios.top100.json
- https://wizz-technical-test-dev.s3.eu-west-3.amazonaws.com/android.top100.json

# Theory Assignments
You should complete these only after you have completed the practical assignments.

The business goal of the game database is to provide an internal service to get data for all apps from all app stores.  
Many other applications at Voodoo will use consume this API.

#### Question 1:
We are planning to put this project in production. According to you, what are the missing pieces to make this project production ready? 
Please elaborate an action plan.

#### Question 2:
Let's pretend our data team is now delivering new files every day into the S3 bucket, and our service needs to ingest those files
every day through the populate API. Could you describe a suitable solution to automate this? Feel free to propose architectural changes.


# Answers to Theory Assignments

## Question 1: Production Readiness

Moving this project to production requires addressing several critical areas. Here's my assessment and action plan:

### Security & Authentication
- **API Authentication**: Currently, the API is completely open. We need to implement authentication (JWT tokens or API keys) since this is an internal service consumed by other Voodoo applications.
- **Input Validation**: Add request validation middleware (e.g., `express-validator` or `joi`) to sanitize and validate all inputs, especially for the search and populate endpoints.
- **CORS Configuration**: Properly configure CORS to restrict access to known internal domains.
- **Rate Limiting**: Implement rate limiting to prevent abuse, especially on the populate endpoint which could be resource-intensive.

### Database & Performance
- **Database Migration**: SQLite won't scale for production. Migrate to PostgreSQL or MySQL with proper connection pooling.
- **Database Indexing**: Add indexes on frequently queried fields (`name`, `platform`, `storeId`, `platform+storeId` composite index for uniqueness checks).
- **Pagination**: The current `GET /api/games` endpoint returns all games. Add pagination (limit/offset or cursor-based) to handle large datasets efficiently.
- **Caching Layer**: Implement Redis caching for frequently accessed data (search results, game lookups) to reduce database load.

### Error Handling & Resilience
- **Structured Error Responses**: Standardize error response format across all endpoints with proper HTTP status codes.
- **Error Logging**: Integrate a proper logging service (e.g., Winston with external service like Datadog, Sentry) instead of console.log.
- **Retry Logic**: For the populate endpoint, implement retry logic with exponential backoff when fetching from S3.
- **Transaction Management**: Wrap the populate operation in a database transaction to ensure data consistency.

### Monitoring & Observability
- **Health Check Endpoint**: Add `/health` endpoint for load balancer and monitoring systems.
- **Metrics Collection**: Track key metrics (request latency, error rates, database query performance) using tools like Prometheus or CloudWatch.
- **Distributed Tracing**: For a service consumed by multiple applications, consider adding request tracing to debug issues across services.

### Testing
- **Unit Tests**: Add unit tests for business logic (data mapping, validation functions).
- **Integration Tests**: Test API endpoints with a test database.
- **Load Testing**: Validate performance under expected load, especially for the search endpoint.

### Configuration & Environment
- **Environment Variables**: Move all configuration (database URLs, S3 URLs, API keys) to environment variables using `dotenv` or similar.
- **Configuration Validation**: Validate required environment variables at startup.
- **Multiple Environments**: Support dev/staging/production configurations.

### Code Quality & Maintainability
- **API Documentation**: Generate OpenAPI/Swagger documentation for the API.
- **Code Structure**: Refactor into a proper MVC structure (routes, controllers, services, models) instead of having everything in `index.js`.
- **Type Safety**: Consider migrating to TypeScript for better type safety and developer experience.

### Scalability Considerations
- **Horizontal Scaling**: Ensure the application is stateless to support multiple instances behind a load balancer.
- **Database Connection Pooling**: Configure Sequelize connection pool appropriately for expected load.
- **Async Job Processing**: For the populate operation, consider moving it to a background job queue (Bull, AWS SQS) to avoid long-running HTTP requests.

## Question 2: Automating Daily Ingestion

For daily ingestion of S3 files, I'd recommend an event-driven architecture that's both reliable and scalable.

### Recommended Solution: Event-Driven with S3 Notifications

**Architecture:**
1. **S3 Event Notifications**: Configure S3 bucket to send events (ObjectCreated) to an SQS queue or SNS topic when new files are uploaded.
2. **Message Queue**: Use AWS SQS to decouple the ingestion process. This provides built-in retry mechanisms and dead-letter queues for failed messages.
3. **Worker Service**: A separate worker service (or Lambda function) consumes messages from SQS and triggers the populate operation.
4. **Idempotency**: Ensure the populate endpoint is idempotent (which it currently is with `findOrCreate`) to handle duplicate events safely.

**Benefits:**
- Real-time processing (no polling delays)
- Automatic retries via SQS
- Scales automatically with message volume
- Decouples ingestion from the main API service

**Implementation Details:**
- The worker calls the populate endpoint or directly invokes the populate logic
- Add message deduplication to handle S3's eventual consistency (same file might trigger multiple events)
- Store processing state (last processed file, timestamp) to handle edge cases

### Additional Considerations

**Error Handling & Monitoring:**
- Send alerts (email, Slack, PagerDuty) when ingestion fails
- Log all ingestion attempts with detailed metrics (records processed, duration, errors)
- Implement exponential backoff for transient failures

**Data Quality:**
- Validate file format before processing
- Handle schema changes gracefully (version the data mapping logic)
- Track data quality metrics (missing fields, invalid data)

**Performance Optimization:**
- For large files, consider streaming processing instead of loading everything into memory
- Use batch inserts with `bulkCreate` (with `ignoreDuplicates: true` or unique constraints) instead of `findOrCreate` in a loop for better performance
- Process iOS and Android files in parallel (already done, but ensure this scales)

**Architectural Enhancement:**
- Consider extracting the populate logic into a separate microservice if ingestion becomes complex or needs different scaling characteristics
- Use a job queue system (AWS SQS with workers) if you need more control over retries, priorities, and job scheduling
