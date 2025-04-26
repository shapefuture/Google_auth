# **App Name**: Gemini Gateway

## Core Features:

- User Authentication: Implement Google Sign-In for user authentication using OAuth 2.0, requesting the `https://www.googleapis.com/auth/generative-language` scope to allow users to grant permission for the application to access the Gemini API on their behalf. After successful authentication, securely store and manage the user's access token.
- Chat Interface: Provide a simple chat interface where users can input prompts and receive responses from the Gemini API. Display both the user's input and the model's output in a clear, conversational manner.
- Gemini Integration: Use the user's access token to make requests to the Gemini API. Include the `X-Goog-User-Project` header in each API request, setting its value to the user's Google Cloud Project ID (obtained during the OAuth flow) to ensure that API usage is billed to the user's account.
- Free Access Implementation: To provide free access to Gemini, implement either OAuth 2.0 with user-attributed billing or the Google Cloud Partner Program for prepaid credits, as detailed in the implementation plan. This includes handling project creation, entitlement management, and API enablement as needed.

## Style Guidelines:

- Primary color: White or light gray for a clean, modern look.
- Secondary color: Dark gray or black for text and important UI elements.
- Accent: Teal (#008080) to provide a calm and trustworthy feeling.
- Clean and simple layout with a focus on readability.
- Use clear and recognizable icons for common actions.
- Subtle animations for loading states and transitions to enhance the user experience.

## Original User Request:
create a simpel gemini chatbot that would use require authentication using google account to provide free access to gemini for end user using the following methods = [Implementing User-Funded Gemini Access: OAuth & Prepaid CreditsThis document provides detailed technical guidance for two core strategies to enable automated, user-funded Gemini API access: leveraging OAuth 2.0 for direct user billing and utilizing the Google Cloud Partner Program for managing prepaid credits via programmatic project creation.1. Implementing OAuth 2.0 with Strategic ScopesThis is the fundamental and most compliant method for ensuring API usage is billed directly to the user's Google Cloud project and counts against their quota.Mechanism: Use Google Sign-In (or OAuth 2.0 flow) to request permission from the user to call the Gemini API on their behalf.Required Scope: The critical scope is https://www.googleapis.com/auth/generative-language. This specific scope grants permission to access the Google Generative Language API, which includes Gemini.Prerequisites:Google Cloud Project: You need your own Google Cloud project to manage your application, OAuth Consent Screen, and API credentials.OAuth Consent Screen: Configure this in your Google Cloud project. You must:Choose the User Type (Internal or External).Fill in required app information (App name, User support email, Developer contact information).Add the https://www.googleapis.com/auth/generative-language scope. You may also need email and openid for basic user identification.Add authorized domains (for web applications).Add authorized redirect URIs (where Google sends the user back after authentication, along with the authorization code).OAuth Client ID: Create an OAuth 2.0 Client ID credential in your Google Cloud project. Choose the appropriate application type (Web application, Android, iOS, Desktop, etc.).Implementation Flow:Initiate OAuth Flow: When the user clicks "Sign in with Google" in your application, redirect them to Google's OAuth 2.0 authorization endpoint. The URL will include:client_id: Your OAuth 2.0 Client ID.redirect_uri: Your authorized redirect URI.scope: A space-delimited string including https://www.googleapis.com/auth/generative-language (e.g., email openid https://www.googleapis.com/auth/generative-language).response_type: code.access_type: offline (if you need a refresh token for long-term access without re-prompting the user).include_granted_scopes: true (useful for checking granted scopes later).state: A unique, non-guessable value to prevent CSRF attacks.User Consent: Google prompts the user with the consent screen, listing the permissions your app is requesting (including accessing Google AI). The user approves.Receive Authorization Code: Google redirects the user back to your redirect_uri with an authorization code and the state parameter. Verify that the received state matches the one you sent.Exchange Code for Tokens: Your backend server must exchange the authorization code for an access_token and optionally a refresh_token. This is a server-to-server POST request to Google's token endpoint (https://oauth2.googleapis.com/token).Include code, client_id, client_secret (your OAuth Client Secret, keep this secure on your server), redirect_uri, and grant_type=authorization_code.Obtain access_token: The response contains the access_token, its expiration time, and potentially a refresh_token. The access_token is the credential you will use to call the Gemini API on behalf of the user.Make Gemini API Calls (User-Attributed Billing): When your application needs to call the Gemini API for this user, use the obtained access_token.Include the access_token in the Authorization header as a Bearer token: Authorization: Bearer YOUR_ACCESS_TOKEN.Crucially, include the X-Goog-User-Project header in your API request. The value of this header must be the Google Cloud Project ID that you want to be billed for this request. This project must have billing enabled and the Generative Language API enabled.Example Python Code Snippet (Conceptual Backend):import requests
import json
# Assume you have functions to securely store/retrieve user tokens and project IDs

def call_gemini_for_user(user_google_id, user_input):
    # Retrieve the user's current access token and their associated GCP Project ID
    # from your database (ensure token is not expired, refresh if necessary)
    user_data = get_user_data(user_google_id)
    access_token = user_data['access_token']
    user_project_id = user_data['gcp_project_id'] # This ID comes from your onboarding flow (Step 2/5 in previous plan)

    if not access_token or not user_project_id:
        # Handle case where user hasn't completed GCP linking or token is invalid
        raise Exception("User not configured for direct billing.")

    api_endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-Goog-User-Project": user_project_id, # This directs billing and quota to the user's project
        "Content-Type": "application/json"
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": user_input}
                ]
            }
        ]
    }

    try:
        response = requests.post(api_endpoint, headers=headers, data=json.dumps(payload))
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"API call failed: {e}")
        # Handle errors, potentially including token expiration or user project issues
        return None

