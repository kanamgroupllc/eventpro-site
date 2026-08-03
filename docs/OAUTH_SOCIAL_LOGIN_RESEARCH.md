# OAuth Social Login Implementation Research

## Current State Analysis

### Authentication Flow (Current)
1. **Email/Password Sign Up**: Users register with email, password, firstName, lastName, phoneNumber
2. **Cognito Integration**: AWS Cognito User Pool handles authentication
3. **User Sync**: After Cognito signup, user is synced to PostgreSQL database
4. **OAuth Configuration**: OAuth flows (code, implicit) are configured but only `COGNITO` identity provider is enabled

### Current Architecture

#### Frontend
- **Location**: `frontend/src/services/authService.ts`
- **Current Methods**: `signUp()`, `signIn()`, `signOut()`, `getCurrentUser()`
- **No OAuth Callback Handler**: No route/component to handle OAuth redirects
- **Sign Up Page**: `frontend/src/pages/SignUp.tsx` - Only email/password form

#### Backend
- **User Entity**: `backend/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/entity/UserEntity.java`
  - Fields: `email`, `phoneNumber`, `firstName`, `lastName`, `cognitoUserId`
  - **Missing**: `authType` field
- **User Service**: `backend/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/service/impl/UserServiceImpl.java`
  - `createUserFromCognito()` method creates users but doesn't track auth type
- **Database Schema**: `backend/modules/eventpro-api/src/main/resources/db/migration/V1__create_base_tables.sql`
  - Users table doesn't have `auth_type` column

#### Infrastructure
- **Cognito Module**: `infrastructure/modules/cognito/main.tf`
  - OAuth flows configured: `["code", "implicit"]`
  - OAuth scopes: `["email", "openid", "profile"]`
  - **Current Identity Providers**: Only `["COGNITO"]`
  - **Missing**: Google and GitHub identity provider configurations

## Required Changes

### 1. Database Changes

#### Migration File
**File**: `backend/modules/eventpro-api/src/main/resources/db/migration/V2__add_auth_type_to_users.sql`

```sql
-- Add auth_type column to users table
ALTER TABLE users ADD COLUMN auth_type VARCHAR(50) NOT NULL DEFAULT 'EMAIL';

-- Create enum type for auth types (optional, or use VARCHAR)
-- CREATE TYPE auth_type AS ENUM ('EMAIL', 'GOOGLE', 'GITHUB', 'FACEBOOK');

-- Add index for auth_type if needed for queries
CREATE INDEX idx_user_auth_type ON users(auth_type);

-- Update existing users to have EMAIL auth type (already set by DEFAULT)
-- This is handled by the DEFAULT value above
```

**Note**: Using VARCHAR instead of ENUM for flexibility to add more providers later without migration complexity.

### 2. Backend Changes

#### 2.1 User Entity
**File**: `backend/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/entity/UserEntity.java`

**Add**:
```java
@Column(name = "auth_type", nullable = false, length = 50)
private String authType;
```

**Update constructor and getters/setters** (Lombok handles this automatically)

#### 2.2 AuthType Enum (Optional but Recommended)
**New File**: `backend/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/model/AuthType.java`

```java
package com.accessplus.eventpro.core.user.model;

public enum AuthType {
    EMAIL("EMAIL"),
    GOOGLE("GOOGLE"),
    GITHUB("GITHUB"),
    FACEBOOK("FACEBOOK");
    
    private final String value;
    
    AuthType(String value) {
        this.value = value;
    }
    
    public String getValue() {
        return value;
    }
    
    public static AuthType fromString(String value) {
        for (AuthType type : AuthType.values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown auth type: " + value);
    }
}
```

#### 2.3 User Service Updates
**File**: `backend/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/service/UserService.java`

**Add method**:
```java
UserEntity createUserFromCognito(String cognitoUserId, String email, String firstName, 
                                 String lastName, String phoneNumber, String authType);
```

**File**: `backend/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/service/impl/UserServiceImpl.java`

