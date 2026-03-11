import requests

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30

# These tokens should represent users with different roles for testing RBAC:
# For example, admin_token has full permissions, user_token limited permissions
# For demonstration, placeholder tokens are used; replace with real tokens.
admin_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin"  # Admin JWT token
user_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user"    # Regular user JWT token
invalid_token = "invalidtokenstring"

def test_roles_management_rbac_and_invite_link_generation():
    headers_admin = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    headers_user = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
    headers_invalid = {"Authorization": f"Bearer {invalid_token}", "Content-Type": "application/json"}

    role_data = {
        "name": "test_role_for_rbac",
        "permissions": ["read_roles", "create_roles", "generate_invite_links"]
    }

    created_role_id = None

    try:
        # 1. Admin creates a new role (should succeed)
        response = requests.post(f"{BASE_URL}/roles", json=role_data, headers=headers_admin, timeout=TIMEOUT)
        assert response.status_code == 201, f"Admin should be able to create role, got {response.status_code}"
        created_role = response.json()
        created_role_id = created_role.get("id")
        assert created_role_id is not None, "Created role id should not be None"
        assert created_role.get("name") == role_data["name"], "Created role name mismatch"

        # 2. Regular user tries to create a new role (should be forbidden or unauthorized)
        response = requests.post(f"{BASE_URL}/roles", json=role_data, headers=headers_user, timeout=TIMEOUT)
        assert response.status_code in (401, 403), f"User without permission should not create role, got {response.status_code}"

        # 3. Access the list of roles as admin (should succeed and include created role)
        response = requests.get(f"{BASE_URL}/roles", headers=headers_admin, timeout=TIMEOUT)
        assert response.status_code == 200, f"Admin should be able to list roles, got {response.status_code}"
        roles_list = response.json()
        assert any(r.get("id") == created_role_id for r in roles_list), "Created role should appear in roles list"

        # 4. Access the list of roles as regular user (may be forbidden or restricted)
        response = requests.get(f"{BASE_URL}/roles", headers=headers_user, timeout=TIMEOUT)
        assert response.status_code in (200, 401, 403), f"User may or may not view roles, got {response.status_code}"
        if response.status_code == 200:
            roles_user_list = response.json()
            # Should not contain roles admin only
            # For strict RBAC, roles_user_list should not include all roles; can't assert exact content w/o spec

        # 5. Generate invite link for created role as admin (should succeed)
        invite_payload = {"roleId": created_role_id}
        response = requests.post(f"{BASE_URL}/roles/invite-link", json=invite_payload, headers=headers_admin, timeout=TIMEOUT)
        assert response.status_code == 200, f"Admin should generate invite link, got {response.status_code}"
        invite_response = response.json()
        invite_link = invite_response.get("inviteLink")
        assert invite_link and isinstance(invite_link, str), "Invite link should be a non-empty string"

        # 6. Try to generate invite link as regular user (should be forbidden or unauthorized)
        response = requests.post(f"{BASE_URL}/roles/invite-link", json=invite_payload, headers=headers_user, timeout=TIMEOUT)
        assert response.status_code in (401, 403), f"User without permission should not generate invite link, got {response.status_code}"

        # 7. Try an endpoint with invalid token (should be unauthorized)
        response = requests.get(f"{BASE_URL}/roles", headers=headers_invalid, timeout=TIMEOUT)
        assert response.status_code == 401, f"Invalid token should be unauthorized, got {response.status_code}"

        # 8. Try to get details of the role by admin (should succeed)
        response = requests.get(f"{BASE_URL}/roles/{created_role_id}", headers=headers_admin, timeout=TIMEOUT)
        assert response.status_code == 200, f"Admin should get role details, got {response.status_code}"
        role_details = response.json()
        assert role_details.get("id") == created_role_id, "Role details id mismatch"

        # 9. Try to get details of the role by user (may be forbidden or unauthorized)
        response = requests.get(f"{BASE_URL}/roles/{created_role_id}", headers=headers_user, timeout=TIMEOUT)
        assert response.status_code in (200, 401, 403), f"User access to role details varies, got {response.status_code}"

    finally:
        # Cleanup: delete created role if exists
        if created_role_id:
            # Only admin can delete roles
            try:
                response = requests.delete(f"{BASE_URL}/roles/{created_role_id}", headers=headers_admin, timeout=TIMEOUT)
                # Accepting 200 or 204 as success
                assert response.status_code in (200, 204), f"Admin should be able to delete role, got {response.status_code}"
            except Exception:
                pass  # best-effort cleanup

test_roles_management_rbac_and_invite_link_generation()