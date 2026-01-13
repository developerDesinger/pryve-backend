# 🚀 Postman Speed Test Setup Guide

## 📦 Files Created

I've created a complete Postman setup for testing your chat API speed optimizations:

1. **`Pryve_Chat_Speed_Test.postman_collection.json`** - Main collection
2. **`Pryve_Local_Environment.postman_environment.json`** - Environment variables

## 🔧 Setup Instructions

### Step 1: Import into Postman

1. **Open Postman**
2. **Click "Import"** (top left)
3. **Drag and drop both files** or click "Upload Files"
4. **Import both**:
   - `Pryve_Chat_Speed_Test.postman_collection.json`
   - `Pryve_Local_Environment.postman_environment.json`

### Step 2: Select Environment

1. **Click environment dropdown** (top right)
2. **Select "Pryve Local Environment"**
3. **Verify base_url** is set to `http://localhost:3400/api/v1`

### Step 3: Login to Get Token

**Option A: Use Login Endpoint**
1. **Go to "1. Authentication" → "Login User"**
2. **Update the request body** with your credentials:
   ```json
   {
       "email": "your-email@example.com",
       "password": "your-password"
   }
   ```
3. **Send the request**
4. **Token will be automatically saved** to environment

**Option B: Use Social Login**
1. **Go to "1. Authentication" → "Social Login (Alternative)"**
2. **Send the request** (uses test data)
3. **Token will be automatically saved**

### Step 4: Create Test Chat

1. **Go to "2. Chat Management" → "Create Chat"**
2. **Send the request**
3. **Chat ID will be automatically saved**

### Step 5: Test Speed Optimizations

Run these tests in order to see the optimizations:

1. **"Simple Message (Should use gpt-4o-mini)"**
   - Tests: "Hi"
   - Expected: Fast response, gpt-4o-mini model

2. **"Short Question (Should use gpt-4o-mini)"**
   - Tests: "How are you?"
   - Expected: Fast response, gpt-4o-mini model

3. **"Complex Question (Should use gpt-4o)"**
   - Tests: Complex anxiety/stress question
   - Expected: Detailed response, gpt-4o model

4. **"Streaming Message Test"**
   - Tests: Streaming endpoint
   - Expected: Real-time response chunks

## 📊 What to Look For

### In Postman Console (View → Show Postman Console):

```
🚀 SIMPLE MESSAGE TEST RESULTS:
==================================================
⏱️  Total Time: 1200ms
🤖 AI Processing: 800ms
🧠 Model Used: gpt-4o-mini
🔢 Tokens Used: 25
📊 Network + DB: 400ms
✅ OPTIMIZATION SUCCESS: Using fast model!
🚀 EXCELLENT SPEED - Under 1.5 seconds!
```

### In Server Console:

```
🚀 MODEL OPTIMIZATION: Using gpt-4o-mini for query length: 2 chars
🚀 PROMPT OPTIMIZATION: 57 chars vs 801 chars (92.9% reduction)
```

## 🎯 Expected Results

| Test | Expected Model | Expected Time | Expected Tokens |
|------|---------------|---------------|-----------------|
| "Hi" | gpt-4o-mini | < 1.5 sec | 20-50 |
| "How are you?" | gpt-4o-mini | < 2 sec | 30-60 |
| Complex question | gpt-4o | < 5 sec | 100-300 |

## 🔍 Troubleshooting

### If Login Fails:
- **Check server is running** on port 3400
- **Update credentials** in login request body
- **Try social login** as alternative

### If No Speed Improvements:
- **Check server logs** for optimization messages
- **Verify server restart** after code changes
- **Compare response times** between simple and complex queries

### If Token Expires:
- **Re-run login request**
- **Token is automatically saved** to environment
- **All subsequent requests** will use new token

## 🚀 Quick Test Workflow

1. **Import collection and environment**
2. **Run "Login User"** (update credentials first)
3. **Run "Create Chat"**
4. **Run all speed tests** in sequence
5. **Check console output** for results
6. **Compare response times** and models used

## 💡 Pro Tips

- **Keep Postman Console open** to see detailed results
- **Run tests multiple times** to see consistent improvements
- **Compare token usage** between simple and complex queries
- **Check server logs** simultaneously for optimization messages
- **Use streaming endpoint** for best user experience

---

**Ready to test!** Import the files and start with the login endpoint. The collection will automatically track response times and show you exactly how the optimizations are working! 🎉