**Update `createUserFromCognito()` method**:
```java
@Override
public UserEntity createUserFromCognito(String cognitoUserId, String email, String firstName, 
                                       String lastName, String phoneNumber, String authType) {
    // ... existing validation ...
    
    UserEntity user = new UserEntity();
    user.setCognitoUserId(cognitoUserId);
    user.setEmail(email);
    user.setFirstName(firstName);
    user.setLastName(lastName);
    user.setPhoneNumber(phoneNumber);
    user.setAuthType(authType != null ? authType : "EMAIL"); // Default to EMAIL
    
    // ... rest of method ...
}
```

**Add overloaded method for backward compatibility**:
```java
@Override
public UserEntity createUserFromCognito(String cognitoUserId, String email, String firstName, 
                                       String lastName, String phoneNumber) {
    return createUserFromCognito(cognitoUserId, email, firstName, lastName, phoneNumber, "EMAIL");
}
```

#### 2.4 User Controller Updates
**File**: `backend/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/UserController.java`

**Update sync endpoint** to extract auth type from Cognito token:
- Check JWT token claims for `identities` array
- Extract `providerType` or `providerName` from identity provider info
- Map to auth type (e.g., "Google" -> "GOOGLE", "GitHub" -> "GITHUB")

**Example logic**:
```java
private String extractAuthTypeFromToken(Jwt token) {
    // Check if user has identities (OAuth users)
    Object identities = token.getClaim("identities");
    if (identities instanceof List) {
        List<?> identityList = (List<?>) identities;
        if (!identityList.isEmpty() && identityList.get(0) instanceof Map) {
            Map<?, ?> identity = (Map<?, ?>) identityList.get(0);
            String providerType = (String) identity.get("providerType");
            if ("Google".equals(providerType)) {
                return "GOOGLE";
            } else if ("GitHub".equals(providerType)) {
                return "GITHUB";
            }
        }
    }
    // Default to EMAIL for Cognito native users
    return "EMAIL";
}
```

#### 2.5 DTO Updates
**File**: `backend/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/UserResponse.java`

**Add field**:
```java
private String authType;
```

### 3. Infrastructure Changes

#### 3.1 Cognito Identity Providers
**File**: `infrastructure/modules/cognito/main.tf`

**Add identity provider resources**:
```hcl
# Google Identity Provider
resource "aws_cognito_identity_provider" "google" {
  count = var.enable_google_provider ? 1 : 0
  
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    authorize_scopes = "openid email profile"
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
  }

  attribute_mapping = {
    email      = "email"
    given_name = "given_name"
    family_name = "family_name"
    username   = "sub"
  }
}

# GitHub Identity Provider
resource "aws_cognito_identity_provider" "github" {
  count = var.enable_github_provider ? 1 : 0
  
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "GitHub"
  provider_type = "GitHub"

  provider_details = {
    authorize_scopes = "user:email"
    client_id        = var.github_client_id
    client_secret    = var.github_client_secret
  }

  attribute_mapping = {
    email      = "email"
    username   = "login"
    given_name = "name"
    family_name = "name"  # GitHub doesn't provide separate first/last name
  }
}
```

**Update User Pool Client**:
```hcl
resource "aws_cognito_user_pool_client" "main" {
  # ... existing configuration ...
  
  # Update supported identity providers
  supported_identity_providers = concat(
    ["COGNITO"],
    var.enable_google_provider ? ["Google"] : [],
    var.enable_github_provider ? ["GitHub"] : []
  )
}
```

#### 3.2 Cognito Module Variables
**File**: `infrastructure/modules/cognito/variables.tf`

**Add variables**:
```hcl
variable "enable_google_provider" {
  description = "Enable Google as an identity provider"
  type        = bool
  default     = false
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "enable_github_provider" {
  description = "Enable GitHub as an identity provider"
  type        = bool
  default     = false
}

variable "github_client_id" {
  description = "GitHub OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "github_client_secret" {
  description = "GitHub OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}
```

#### 3.3 Environment Configuration
**File**: `infrastructure/environments/dev/main.tf`

