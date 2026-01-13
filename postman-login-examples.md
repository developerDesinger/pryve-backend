# 🔑 How to Get Token for Postman Testing

## 🚀 Quick Methods to Get a Token

### Method 1: Use Postman Login Endpoint (Easiest)

1. **Open Postman**
2. **Import the collection** I created: `Pryve_Chat_Speed_Test.postman_collection.json`
3. **Go to "1. Authentication" → "Login User"**
4. **Update the request body** with real credentials:

```json
{
    "email": "your-actual-email@example.com",
    "password": "your-actual-password"
}
```

5. **Send the request**
6. **Token will be automatically saved** to environment variables

### Method 2: Try These Test Credentials

If you have any of these test accounts, try them in the login endpoint:

```json
{
    "email": "test@test.com",
    "password": "password123"
}
```

```json
{
    "email": "admin@test.com", 
    "password": "admin123"
}
```

```json
{
    "email": "user@example.com",
    "password": "testpassword"
}
```

### Method 3: Create Account via Frontend

1. **Open your frontend app**
2. **Register a new account**
3. **Complete OTP verification**
4. **Login and copy token** from browser dev tools

### Method 4: Manual Token Entry

If you get a token from any source, you can manually set it in Postman:

1. **Click environment dropdown** (top right in Postman)
2. **Select "Pryve Local Environment"**
3. **Click the eye icon** to edit
4. **Set `auth_token`** to your token value
5. **Save**

## 🔧 Testing the Login Endpoint

Here's exactly what to do in Postman:

### Step 1: Import Collection
- Import `Pryve_Chat_Speed_Test.postman_collection.json`
- Import `Pryve_Local_Environment.postman_environment.json`

### Step 2: Select Environment
- Click environment dropdown (top right)
- Select "Pryve Local Environment"

### Step 3: Try Login
- Go to "1. Authentication" → "Login User"
- Update request body with your credentials
- Send request

### Step 4: Check Response
If successful, you'll see:
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "user": {
            "id": "user-id-here",
            "email": "your-email@example.com"
        }
    }
}
```

The token will be **automatically saved** to the environment!

## 🎯 Quick Test

Once you have a token, test it works:

1. **Go to "2. Chat Management" → "Create Chat"**
2. **Send the request**
3. **If successful**, you'll get a chat ID
4. **Now you can test speed optimizations!**

## 🔍 Troubleshooting

### If Login Fails:
- ❌ **401 Unauthorized**: Wrong email/password
- ❌ **400 Bad Request**: User needs OTP verification
- ❌ **404 Not Found**: User doesn't exist

### If No Existing Account:
1. **Use your frontend app** to create account
2. **Complete OTP verification**
3. **Then use login endpoint** in Postman

### If Still Having Issues:
- Check server is running on port 3400
- Verify database is connected
- Try different test credentials

## 💡 Pro Tip

The easiest way is to:
1. **Login via your frontend app** (if you have one)
2. **Open browser dev tools** (F12)
3. **Go to Network tab**
4. **Look for login request**
5. **Copy token from response**
6. **Paste into Postman environment**

---

**Once you have a token, the speed optimization tests will work perfectly!** 🚀