import requests
try:
    import jwt
except ImportError:
    # PyJWT library - install with: pip install PyJWT
    import jwt as jwt_lib
    jwt = jwt_lib
import time

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30

def test_authentication_jwt_and_device_approval():
    # Sample user credentials for authentication (normally these should be secure/test-specific)
    user_credentials = {
        "email": "testuser@example.com",
        "password": "StrongPassword123!"  # assumed password requirements
    }

    # 1. Test login endpoint with correct credentials to get JWT token and device approval challenge
    login_url = f"{BASE_URL}/auth/login"
    session = requests.Session()
    try:
        # Login request to get JWT and device approval token/challenge
        login_resp = session.post(login_url, json=user_credentials, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "token" in login_data, "JWT token missing in login response"
        assert "deviceApprovalRequired" in login_data, "Device approval flag missing in login response"

        token = login_data["token"]
        device_approval_required = login_data["deviceApprovalRequired"]

        # 2. Validate JWT token structure and expiry
        try:
            # PyJWT decode without verification
            decoded = jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            # If PyJWT is not available, try alternative approach
            import base64
            import json
            try:
                # Manual decode without verification (for testing only)
                parts = token.split('.')
                if len(parts) >= 2:
                    decoded = json.loads(base64.urlsafe_b64decode(parts[1] + '=='))
                else:
                    assert False, f"Invalid JWT token format: {e}"
            except Exception as e2:
                assert False, f"Failed to decode JWT token: {e2}"

        assert "exp" in decoded, "JWT token missing expiry"
        assert decoded["exp"] > time.time(), "JWT token is expired"

        # 3. Access protected endpoint with JWT token before device approval (if required)
        headers = {"Authorization": f"Bearer {token}"}
        protected_url = f"{BASE_URL}/auth/protected-resource"
        protected_resp = session.get(protected_url, headers=headers, timeout=TIMEOUT)

        if device_approval_required:
            # Access should be denied before device approval
            assert protected_resp.status_code == 403 or protected_resp.status_code == 401, \
                "Access granted without device approval, should be denied"

            # 4. Perform device approval workflow
            # Approve device endpoint could include token or device info - assumed schema:
            approval_url = f"{BASE_URL}/deviceApproval/approve"
            approval_payload = {"token": token, "deviceId": decoded.get("deviceId", "test-device-id")}
            approval_resp = session.post(approval_url, json=approval_payload, headers=headers, timeout=TIMEOUT)
            assert approval_resp.status_code == 200, f"Device approval failed: {approval_resp.text}"

            # 5. Retry protected endpoint after device approval
            protected_resp_after = session.get(protected_url, headers=headers, timeout=TIMEOUT)
            assert protected_resp_after.status_code == 200, \
                f"Access denied after device approval: {protected_resp_after.text}"
        else:
            # If no device approval required, access should be granted
            assert protected_resp.status_code == 200, \
                f"Access denied to protected resource without device approval requirement: {protected_resp.text}"

        # 6. Test login with invalid credentials (password hashing and auth enforcement)
        bad_credentials = user_credentials.copy()
        bad_credentials["password"] = "WrongPassword!"
        bad_login_resp = session.post(login_url, json=bad_credentials, timeout=TIMEOUT)
        assert bad_login_resp.status_code == 401, "Login succeeded with wrong password, hashing enforcement failed"

        # 7. Test JWT validation with malformed token
        bad_headers = {"Authorization": "Bearer invalid.jwt.token"}
        bad_token_resp = session.get(protected_url, headers=bad_headers, timeout=TIMEOUT)
        assert bad_token_resp.status_code == 401 or bad_token_resp.status_code == 403, \
            "Malformed JWT token was not rejected"

        # 8. Test expired JWT token if possible (simulate)
        # For demo: modify token payload expiry to past by decoding, re-encoding with past exp if secret available
        # Since we cannot sign without secret, just test API rejects obviously expired token
        expired_token = token + "a"  # tampered token to simulate invalidity
        expired_headers = {"Authorization": f"Bearer {expired_token}"}
        expired_resp = session.get(protected_url, headers=expired_headers, timeout=TIMEOUT)
        assert expired_resp.status_code == 401 or expired_resp.status_code == 403, \
            "Expired or invalid JWT token was not rejected"

    finally:
        session.close()

test_authentication_jwt_and_device_approval()