**Update Cognito module call**:
```hcl
module "cognito" {
  # ... existing configuration ...
  
  enable_google_provider = true
  google_client_id       = var.google_oauth_client_id
  google_client_secret   = var.google_oauth_client_secret
  
  enable_github_provider = true
  github_client_id       = var.github_oauth_client_id
  github_client_secret   = var.github_oauth_client_secret
}
```

**File**: `infrastructure/environments/dev/variables.tf`

**Add variables**:
```hcl
variable "google_oauth_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "github_oauth_client_id" {
  description = "GitHub OAuth client ID"
  type        = string
  sensitive   = true
}

variable "github_oauth_client_secret" {
  description = "GitHub OAuth client secret"
  type        = string
  sensitive   = true
}
```

### 4. Frontend Changes

#### 4.1 OAuth Callback Handler
**New File**: `frontend/src/pages/AuthCallback.tsx`

```typescript
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/store/hooks';
import { signInAsync } from '@/store/slices/authSlice';
import { authService } from '@/services/authService';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login', { state: { error: 'Authentication failed' } });
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        navigate('/login', { state: { error: 'No authorization code received' } });
        return;
      }

      try {
        // Exchange authorization code for tokens
        // Note: This might need to be handled by Cognito Hosted UI or backend
        // For Cognito Hosted UI, the redirect includes tokens in the URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        const accessToken = params.get('access_token');
        const idToken = params.get('id_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && idToken) {
          // Store tokens
          authService.storeTokens({
            accessToken,
            idToken,
            refreshToken: refreshToken || '',
          });

          // Fetch user info and sync to backend
          await dispatch(fetchCurrentUser()).unwrap();
          
          // Sync user to database
          await syncUserFromCognito();
          
          navigate('/', { state: { message: 'Signed in successfully!' } });
        } else {
          throw new Error('Tokens not found in callback');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login', { state: { error: 'Failed to complete authentication' } });
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, dispatch]);

  return <div>Completing authentication...</div>;
}

export default AuthCallback;
```

#### 4.2 Auth Service Updates
**File**: `frontend/src/services/authService.ts`

**Add OAuth methods**:
```typescript
/**
 * Initiates OAuth sign-in with a social provider.
 * 
 * @param provider The identity provider name (e.g., 'Google', 'GitHub')
 * @returns Promise that resolves when redirect is initiated
 */
const signInWithOAuth = async (provider: string): Promise<void> => {
  const pool = getUserPool();
  const clientId = pool.getClientId();
  const userPoolId = pool.getUserPoolId();
  
  // Get the Cognito domain from environment or construct it
  const domain = import.meta.env.VITE_COGNITO_DOMAIN || 
                 `${userPoolId}.auth.${import.meta.env.VITE_AWS_REGION || 'us-east-1'}.amazoncognito.com`;
  
  // Construct OAuth URL
  const redirectUri = encodeURIComponent(
    `${window.location.origin}/auth/callback`
  );
  
  const scopes = encodeURIComponent('openid email profile');
  const responseType = 'code';
  
  const oauthUrl = `https://${domain}/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `response_type=${responseType}&` +
    `scope=${scopes}&` +
    `redirect_uri=${redirectUri}&` +
    `identity_provider=${provider}`;
  
  // Redirect to OAuth provider
  window.location.href = oauthUrl;
};

// Export in authService object
export const authService = {
  // ... existing methods ...
  signInWithOAuth: signInWithOAuth,
};
```

#### 4.3 Sign Up Page Updates
**File**: `frontend/src/pages/SignUp.tsx`

**Add social login buttons**:
```typescript
import { Button } from '@/components/ui/button';

// Add to JSX before email form
<div className="space-y-4">
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-2 text-muted-foreground">
        Or continue with
      </span>
    </div>
  </div>
  
  <div className="grid grid-cols-2 gap-4">
    <Button
      type="button"
      variant="outline"
      onClick={() => authService.signInWithOAuth('Google')}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* Google icon SVG */}
      </svg>
      Google
    </Button>
    
    <Button
      type="button"
      variant="outline"
      onClick={() => authService.signInWithOAuth('GitHub')}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        {/* GitHub icon SVG */}
      </svg>
      GitHub
    </Button>
  </div>
