---
status: ready
topic: Bounded retry
---
# Research: Bounded retry
## Summary
Add bounded automatic retry on transient transport errors. The cap may be one or two retries; never retry permanent errors.
## Code References
- [send](src/send.js#L1-L3): delegates one request to injected transport.
## Integration Points
The injected transport owns actual delivery.
## Architecture Insights
Keep the existing send entry point; preserve permanent-error behavior.
## Precedents & Lessons
No Git commit is available in this disposable repository.
## Developer Context
No inherited retry count decision. Retry count is an architectural choice within the allowed cap.
## Open Questions
Should retry failures be logged at this layer or left to the caller?
