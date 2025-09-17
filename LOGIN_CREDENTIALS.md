# Login Credentials for Route Reports

## To View Route Reports with Data

You must login with a user from **Tenant 002** because all the route data, dealers, and orders belong to this tenant.

### Working Credentials:
```
Email: hari@gmail.com
Password: password123
Role: Admin
Tenant: 002
```

### Why Other Users Won't Work:
- `test@test.com` belongs to Tenant `TEST001` - No data
- `test1@gmail.com` belongs to Tenant `001` - No data
- Other users belong to different tenants

## Steps to Access Route Reports:

1. **Logout** if currently logged in with another user
2. **Login** with:
   - Email: `hari@gmail.com`
   - Password: `password123`
3. Navigate to **Reports > Route Reports**
4. You should see:
   - 1 Route: Chennai (Code: 100)
   - 2 Orders totaling ₹152.45
   - Collection Efficiency: 94.29%
   - Outstanding Amount: ₹8.70

## API Test Results:
When logged in with the correct user (hari@gmail.com), the API returns:
```json
{
  "summary": {
    "totalRoutes": 1,
    "totalOrders": 2,
    "totalAmount": 152.45,
    "outstandingAmount": 8.70,
    "collectionEfficiency": 94.29
  },
  "routeMetrics": [
    {
      "route": { "code": "100", "name": "Chennai" },
      "metrics": {
        "totalOrders": 2,
        "totalAmount": 152.45,
        "outstandingAmount": 8.70,
        "paidAmount": 143.75
      }
    }
  ]
}
```

## Troubleshooting:
If you still see "Failed to fetch route metrics":
1. Check browser console (F12) for the actual error
2. Verify localStorage has the correct token and tenantId
3. Make sure backend is running on port 8000
4. Try refreshing the page after login