# System Rules Documentation

## Overview

The System Rules feature allows administrators to define and manage behavioral guidelines, content restrictions, and identity information for the AI assistant. These rules are automatically integrated into every AI prompt to ensure consistent behavior.

## Features

### ✅ **Content Restrictions**
- Block sexual/explicit content
- Prevent harmful or dangerous information
- Filter inappropriate topics
- Custom content guidelines

### ✅ **Bot Identity Management**
- Set bot name and identity
- Define developer/company information
- Customize bot purpose and mission
- Brand-specific messaging

### ✅ **Behavioral Guidelines**
- Professional communication standards
- Empathy and support requirements
- Crisis response protocols
- Interaction boundaries

### ✅ **Safety Rules**
- Personal information protection
- Crisis intervention protocols
- Professional boundary maintenance
- User safety guidelines

## Database Schema

### SystemRule Model
```prisma
model SystemRule {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  name        String   // Rule name
  category    String   // CONTENT_FILTER, IDENTITY, BEHAVIOR, SAFETY, GENERAL
  ruleType    String   // RESTRICTION, INSTRUCTION, IDENTITY, GUIDELINE
  content     String   // The actual rule content
  description String   // Rule description
  
  isActive    Boolean  @default(true)
  priority    Int      @default(1)    // Higher = more important
  severity    String   @default("MEDIUM") // LOW, MEDIUM, HIGH, CRITICAL
}
```

## API Endpoints

### Base URL: `/api/v1/system-rules`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all system rules |
| GET | `/active` | Get only active rules |
| GET | `/:id` | Get specific rule by ID |
| POST | `/` | Create new system rule |
| PATCH | `/:id` | Update existing rule |
| DELETE | `/:id` | Delete rule |
| PATCH | `/:id/toggle` | Toggle rule active status |
| GET | `/category/:category` | Get rules by category |

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Rule Categories

### 1. CONTENT_FILTER
**Purpose**: Control what content the AI can discuss
**Examples**:
- Sexual content restrictions
- Harmful information blocking
- Political discussion limits
- Inappropriate topic filtering

### 2. IDENTITY
**Purpose**: Define bot identity and branding
**Examples**:
- Bot name and introduction
- Developer/company information
- Mission and purpose statements
- Brand-specific messaging

### 3. BEHAVIOR
**Purpose**: Control how the AI behaves and communicates
**Examples**:
- Professional communication standards
- Empathy requirements
- Response tone guidelines
- Interaction protocols

### 4. SAFETY
**Purpose**: Ensure user safety and privacy
**Examples**:
- Personal information protection
- Crisis response protocols
- Professional boundary maintenance
- Emergency situation handling

### 5. GENERAL
**Purpose**: General guidelines and best practices
**Examples**:
- Respectful language requirements
- Accuracy and honesty standards
- Inclusive communication
- General etiquette

## Rule Types

### RESTRICTION
- **Purpose**: Block or prevent certain behaviors
- **Example**: "Do not provide sexual content"
- **Usage**: Content filtering, safety measures

### INSTRUCTION
- **Purpose**: Direct the AI to perform specific actions
- **Example**: "Always provide crisis hotlines for suicidal thoughts"
- **Usage**: Behavioral directives, response protocols

### IDENTITY
- **Purpose**: Define who the AI is and its background
- **Example**: "You are Pryve AI, developed by Pryve Team"
- **Usage**: Bot identity, branding, introductions

### GUIDELINE
- **Purpose**: General best practices and recommendations
- **Example**: "Use empathetic and supportive language"
- **Usage**: Communication style, general behavior

## Severity Levels

### CRITICAL
- **Priority**: Highest
- **Usage**: Safety-critical rules, legal compliance
- **Example**: Sexual content restrictions, crisis protocols
- **Placement**: Top of system prompt

### HIGH
- **Priority**: High
- **Usage**: Important behavioral rules, identity
- **Example**: Bot identity, professional boundaries
- **Placement**: Early in system prompt

### MEDIUM
- **Priority**: Medium
- **Usage**: General guidelines, communication style
- **Example**: Empathetic communication, accuracy
- **Placement**: Middle of system prompt

### LOW
- **Priority**: Low
- **Usage**: Minor preferences, optional guidelines
- **Example**: Formatting preferences, minor etiquette
- **Placement**: End of system prompt

## Integration with AI Prompts

### Prompt Structure
```
[Base System Prompt]

SYSTEM RULES AND GUIDELINES:

CRITICAL SYSTEM RULES (MUST FOLLOW):
- [Critical and High severity rules]

CONTENT RESTRICTIONS:
- [Content filter rules]

IDENTITY & INFORMATION:
- [Identity rules]

BEHAVIORAL GUIDELINES:
- [Behavior rules]

SAFETY GUIDELINES:
- [Safety rules]

GENERAL GUIDELINES:
- [General rules]

IMPORTANT: These system rules are mandatory and must be followed at all times.

[Emotional Response Rules]
[User-specific context]
```

## Usage Examples

