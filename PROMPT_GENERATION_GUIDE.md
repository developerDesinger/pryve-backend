# 250K Word Prompt Generation Guide

## Quick Start

Generate a 250K+ word prompt ready to copy-paste into your admin panel:

```bash
npm run generate:prompt
```

Or directly:
```bash
node scripts/generate-250k-prompt.js
```

## Output

The script generates `250k-prompt.txt` in the project root with:
- **~284,000 words** (exceeds 250K requirement)
- **~2.24 MB** file size
- Structured content across 10 major sections
- Ready to copy-paste

## What Gets Generated

The prompt includes comprehensive sections covering:

1. **Core Identity and Purpose** (~5,800 words)
2. **Communication Guidelines** (~9,500 words)
3. **Problem-Solving Frameworks** (~14,500 words)
4. **Knowledge Domains** (~57,000 words)
5. **Response Patterns** (~36,000 words)
6. **Safety and Ethics** (~18,400 words)
7. **Technical Guidance** (~50,000 words)
8. **Learning Support** (~31,400 words)
9. **Advanced Reasoning** (~33,100 words)
10. **Specialized Domains** (~28,100 words)

## How to Use

1. **Generate the prompt:**
   ```bash
   npm run generate:prompt
   ```

2. **Open `250k-prompt.txt`** in your text editor

3. **Copy the entire contents** (Ctrl+A, Ctrl+C)

4. **Paste into your admin panel** when uploading/updating the system prompt

5. **Make sure `systemPromptActive = true`** when saving

## What Happens Next

When you save the prompt through your admin panel:

1. ✅ Prompt is saved to `AIConfig.systemPrompt` in PostgreSQL
2. ✅ System detects prompt is >500 words
3. ✅ Automatically chunks into 1000-word pieces (200-word overlap)
4. ✅ Generates embeddings for each chunk using OpenAI
5. ✅ Stores chunks in Supabase Vector DB
6. ✅ Ready for vector similarity search!

## Customization

To modify the prompt generation:

1. Edit `scripts/generate-250k-prompt.js`
2. Adjust word counts per section in the `sections` array
3. Add more content templates in `contentTemplates` object
4. Run the script again

## File Location

Generated file: `250k-prompt.txt` (project root)

## Notes

- The prompt is designed to be comprehensive and cover multiple domains
- Content includes variations to ensure diversity
- File is large (~2.24 MB) - make sure your admin panel can handle it
- When uploaded, it will be automatically chunked and stored in vector DB
- Only relevant chunks will be retrieved during chat conversations

## Troubleshooting

**File too large for admin panel?**
- The prompt is designed to be chunked automatically
- If your admin panel has size limits, you can split the file manually
- Or reduce word counts in the script

**Need different content?**
- Edit the `contentTemplates` object in the script
- Add your own domain-specific content
- Adjust section word counts as needed

**Regenerate with different size?**
- Modify the `words` property in each section object
- Total target: adjust individual sections to reach desired total

