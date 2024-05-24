**Title:** Fix Auth Token Ingestion from Redirect on Reactory PWA Client

**Type:** Bug

**Priority:** High

**Reporter:** Werner Weber

**Assignee:** [Assignee Name]

**Description:**

After authentication with a third-party provider, the Reactory PWA client does not reload properly when the server redirects back to the app. This issue prevents the client from correctly ingesting the authentication token provided in the redirect URL.

**Steps to Reproduce:**

1. Open the Reactory PWA client.
2. Initiate authentication with a third-party provider.
3. After successful authentication, observe the behavior when the server redirects back to the app.

**Expected Result:**

The client should correctly ingest the authentication token from the redirect URL and reload the app to reflect the authenticated state.

**Actual Result:**

The client does not reload properly after ingesting the authentication token from the redirect URL.

**Acceptance Criteria:**

1. The client correctly ingests the authentication token from the redirect URL.
2. The client reloads properly after ingesting the authentication token.
3. The client reflects the authenticated state after reload.

**Sub-Tasks:**

1. Investigate the cause of the improper reload after ingesting the authentication token.
2. Implement a fix to ensure the client reloads properly.
3. Test the fix to ensure the client correctly ingests the authentication token and reloads properly.

**Suggested Solutions:**

1. **Check the redirect handling logic:** The issue might be due to a problem in the logic that handles redirects after authentication.
2. **Check the token ingestion logic:** The issue might be due to a problem in the logic that ingests the authentication token from the redirect URL.

**Labels:** `PWA`, `Authentication`, `Redirect`, `Bug`

**Due Date:** [Due Date]

**Sources:**

**reactory-pwa-client/src/auth**: The directory containing the authentication logic in the Reactory PWA client. This code may need to be updated as part of this task.

**Comments:**