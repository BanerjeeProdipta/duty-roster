# Duty Roster Database ERD

The application uses PostgreSQL with Drizzle ORM.

```mermaid
erDiagram
    USER {
        text id PK
        text name
        text email UK
        boolean emailVerified
        role role
        boolean banned
        text banReason
        timestamp banExpires
        timestamp createdAt
        timestamp updatedAt
    }

    SESSION {
        text id PK
        timestamp expiresAt
        text token UK
        text userId FK
        text ipAddress
        text userAgent
    }

    ACCOUNT {
        text id PK
        text accountId
        text providerId
        text userId FK
    }

    VERIFICATION {
        text id PK
        text identifier
        text value
        timestamp createdAt
    }

    NURSE {
        text id PK
        text name
        boolean active
        integer sortOrder
        text designation
        timestamp createdAt
    }

    SHIFT {
        text id PK
        shift_enum name UK
        time startTime
        time endTime
        boolean crossesMidnight
    }

    NURSE_SCHEDULE {
        text id PK
        text nurseId FK
        timestamp date
        text shiftId FK
        timestamp createdAt
    }

    NURSE_SHIFT_PREFERENCE {
        text nurseId PK_FK
        text shiftId PK_FK
        integer weight
        boolean active
    }

    AGENT_DOCUMENT {
        text id PK
        text content
        jsonb metadata
        vector embedding
        timestamp createdAt
    }

    USER ||--o{ SESSION : has
    USER ||--o{ ACCOUNT : has
    NURSE ||--o{ NURSE_SCHEDULE : scheduled
    SHIFT o|--o{ NURSE_SCHEDULE : assigned
    NURSE ||--o{ NURSE_SHIFT_PREFERENCE : has
    SHIFT ||--o{ NURSE_SHIFT_PREFERENCE : preferred
```

## Relationships

- `nurse_schedule` stores one assignment per nurse per day.
- A null `shiftId` in `nurse_schedule` represents an OFF day.
- `nurse_shift_preference` is a many-to-many table that stores each nurse's preference weight for a shift.
- `agent_document` stores text, metadata, and vector embeddings for AI/document retrieval.
- `user`, `session`, `account`, and `verification` are managed by Better-Auth.
