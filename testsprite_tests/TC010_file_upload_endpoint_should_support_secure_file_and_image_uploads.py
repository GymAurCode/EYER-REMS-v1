import requests
import io

BASE_URL = "http://localhost:3001/api"
UPLOAD_ENDPOINT = f"{BASE_URL}/upload"
TIMEOUT = 30

def test_file_upload_endpoint_supports_secure_uploads():
    # Prepare headers, if authentication is required add headers['Authorization'] = 'Bearer <token>'
    headers = {}

    # Valid image file (small PNG)
    valid_image = io.BytesIO(
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'
        b'\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01'
        b'\xe2!\xbc\x33\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    valid_image.name = "test.png"

    # Valid file (small text file)
    valid_file = io.BytesIO(b"Sample text content")
    valid_file.name = "sample.txt"

    # Invalid file type (executable script)
    invalid_file = io.BytesIO(b"#!/bin/bash\necho malicious code")
    invalid_file.name = "malicious.sh"

    # Oversized file (simulate ~6MB)
    large_content = b"x" * (6 * 1024 * 1024)  # 6MB
    large_file = io.BytesIO(large_content)
    large_file.name = "large_file.txt"

    def upload_file(file_obj):
        file_obj.seek(0)
        files = {'file': (file_obj.name, file_obj, 'application/octet-stream')}
        try:
            response = requests.post(UPLOAD_ENDPOINT, headers=headers, files=files, timeout=TIMEOUT)
            return response
        except requests.RequestException as e:
            return e
    
    # 1. Test upload of valid image file
    resp = upload_file(valid_image)
    assert not isinstance(resp, Exception), f"Request failed: {resp}"
    assert resp.status_code == 200, f"Expected 200 OK for valid image upload, got {resp.status_code}"
    json_resp = resp.json()
    assert 'fileUrl' in json_resp or 'filename' in json_resp, "Valid image upload response missing expected keys"

    # 2. Test upload of valid other file (txt)
    resp = upload_file(valid_file)
    assert not isinstance(resp, Exception), f"Request failed: {resp}"
    assert resp.status_code == 200, f"Expected 200 OK for valid file upload, got {resp.status_code}"
    json_resp = resp.json()
    assert 'fileUrl' in json_resp or 'filename' in json_resp, "Valid file upload response missing expected keys"

    # 3. Test upload of invalid file type
    resp = upload_file(invalid_file)
    assert not isinstance(resp, Exception), f"Request failed: {resp}"
    assert resp.status_code in (400, 415), f"Expected 400 or 415 for invalid file type, got {resp.status_code}"
    json_resp = resp.json()
    assert 'error' in json_resp or 'message' in json_resp, "Invalid file type upload response missing error message"

    # 4. Test upload of oversized file
    resp = upload_file(large_file)
    assert not isinstance(resp, Exception), f"Request failed: {resp}"
    assert resp.status_code == 413 or resp.status_code == 400, f"Expected 413 Payload Too Large or 400 for oversized file, got {resp.status_code}"
    json_resp = resp.json()
    assert 'error' in json_resp or 'message' in json_resp, "Oversized file upload response missing error message"

test_file_upload_endpoint_supports_secure_uploads()