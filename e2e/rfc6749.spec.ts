/**
 * The OAuth 2.0 Authorization Framework
 * https://www.ietf.org/rfc/rfc6749.txt
 */

import { test, expect } from '@playwright/test'

test.describe('3.  Protocol Endpoints', () => {
  /**
   The authorization process utilizes two authorization server endpoints
   (HTTP resources):

   o  Authorization endpoint - used by the client to obtain
      authorization from the resource owner via user-agent redirection.

   o  Token endpoint - used by the client to exchange an authorization
      grant for an access token, typically with client authentication.

   As well as one client endpoint:

   o  Redirection endpoint - used by the authorization server to return
      responses containing authorization credentials to the client via
      the resource owner user-agent.

   Not every authorization grant type utilizes both endpoints.
   Extension grant types MAY define additional endpoints as needed.
   */
  test.describe('3.1.  Authorization Endpoint', () => {
    const endpoint = '/authorization'
    /**
   The authorization endpoint is used to interact with the resource
   owner and obtain an authorization grant.  The authorization server
   MUST first verify the identity of the resource owner.  The way in
   which the authorization server authenticates the resource owner
   (e.g., username and password login, session cookies) is beyond the
   scope of this specification.

   The means through which the client obtains the location of the
   authorization endpoint are beyond the scope of this specification,
   but the location is typically provided in the service documentation.

   The endpoint URI MAY include an "application/x-www-form-urlencoded"
   formatted (per Appendix B) query component ([RFC3986] Section 3.4),
   which MUST be retained when adding additional query parameters.  The
   endpoint URI MUST NOT include a fragment component.

   Since requests to the authorization endpoint result in user
   authentication and the transmission of clear-text credentials (in the
   HTTP response), the authorization server MUST require the use of TLS
   as described in Section 1.6 when sending requests to the
   authorization endpoint.

   The authorization server MUST support the use of the HTTP "GET"
   method [RFC2616] for the authorization endpoint and MAY support the
   use of the "POST" method as well.

   Parameters sent without a value MUST be treated as if they were
   omitted from the request.  The authorization server MUST ignore
   unrecognized request parameters.  Request and response parameters
   MUST NOT be included more than once.
     */

    test('MUST support the use of the HTTP "GET" method', async ({ request }) => {
      const res = await request.get(endpoint)
      expect(res.status()).not.toBe(404)
    })
    test('MAY support the use of the "POST" method', async ({ request }) => {
      const res = await request.post(endpoint)
      expect(res.status()).not.toBe(404)
    })
  })
})
