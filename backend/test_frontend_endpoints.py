import urllib.request
import json

def test_endpoints():
    login_url = "http://localhost:8000/api/auth/login/"
    payload = json.dumps({"email": "admin@taskflow.dev", "password": "Admin@12345"}).encode("utf-8")
    req = urllib.request.Request(login_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode("utf-8"))
        token = data.get("token")
        print(f"Login OK. Token: {token[:8]}...")

    headers = {"Authorization": f"Token {token}"}
    api_endpoints = [
        ("Dashboard Summary", "/api/dashboard/summary/"),
        ("Projects List", "/api/projects/"),
        ("Tasks List", "/api/tasks/"),
        ("Notifications", "/api/notifications/"),
        ("Conversations", "/api/conversations/"),
        ("Team Members", "/api/users/"),
        ("Profile", "/api/profile/"),
        ("Settings", "/api/settings/"),
    ]

    for label, path in api_endpoints:
        url = f"http://localhost:8000{path}"
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            if isinstance(res_data, list):
                count = len(res_data)
            elif isinstance(res_data, dict) and "results" in res_data:
                count = len(res_data["results"])
            else:
                count = len(res_data.keys())
            print(f"  [OK 200] {label:20} -> {path} (Count/Fields: {count})")

if __name__ == "__main__":
    test_endpoints()