# Example usage (assuming you have the user's ID and input)
# user_id = "google-user-123"
# prompt = "Tell me a story about a space cat."
# gemini_response = call_gemini_for_user(user_id, prompt)
# print(gemini_response)
Key Takeaway: The X-Goog-User-Project header is the mechanism Google uses to attribute the API call (for billing and quota) to a specific project, even when authenticated with a user's credential (the OAuth token). The user's project must be set up correctly for this to work.4. Google Cloud Partner Program for Prepaid CreditsThis approach involves becoming a Google Cloud reseller to purchase credits and programmatically provision temporary projects for users, funded by these credits. This is significantly more complex and requires a business relationship with Google Cloud.Prerequisite: You must be accepted into the Google Cloud Partner Advantage program and specifically enabled as a reseller (using the Cloud Channel Program). This involves business agreements, potentially sales minimums, and technical onboarding with Google's Partner team.Technical Workflow (Requires Backend Implementation & Cloud Channel API):This workflow happens on your backend server, using a service account with appropriate permissions.User Sign-up/Onboarding Trigger: When a new user signs up via Google Sign-In (and you've determined they should receive prepaid credits, e.g., they are not an enterprise user using delegation), initiate this backend process.Programmatic Project Creation (Cloud Resource Manager API):Use a service account authenticated with credentials that have the roles/resourcemanager.projectCreator role (or a custom role with equivalent permissions) within the Google Cloud Organization or Folder where you want to create user projects.Make a POST request to the Cloud Resource Manager API endpoint for creating projects: https://cloudresourcemanager.googleapis.com/v1/projects.The request body should include a projectId (must be globally unique), name, and potentially parent (Folder or Organization ID).Example Python Snippet (Conceptual - requires google-api-python-client):from googleapiclient import discovery
from google.oauth2 import service_account

# Assume service_account_info contains your service account key JSON
# Ensure this service account has roles/resourcemanager.projectCreator
credentials = service_account.Credentials.from_service_account_info(service_account_info)
crm_service = discovery.build('cloudresourcemanager', 'v1', credentials=credentials)

def create_user_project(user_identifier, parent_folder_id=None):
    # Generate a unique project ID (e.g., based on user ID and timestamp)
    project_id = f"user-proj-{user_identifier}-{uuid.uuid4().hex[:8]}"
    project_name = f"Project for {user_identifier}"

    project_body = {
        'projectId': project_id,
        'name': project_name,
        # Optional: Specify a parent folder or organization
        # 'parent': {
        #     'type': 'folder', # or 'organization'
        #     # 'id': parent_folder_id
        # }
    }

    try:
        request = crm_service.projects().create(body=project_body)
        response = request.execute()
        print(f"Project creation initiated: {response}")
        # The response is an Operation. You'll need to poll it to know when the project is ready.
        return project_id, response
    except Exception as e:
        print(f"Error creating project: {e}")
        return None, None

