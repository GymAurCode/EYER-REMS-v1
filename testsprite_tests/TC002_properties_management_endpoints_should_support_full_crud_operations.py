import requests
import uuid

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Include authentication header here if required, e.g.:
    # "Authorization": "Bearer <JWT_TOKEN>"
}

def test_properties_management_full_crud():
    created_ids = {
        "property_id": None,
        "unit_id": None,
        "block_id": None,
        "floor_id": None,
        "lease_id": None,
        "sale_id": None,
        "buyer_id": None,
    }

    try:
        # Create Property
        property_payload = {
            "name": f"Test Property {uuid.uuid4()}",
            "address": "123 Test St",
            "code": f"PROP-{uuid.uuid4().hex[:8].upper()}",
            "status": "active"
        }
        r = requests.post(f"{BASE_URL}/properties", json=property_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        property_data = r.json()
        assert 'id' in property_data, "Property creation response missing 'id'"
        created_ids["property_id"] = property_data["id"]
        assert property_data["name"] == property_payload["name"]
        assert property_data["code"] == property_payload["code"]
        assert property_data["status"].lower() == property_payload["status"].lower()

        # Read Property (Verify)
        r = requests.get(f"{BASE_URL}/properties/{created_ids['property_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_property = r.json()
        assert fetched_property["id"] == created_ids["property_id"]

        # Update Property (status)
        update_property_payload = {"status": "inactive"}
        r = requests.put(f"{BASE_URL}/properties/{created_ids['property_id']}", json=update_property_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_property = r.json()
        assert updated_property["status"].lower() == update_property_payload["status"].lower()

        # Create Block linked to property
        block_payload = {
            "name": "Block A",
            "property_id": created_ids["property_id"],
            "code": f"BLK-{uuid.uuid4().hex[:6].upper()}",
            "status": "active"
        }
        r = requests.post(f"{BASE_URL}/blocks", json=block_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        block_data = r.json()
        assert 'id' in block_data, "Block creation response missing 'id'"
        created_ids["block_id"] = block_data["id"]
        assert block_data["property_id"] == created_ids["property_id"]

        # Read Block
        r = requests.get(f"{BASE_URL}/blocks/{created_ids['block_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_block = r.json()
        assert fetched_block["id"] == created_ids["block_id"]

        # Update Block
        r = requests.put(f"{BASE_URL}/blocks/{created_ids['block_id']}", json={"status": "inactive"}, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_block = r.json()
        assert updated_block["status"].lower() == "inactive"

        # Create Floor linked to block
        floor_payload = {
            "name": "Floor 1",
            "block_id": created_ids["block_id"],
            "level": 1,
            "status": "active"
        }
        r = requests.post(f"{BASE_URL}/floors", json=floor_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        floor_data = r.json()
        assert 'id' in floor_data, "Floor creation response missing 'id'"
        created_ids["floor_id"] = floor_data["id"]
        assert floor_data["block_id"] == created_ids["block_id"]

        # Read Floor
        r = requests.get(f"{BASE_URL}/floors/{created_ids['floor_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_floor = r.json()
        assert fetched_floor["id"] == created_ids["floor_id"]

        # Update Floor
        r = requests.put(f"{BASE_URL}/floors/{created_ids['floor_id']}", json={"status": "inactive"}, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_floor = r.json()
        assert updated_floor["status"].lower() == "inactive"

        # Create Unit linked to floor (and block, property implied)
        unit_payload = {
            "name": "Unit 101",
            "floor_id": created_ids["floor_id"],
            "block_id": created_ids["block_id"],
            "property_id": created_ids["property_id"],
            "unit_number": "101",
            "type": "residential",
            "status": "available"
        }
        r = requests.post(f"{BASE_URL}/units", json=unit_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        unit_data = r.json()
        assert 'id' in unit_data, "Unit creation response missing 'id'"
        created_ids["unit_id"] = unit_data["id"]
        assert unit_data["floor_id"] == created_ids["floor_id"]

        # Read Unit
        r = requests.get(f"{BASE_URL}/units/{created_ids['unit_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_unit = r.json()
        assert fetched_unit["id"] == created_ids["unit_id"]

        # Update Unit status
        r = requests.put(f"{BASE_URL}/units/{created_ids['unit_id']}", json={"status": "occupied"}, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_unit = r.json()
        assert updated_unit["status"].lower() == "occupied"

        # Create Buyer
        buyer_payload = {
            "name": "John Doe",
            "email": f"johndoe{uuid.uuid4().hex[:6]}@example.com",
            "phone": "+1234567890"
        }
        r = requests.post(f"{BASE_URL}/buyers", json=buyer_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        buyer_data = r.json()
        assert 'id' in buyer_data, "Buyer creation response missing 'id'"
        created_ids["buyer_id"] = buyer_data["id"]
        assert buyer_data["email"] == buyer_payload["email"]

        # Read Buyer
        r = requests.get(f"{BASE_URL}/buyers/{created_ids['buyer_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_buyer = r.json()
        assert fetched_buyer["id"] == created_ids["buyer_id"]

        # Update Buyer
        r = requests.put(f"{BASE_URL}/buyers/{created_ids['buyer_id']}", json={"phone": "+1987654321"}, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_buyer = r.json()
        assert updated_buyer["phone"] == "+1987654321"

        # Create Lease linked to unit and buyer
        lease_payload = {
            "unit_id": created_ids["unit_id"],
            "buyer_id": created_ids["buyer_id"],
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "rent": 1500.00,
            "status": "active"
        }
        r = requests.post(f"{BASE_URL}/leases", json=lease_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        lease_data = r.json()
        assert 'id' in lease_data, "Lease creation response missing 'id'"
        created_ids["lease_id"] = lease_data["id"]
        assert lease_data["unit_id"] == created_ids["unit_id"]
        assert lease_data["buyer_id"] == created_ids["buyer_id"]

        # Read Lease
        r = requests.get(f"{BASE_URL}/leases/{created_ids['lease_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_lease = r.json()
        assert fetched_lease["id"] == created_ids["lease_id"]

        # Update Lease Status
        r = requests.put(f"{BASE_URL}/leases/{created_ids['lease_id']}", json={"status": "terminated"}, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_lease = r.json()
        assert updated_lease["status"].lower() == "terminated"

        # Create Sale linked to unit and buyer
        sale_payload = {
            "unit_id": created_ids["unit_id"],
            "buyer_id": created_ids["buyer_id"],
            "sale_date": "2025-04-01",
            "price": 250000.00,
            "status": "completed"
        }
        r = requests.post(f"{BASE_URL}/sales", json=sale_payload, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 201
        sale_data = r.json()
        assert 'id' in sale_data, "Sale creation response missing 'id'"
        created_ids["sale_id"] = sale_data["id"]
        assert sale_data["unit_id"] == created_ids["unit_id"]
        assert sale_data["buyer_id"] == created_ids["buyer_id"]

        # Read Sale
        r = requests.get(f"{BASE_URL}/sales/{created_ids['sale_id']}", headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        fetched_sale = r.json()
        assert fetched_sale["id"] == created_ids["sale_id"]

        # Update Sale Status
        r = requests.put(f"{BASE_URL}/sales/{created_ids['sale_id']}", json={"status": "refunded"}, headers=HEADERS, timeout=TIMEOUT)
        assert r.status_code == 200
        updated_sale = r.json()
        assert updated_sale["status"].lower() == "refunded"

    finally:
        # Delete Sale
        if created_ids["sale_id"]:
            r = requests.delete(f"{BASE_URL}/sales/{created_ids['sale_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)

        # Delete Lease
        if created_ids["lease_id"]:
            r = requests.delete(f"{BASE_URL}/leases/{created_ids['lease_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)

        # Delete Buyer
        if created_ids["buyer_id"]:
            r = requests.delete(f"{BASE_URL}/buyers/{created_ids['buyer_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)

        # Delete Unit
        if created_ids["unit_id"]:
            r = requests.delete(f"{BASE_URL}/units/{created_ids['unit_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)

        # Delete Floor
        if created_ids["floor_id"]:
            r = requests.delete(f"{BASE_URL}/floors/{created_ids['floor_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)

        # Delete Block
        if created_ids["block_id"]:
            r = requests.delete(f"{BASE_URL}/blocks/{created_ids['block_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)

        # Delete Property
        if created_ids["property_id"]:
            r = requests.delete(f"{BASE_URL}/properties/{created_ids['property_id']}", headers=HEADERS, timeout=TIMEOUT)
            assert r.status_code in (200, 204, 404)


test_properties_management_full_crud()