</div>
```

#### 4.4 Login Page Updates
**File**: `frontend/src/pages/Login.tsx`

**Add same social login buttons** (similar to Sign Up page)

#### 4.5 Routing Updates
**File**: `frontend/src/App.tsx` or routing configuration

**Add route**:
```typescript
<Route path="/auth/callback" element={<AuthCallback />} />
```

### 5. Environment Variables

#### Frontend
**File**: `.env.example` or environment configuration

```env
VITE_COGNITO_DOMAIN=your-cognito-domain.auth.us-east-1.amazoncognito.com
VITE_AWS_REGION=us-east-1
```

#### Backend
No new environment variables needed (uses existing Cognito configuration)

### 6. OAuth Provider Setup Requirements

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-cognito-domain.auth.region.amazoncognito.com/oauth2/idpresponse`
6. Copy Client ID and Client Secret

#### GitHub OAuth Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL:
   - `https://your-cognito-domain.auth.region.amazoncognito.com/oauth2/idpresponse`
4. Copy Client ID and Client Secret

## Implementation Order

1. **Database Migration** (Backend)
   - Create migration file
   - Test migration

2. **Backend Entity & Service Updates**
   - Add `authType` field to `UserEntity`
   - Update `UserService` methods
   - Update `UserController` to extract auth type from tokens
   - Update DTOs

3. **Infrastructure Updates**
   - Add identity provider resources to Cognito module
   - Update module variables
   - Update environment configurations
   - Apply Terraform changes

4. **Frontend OAuth Implementation**
   - Create OAuth callback handler
   - Add OAuth methods to auth service
   - Add social login buttons to Sign Up and Login pages
   - Add routing for callback

5. **Testing**
   - Test email signup (should still work, authType = "EMAIL")
   - Test Google OAuth flow
   - Test GitHub OAuth flow
   - Verify authType is correctly stored in database

## Important Considerations

### 1. User Linking
- If a user signs up with email, then later signs in with Google using the same email, Cognito will create a separate user
- Consider implementing account linking logic if you want to allow users to link multiple auth methods

### 2. Phone Number for OAuth Users
- OAuth providers may not provide phone numbers
- Make `phoneNumber` optional in user creation for OAuth users

### 3. Name Handling
- GitHub doesn't provide separate first/last name
- May need to split full name or use full name for both fields

### 4. Email Verification
- OAuth providers already verify emails
- OAuth users should be auto-verified in Cognito

### 5. Password Management
- OAuth users don't have passwords
- Ensure password reset flows only work for EMAIL auth type users

### 6. Token Claims
- OAuth users will have different token claims structure
- The `identities` array in the JWT token contains provider information
- Extract auth type from token claims during user sync

## Testing Checklist

- [ ] Email signup still works (authType = "EMAIL")
- [ ] Google OAuth signup works (authType = "GOOGLE")
- [ ] GitHub OAuth signup works (authType = "GITHUB")
- [ ] OAuth users are synced to database correctly
- [ ] AuthType is stored correctly in database
- [ ] User can sign in with OAuth after initial signup
- [ ] OAuth callback handler works correctly
- [ ] Error handling for OAuth failures
- [ ] Token refresh works for OAuth users
- [ ] User profile shows correct auth type

## Security Considerations

1. **Client Secrets**: Store OAuth client secrets in AWS Secrets Manager or Terraform variables (marked as sensitive)
2. **Redirect URIs**: Ensure callback URLs are properly configured and validated
3. **Token Validation**: Continue using JWT validation on backend
4. **HTTPS**: Ensure all OAuth redirects use HTTPS in production
5. **State Parameter**: Consider adding state parameter for CSRF protection (Cognito handles this)

## References

- [AWS Cognito Identity Providers](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Setup](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Cognito Hosted UI](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html)