# Example usage:
# new_project_id, operation = create_user_project("user123")
# print(f"Created project ID: {new_project_id}")
# You would then store new_project_id associated with user123
Create Customer and Entitlement (Cloud Channel API): This is the core reseller step.Use your reseller service account credentials (authenticated for the Cloud Channel API).Create a Customer: If this is a new user, you need to represent them as a "Customer" resource within your Cloud Channel reseller account using the Cloud Channel API. This customer resource will be linked to the GCP project you just created.Create an Entitlement: Create an "Entitlement" for this Customer for the Google Generative Language API service. An entitlement represents the customer's right to use a specific Google Cloud service through your reseller account. This is where the prepaid credits or specific billing arrangement you have with Google for this customer/service will be linked.Link Entitlement to Project: Associate the newly created GCP project with this Customer's Entitlement. This tells Google that usage on this specific project should be billed through your reseller account under this customer's entitlement.Note: The Cloud Channel API documentation is extensive and specific to resellers. The exact API calls and required parameters for creating customers, entitlements, and linking them to projects depend on your reseller agreement and how Google structures the prepaid credit offering within the Channel program. You will need to consult the specific Cloud Channel API documentation provided by Google to partners. This often involves endpoints like accounts.customers.create, accounts.customers.entitlements.create, and potentially methods for managing billing accounts and project links.Enable Generative Language API (Service Usage API):Once the project is created and linked to the reseller entitlement, you need to enable the Generative Language API within that specific user project.Use a service account with the roles/serviceusage.serviceUsageAdmin role (or equivalent) on the newly created user project. This might require adding the service account as a member to the user project with this role after creation.Make a POST request to the Service Usage API endpoint: https://serviceusage.googleapis.com/v1/projects/PROJECT_ID/services/generativelanguage.googleapis.com:enable. Replace PROJECT_ID with the ID of the user's new project.Example Python Snippet (Conceptual - requires google-api-python-client):from googleapiclient import discovery
from google.oauth2 import service_account

# Assume service_account_info contains your service account key JSON
# This service account needs serviceusage.services.enable permission on the target project
credentials = service_account.Credentials.from_service_account_info(service_account_info)
su_service = discovery.build('serviceusage', 'v1', credentials=credentials)

def enable_gemini_api(project_id):
    api_name = 'generativelanguage.googleapis.com'
    try:
        request = su_service.services().enable(
            name=f'projects/{project_id}/services/{api_name}'
        )
        response = request.execute()
        print(f"API enablement initiated for project {project_id}: {response}")
        # This is also an Operation, poll to confirm completion
        return response
    except Exception as e:
        print(f"Error enabling API for project {project_id}: {e}")
        return None

# Example usage (after project creation and potentially adding service account to project):
# if new_project_id:
#     # You might need a step here to grant the service account permission on the new project
#     enable_gemini_api(new_project_id)
Store User's Project ID: Store the project_id of the newly created project in your application's user database, linked to the user's Google identifier.Use the New Project for API Calls: When the user makes API requests, use their OAuth access_token (obtained in Step 1) and the stored user_project_id in the X-Goog-User-Project header, as shown in the OAuth implementation example above. Usage will now be billed through your reseller account via the entitlement linked to this project.Monitor Credit Exhaustion & Transition: You need a system to track usage against the prepaid credits allocated to this user/entitlement. This could involve:Monitoring billing data via the Cloud Billing API (though accessing user-specific billing data through your reseller account might require specific permissions/APIs).Tracking API calls made through your application for that user and estimating usage against the credit amount.Using Cloud Monitoring metrics for the user's project (if accessible and granular enough via your reseller account).When credits are nearing exhaustion, trigger the UI prompts guiding the user to enable their own billing on that project or link a different, user-owned, billing-enabled project.Complexity: The Cloud Channel API and the reseller workflow are significantly more complex than standard GCP API usage. This approach requires a dedicated engineering effort to integrate with the reseller-specific APIs and manage the lifecycle of customers, entitlements, and project links. It also requires ongoing management of your reseller relationship and credit pools with Google.Summary of Implementation Details:OAuth: Standard Google Sign-In flow requesting generative-language scope. Use the user's access_token and the X-Goog-User-Project header for API calls.Prepaid Credits: Requires Google Cloud Partner/Reseller status. Involves programmatic project creation (cloudresourcemanager.googleapis.com), creating/managing customers and entitlements (cloudchannel.googleapis.com), and enabling the API (serviceusage.googleapis.com). The Cloud Channel API is central and specific to resellers.This detailed breakdown should provide a clearer picture of the technical steps and APIs involved in both approaches. Remember that the Partner Program path has significant business and technical prerequisites beyond just API calls.]. save all this as implementation plan.md. then start implementing
  