### 1. Creating a Sexual Content Restriction
```json
{
  "name": "Sexual Content Restriction",
  "category": "CONTENT_FILTER",
  "ruleType": "RESTRICTION",
  "content": "Do not provide responses to sexual, explicit, or adult content questions. Politely decline and redirect to appropriate topics.",
  "description": "Prevents AI from engaging with sexual or explicit content",
  "priority": 10,
  "severity": "CRITICAL",
  "isActive": true
}
```

### 2. Setting Bot Identity
```json
{
  "name": "Bot Identity",
  "category": "IDENTITY",
  "ruleType": "IDENTITY",
  "content": "You are MyBot, an AI assistant developed by MyCompany Inc. Always introduce yourself as MyBot when asked about your identity.",
  "description": "Defines the bot's name and developer",
  "priority": 8,
  "severity": "HIGH",
  "isActive": true
}
```

### 3. Behavioral Guideline
```json
{
  "name": "Professional Communication",
  "category": "BEHAVIOR",
  "ruleType": "GUIDELINE",
  "content": "Always maintain a professional and respectful tone. Use proper grammar and avoid casual slang.",
  "description": "Ensures professional communication style",
  "priority": 5,
  "severity": "MEDIUM",
  "isActive": true
}
```

## Default Rules Included

The system comes with 11 pre-configured rules:

### Content Restrictions (2 rules)
- Sexual Content Restriction (CRITICAL)
- Harmful Content Filter (CRITICAL)

### Safety Rules (2 rules)
- Personal Information Protection (HIGH)
- Crisis Response Protocol (CRITICAL)

### Identity Rules (3 rules)
- Bot Name and Identity (HIGH)
- Developer Information (MEDIUM)
- Purpose and Mission (MEDIUM)

### Behavioral Rules (2 rules)
- Professional Boundaries (HIGH)
- Empathetic Communication (MEDIUM)

### General Rules (2 rules)
- Respectful Language (MEDIUM)
- Accuracy and Honesty (MEDIUM)

## Admin Panel Integration

### Creating Rules
1. Navigate to System Rules section
2. Click "Add Rule"
3. Fill in rule details:
   - Name and description
   - Category and rule type
   - Content (the actual rule)
   - Priority and severity
4. Save and activate

### Managing Rules
- ✅ View all rules in organized table
- ✅ Filter by category, severity, or status
- ✅ Toggle rules on/off instantly
- ✅ Edit rule content and settings
- ✅ Delete unnecessary rules
- ✅ Reorder by priority

### Rule Categories in Admin Panel
- **Content Filters**: Manage what AI can discuss
- **Bot Identity**: Set name, developer, purpose
- **Behavior Rules**: Control communication style
- **Safety Rules**: Ensure user protection
- **General Guidelines**: Overall best practices

## Testing

### Run Integration Tests
```bash
node test-system-rules-integration.js
```

### Test Coverage
- ✅ Rule creation and validation
- ✅ Rule retrieval and filtering
- ✅ Prompt integration
- ✅ Category-based organization
- ✅ Priority and severity handling
- ✅ Active/inactive status management

### Postman Collection
Import `Pryve_System_Rules_API.postman_collection.json` for API testing.

## Performance Considerations

### Caching
- System rules are cached for 5 minutes
- Reduces database queries
- Automatic cache invalidation on updates

### Optimization
- Rules loaded in parallel with other operations
- Non-blocking integration
- Graceful fallback if rule loading fails

### Monitoring
- Rule usage tracking
- Performance impact measurement
- Error logging and alerting

## Security

### Access Control
- JWT authentication required
- Admin-only access to rule management
- Audit logging for rule changes

### Validation
- Input sanitization
- Category and type validation
- Content length limits
- XSS prevention

### Data Protection
- Encrypted rule storage
- Secure API endpoints
- Rate limiting protection

## Troubleshooting

### Common Issues

**Rules not applying to AI responses**
- Check if rules are marked as `isActive: true`
- Verify rule content is properly formatted
- Check system prompt integration logs

**Performance issues**
- Monitor rule count (recommend < 50 active rules)
- Check rule content length
- Review caching configuration

**API errors**
- Verify JWT token validity
- Check required fields in requests
- Review error logs for details

### Debug Commands
```bash
# Test rule integration
node test-system-rules-integration.js

# Check active rules
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/system-rules/active

# View rule by category
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/system-rules/category/CONTENT_FILTER
```

## Future Enhancements

### Planned Features
- **Rule Templates**: Pre-built rule sets for common use cases
- **Conditional Rules**: Rules that apply based on user context
- **Rule Analytics**: Track rule effectiveness and usage
- **Bulk Operations**: Import/export rule sets
- **Version Control**: Track rule changes over time

### Advanced Capabilities
- **Machine Learning**: Automatic rule suggestion based on conversations
- **A/B Testing**: Test different rule configurations
- **User Feedback**: Allow users to report rule violations
- **Integration APIs**: Connect with external compliance systems

## Conclusion

The System Rules feature provides comprehensive control over AI behavior, ensuring consistent, safe, and brand-appropriate responses. With flexible categories, priority levels, and easy management through both API and admin panel, administrators can maintain full control over their AI assistant's behavior while ensuring user safety and satisfaction.