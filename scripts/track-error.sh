#!/bin/bash
# Error tracking helper script
# Usage: ./scripts/track-error.sh "Error description" "Component" "Severity"

ERROR_DESC="$1"
COMPONENT="$2"
SEVERITY="${3:-Medium}"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)

BUG_FILE="docs/bugs-and-errors.md"

# Check if error already exists
if grep -q "$ERROR_DESC" "$BUG_FILE"; then
    echo "⚠️  Error already documented. Marking as repeated..."
    # Add repeated marker (manual step for now)
    echo "Please manually mark this error as repeated in $BUG_FILE"
else
    echo "📝 Adding new error to tracking log..."
    
    # Create error entry
    cat >> "$BUG_FILE" << EOF

### Error #$(grep -c "### Error #" "$BUG_FILE" | awk '{print $1+1}'): $ERROR_DESC
**Date:** $DATE  
**Status:** 🔴 Active  
**Severity:** $SEVERITY  
**Component:** $COMPONENT

**Error Pattern:**
\`\`\`
[Paste error message here]
\`\`\`

**Context:**
- Time: $TIMESTAMP
- Command: $(history 1 | tail -1 | sed 's/^[ ]*[0-9]*[ ]*//')

**Investigation:**
- [ ] Error reproduced
- [ ] Root cause identified
- [ ] Solution implemented
- [ ] Testing completed

**Solution:**
[To be filled]

**Testing Strategy:**
[To be filled]

---

EOF
    
    echo "✅ Error logged to $BUG_FILE"
    echo "📋 Please fill in the error pattern, solution, and testing strategy"
fi

