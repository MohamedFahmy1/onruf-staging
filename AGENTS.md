# Repository Instructions

## Application context

- The root `documents/` folder contains guidance for AI agents about complex parts of the application, including business rules, expected behavior, and implementation context.
- Before working on a feature, inspect `documents/` and read the relevant files alongside the existing code to understand the feature and its constraints.

## API contracts

- All APIs have Swagger documentation. Start at https://onruf.shop/swagger/index.html and select the relevant service's definitions and schemas.
- Before implementing, changing, or debugging API calls, consult Swagger to understand endpoint paths, HTTP methods, authentication and headers, parameters, request bodies, required fields, enums, response schemas, and error behavior. Read the relevant files in `documents/` for application-specific context as well.

## Commits and publishing

- When the user asks to create a commit, create the requested commit and then run `git shipall`. Treat the commit request as authorization to push, unless the user explicitly requests otherwise.
- Run `git shipall` from `master`. The current alias synchronizes and pushes both `master` and `production` to every configured remote.
- Verify that publishing succeeded on every remote and report any failures.
