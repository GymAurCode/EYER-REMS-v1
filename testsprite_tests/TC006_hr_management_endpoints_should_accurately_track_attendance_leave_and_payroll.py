import requests
import datetime

BASE_URL = "http://localhost:3001/api"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}

def test_hr_management_endpoints_attendance_leave_payroll():
    employee_id = None
    attendance_id = None
    leave_id = None
    payroll_id = None

    # Setup employee data to create
    employee_data = {
        "firstName": "Test",
        "lastName": "Employee",
        "email": "test.employee@example.com",
        "position": "Software Engineer",
        "department": "Engineering",
        "startDate": "2024-01-01",
        "salary": 70000
    }

    # Create employee to use in tests
    try:
        # Create employee
        emp_resp = requests.post(
            f"{BASE_URL}/hr/employees",
            json=employee_data,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert emp_resp.status_code == 201, f"Employee creation failed: {emp_resp.text}"
        emp_json = emp_resp.json()
        employee_id = emp_json.get("id")
        assert employee_id is not None, "Employee ID not returned after creation"

        # Track attendance for the employee
        attendance_data = {
            "employeeId": employee_id,
            "date": datetime.date.today().isoformat(),
            "status": "Present",
            "checkIn": "09:00",
            "checkOut": "17:00"
        }
        attendance_resp = requests.post(
            f"{BASE_URL}/hr/attendance",
            json=attendance_data,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert attendance_resp.status_code == 201, f"Attendance creation failed: {attendance_resp.text}"
        attendance_json = attendance_resp.json()
        attendance_id = attendance_json.get("id")
        assert attendance_id is not None, "Attendance ID not returned after creation"
        assert attendance_json.get("status") == "Present", "Attendance status mismatch"

        # Create a leave request for the employee
        leave_data = {
            "employeeId": employee_id,
            "startDate": (datetime.date.today() + datetime.timedelta(days=3)).isoformat(),
            "endDate": (datetime.date.today() + datetime.timedelta(days=5)).isoformat(),
            "type": "Vacation",
            "reason": "Family trip"
        }
        leave_resp = requests.post(
            f"{BASE_URL}/hr/leave",
            json=leave_data,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert leave_resp.status_code == 201, f"Leave creation failed: {leave_resp.text}"
        leave_json = leave_resp.json()
        leave_id = leave_json.get("id")
        assert leave_id is not None, "Leave ID not returned after creation"
        assert leave_json.get("type") == "Vacation", "Leave type mismatch"

        # Process payroll for the employee
        payroll_data = {
            "employeeId": employee_id,
            "periodStart": "2024-01-01",
            "periodEnd": "2024-01-31",
            "baseSalary": 70000,
            "bonuses": 0,
            "deductions": 0,
            "netPay": 70000
        }
        payroll_resp = requests.post(
            f"{BASE_URL}/hr/payroll",
            json=payroll_data,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert payroll_resp.status_code == 201, f"Payroll creation failed: {payroll_resp.text}"
        payroll_json = payroll_resp.json()
        payroll_id = payroll_json.get("id")
        assert payroll_id is not None, "Payroll ID not returned after creation"
        assert payroll_json.get("netPay") == 70000, "Payroll net pay mismatch"

        # Retrieve employee record to verify data consistency
        get_emp_resp = requests.get(
            f"{BASE_URL}/hr/employees/{employee_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_emp_resp.status_code == 200, f"Failed to retrieve employee: {get_emp_resp.text}"
        get_emp_json = get_emp_resp.json()
        assert get_emp_json.get("email") == employee_data["email"], "Employee email mismatch"

        # Retrieve attendance records for the employee
        get_attendance_resp = requests.get(
            f"{BASE_URL}/hr/attendance?employeeId={employee_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_attendance_resp.status_code == 200, f"Failed to retrieve attendance: {get_attendance_resp.text}"
        attendance_records = get_attendance_resp.json()
        assert any(a.get("id") == attendance_id for a in attendance_records), "Attendance record missing in retrieval"

        # Retrieve leave records for the employee
        get_leave_resp = requests.get(
            f"{BASE_URL}/hr/leave?employeeId={employee_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_leave_resp.status_code == 200, f"Failed to retrieve leave: {get_leave_resp.text}"
        leave_records = get_leave_resp.json()
        assert any(l.get("id") == leave_id for l in leave_records), "Leave record missing in retrieval"

        # Retrieve payroll records for the employee
        get_payroll_resp = requests.get(
            f"{BASE_URL}/hr/payroll?employeeId={employee_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert get_payroll_resp.status_code == 200, f"Failed to retrieve payroll: {get_payroll_resp.text}"
        payroll_records = get_payroll_resp.json()
        assert any(p.get("id") == payroll_id for p in payroll_records), "Payroll record missing in retrieval"

    finally:
        # Cleanup payroll
        if payroll_id:
            del_payroll_resp = requests.delete(
                f"{BASE_URL}/hr/payroll/{payroll_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert del_payroll_resp.status_code in (200, 204), f"Payroll deletion failed: {del_payroll_resp.text}"

        # Cleanup leave
        if leave_id:
            del_leave_resp = requests.delete(
                f"{BASE_URL}/hr/leave/{leave_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert del_leave_resp.status_code in (200, 204), f"Leave deletion failed: {del_leave_resp.text}"

        # Cleanup attendance
        if attendance_id:
            del_attendance_resp = requests.delete(
                f"{BASE_URL}/hr/attendance/{attendance_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert del_attendance_resp.status_code in (200, 204), f"Attendance deletion failed: {del_attendance_resp.text}"

        # Cleanup employee
        if employee_id:
            del_employee_resp = requests.delete(
                f"{BASE_URL}/hr/employees/{employee_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert del_employee_resp.status_code in (200, 204), f"Employee deletion failed: {del_employee_resp.text}"

test_hr_management_endpoints_attendance_leave_payroll()