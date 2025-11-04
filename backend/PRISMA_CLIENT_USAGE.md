# Prisma Client Usage Guide

## Overview
This guide provides comprehensive examples of using the Prisma Client to interact with the Rephlo database.

## Import Prisma Client

```typescript
// Import the singleton instance
import { prisma } from './db';

// Or import with types
import { prisma, Download, Feedback, Diagnostic, AppVersion } from './db';

// Import utility functions
import { isDatabaseConnected, getDatabaseStats } from './db';
```

## Basic CRUD Operations

### Create Records

```typescript
// Create a download record
const download = await prisma.download.create({
  data: {
    os: 'windows',
    userAgent: 'Mozilla/5.0...',
    ipHash: 'hashed_ip_address',
  },
});

// Create feedback
const feedback = await prisma.feedback.create({
  data: {
    userId: 'user_abc123',
    message: 'Great app!',
    email: 'user@example.com',
  },
});

// Create diagnostic record
const diagnostic = await prisma.diagnostic.create({
  data: {
    userId: 'user_abc123',
    filePath: 's3://bucket/diagnostic-001.log',
    fileSize: 25600, // bytes
  },
});

// Create app version
const version = await prisma.appVersion.create({
  data: {
    version: '1.0.0',
    releaseDate: new Date('2025-11-01'),
    downloadUrl: 'https://releases.rephlo.ai/v1.0.0/rephlo-setup.exe',
    changelog: '# Release Notes\n\n...',
    isLatest: true,
  },
});
```

### Read Records

```typescript
// Find unique record by ID
const download = await prisma.download.findUnique({
  where: { id: 'clx1234567890' },
});

// Find first matching record
const latestVersion = await prisma.appVersion.findFirst({
  where: { isLatest: true },
});

// Find many records with filtering
const windowsDownloads = await prisma.download.findMany({
  where: {
    os: 'windows',
  },
});

// Find with ordering and pagination
const recentFeedback = await prisma.feedback.findMany({
  where: {
    email: { not: null }, // Only feedback with email
  },
  orderBy: {
    timestamp: 'desc',
  },
  take: 10, // Limit to 10 records
  skip: 0,  // Offset for pagination
});

// Find with select (return specific fields only)
const versions = await prisma.appVersion.findMany({
  select: {
    version: true,
    releaseDate: true,
    downloadUrl: true,
  },
});
```

### Update Records

```typescript
// Update single record
const updated = await prisma.appVersion.update({
  where: { id: 'clx1234567890' },
  data: {
    isLatest: false,
  },
});

// Update many records
const result = await prisma.appVersion.updateMany({
  where: {
    isLatest: true,
  },
  data: {
    isLatest: false,
  },
});
console.log(`Updated ${result.count} records`);

// Conditional update
const version = await prisma.appVersion.findFirst({
  where: { version: '1.0.0' },
});

if (version) {
  await prisma.appVersion.update({
    where: { id: version.id },
    data: { isLatest: true },
  });
}
```

### Delete Records

```typescript
// Delete single record
await prisma.download.delete({
  where: { id: 'clx1234567890' },
});

// Delete many records
const result = await prisma.feedback.deleteMany({
  where: {
    timestamp: {
      lt: new Date('2025-01-01'), // Before 2025
    },
  },
});
console.log(`Deleted ${result.count} records`);

// Delete all records (dangerous!)
await prisma.download.deleteMany();
```

## Advanced Queries

### Aggregation

```typescript
// Count records
const totalDownloads = await prisma.download.count();

const windowsDownloads = await prisma.download.count({
  where: { os: 'windows' },
});

// Group by and count
const downloadsByOS = await prisma.download.groupBy({
  by: ['os'],
  _count: {
    id: true,
  },
});
// Result: [{ os: 'windows', _count: { id: 100 } }, ...]

// Aggregate statistics
const diagnosticStats = await prisma.diagnostic.aggregate({
  _count: { id: true },
  _sum: { fileSize: true },
  _avg: { fileSize: true },
  _max: { fileSize: true },
  _min: { fileSize: true },
});
console.log('Total diagnostics:', diagnosticStats._count.id);
console.log('Total size:', diagnosticStats._sum.fileSize, 'bytes');
console.log('Average size:', diagnosticStats._avg.fileSize, 'bytes');
```

### Filtering

```typescript
// String filtering
const feedback = await prisma.feedback.findMany({
  where: {
    message: {
      contains: 'bug', // Case-sensitive
    },
  },
});

const feedbackInsensitive = await prisma.feedback.findMany({
  where: {
    message: {
      contains: 'bug',
      mode: 'insensitive', // Case-insensitive
    },
  },
});

// Date filtering
const recentDownloads = await prisma.download.findMany({
  where: {
    timestamp: {
      gte: new Date('2025-11-01'), // Greater than or equal
      lt: new Date('2025-12-01'),  // Less than
    },
  },
});

// Multiple conditions (AND)
const results = await prisma.feedback.findMany({
  where: {
    email: { not: null },
    timestamp: { gte: new Date('2025-11-01') },
  },
});

// Multiple conditions (OR)
const results2 = await prisma.download.findMany({
  where: {
    OR: [
      { os: 'windows' },
      { os: 'macos' },
    ],
  },
});

// NOT condition
const noEmailFeedback = await prisma.feedback.findMany({
  where: {
    NOT: {
      email: null,
    },
  },
});
```

### Sorting

```typescript
// Single field ascending
const downloads = await prisma.download.findMany({
  orderBy: {
    timestamp: 'asc',
  },
});

// Single field descending
const downloads2 = await prisma.download.findMany({
  orderBy: {
    timestamp: 'desc',
  },
});

// Multiple fields
const versions = await prisma.appVersion.findMany({
  orderBy: [
    { isLatest: 'desc' },  // Latest first
    { releaseDate: 'desc' }, // Then by date
  ],
});
```

### Pagination

```typescript
// Simple pagination
async function getPaginatedFeedback(page: number, pageSize: number = 10) {
  const skip = (page - 1) * pageSize;

  const [feedback, total] = await Promise.all([
    prisma.feedback.findMany({
      skip,
      take: pageSize,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.feedback.count(),
  ]);

  return {
    data: feedback,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalRecords: total,
    },
  };
}

// Usage
const page1 = await getPaginatedFeedback(1, 10);
const page2 = await getPaginatedFeedback(2, 10);
```

## API Integration Examples

### Track Download

```typescript
// API endpoint: POST /api/track-download
export async function trackDownload(os: string, userAgent?: string, ipHash?: string) {
  try {
    const download = await prisma.download.create({
      data: {
        os,
        userAgent,
        ipHash,
      },
    });

    return {
      success: true,
      downloadId: download.id,
    };
  } catch (error) {
    console.error('Failed to track download:', error);
    return {
      success: false,
      error: 'Failed to track download',
    };
  }
}
```

### Submit Feedback

```typescript
// API endpoint: POST /api/feedback
export async function submitFeedback(
  message: string,
  email?: string,
  userId?: string
) {
  // Validate message length (max 1000 chars)
  if (message.length > 1000) {
    return {
      success: false,
      error: 'Message exceeds 1000 characters',
    };
  }

  try {
    const feedback = await prisma.feedback.create({
      data: {
        message,
        email,
        userId,
      },
    });

    return {
      success: true,
      feedbackId: feedback.id,
    };
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return {
      success: false,
      error: 'Failed to submit feedback',
    };
  }
}
```

### Upload Diagnostic

```typescript
// API endpoint: POST /api/diagnostics
export async function recordDiagnostic(
  filePath: string,
  fileSize: number,
  userId?: string
) {
  // Validate file size (max 5MB = 5242880 bytes)
  if (fileSize > 5242880) {
    return {
      success: false,
      error: 'File size exceeds 5MB limit',
    };
  }

  try {
    const diagnostic = await prisma.diagnostic.create({
      data: {
        filePath,
        fileSize,
        userId,
      },
    });

    return {
      success: true,
      diagnosticId: diagnostic.id,
    };
  } catch (error) {
    console.error('Failed to record diagnostic:', error);
    return {
      success: false,
      error: 'Failed to record diagnostic',
    };
  }
}
```

### Get Latest Version

```typescript
// API endpoint: GET /api/version
export async function getLatestVersion() {
  try {
    const version = await prisma.appVersion.findFirst({
      where: { isLatest: true },
      select: {
        version: true,
        downloadUrl: true,
        changelog: true,
        releaseDate: true,
      },
    });

    if (!version) {
      return {
        success: false,
        error: 'No version found',
      };
    }

    return {
      success: true,
      version: version.version,
      downloadUrl: version.downloadUrl,
      changelog: version.changelog,
      releaseDate: version.releaseDate,
    };
  } catch (error) {
    console.error('Failed to get latest version:', error);
    return {
      success: false,
      error: 'Failed to get version info',
    };
  }
}
```

### Get Admin Metrics

```typescript
// API endpoint: GET /admin/metrics
export async function getMetrics() {
  try {
    // Get download counts by OS
    const downloadsByOS = await prisma.download.groupBy({
      by: ['os'],
      _count: { id: true },
    });

    const downloads = downloadsByOS.reduce((acc, item) => {
      acc[item.os] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get total counts
    const [feedbackCount, diagnosticsCount] = await Promise.all([
      prisma.feedback.count(),
      prisma.diagnostic.count(),
    ]);

    // Get recent feedback
    const recentFeedback = await prisma.feedback.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: {
        id: true,
        message: true,
        email: true,
        timestamp: true,
      },
    });

    return {
      success: true,
      metrics: {
        downloads,
        feedbackCount,
        diagnosticsCount,
        recentFeedback,
      },
    };
  } catch (error) {
    console.error('Failed to get metrics:', error);
    return {
      success: false,
      error: 'Failed to get metrics',
    };
  }
}
```

## Transactions

```typescript
// Simple transaction
await prisma.$transaction(async (tx) => {
  // Mark all versions as not latest
  await tx.appVersion.updateMany({
    where: { isLatest: true },
    data: { isLatest: false },
  });

  // Create new version as latest
  await tx.appVersion.create({
    data: {
      version: '2.0.0',
      releaseDate: new Date(),
      downloadUrl: 'https://...',
      changelog: '...',
      isLatest: true,
    },
  });
});

// Transaction with rollback on error
try {
  const result = await prisma.$transaction([
    prisma.download.create({ data: { os: 'windows' } }),
    prisma.download.create({ data: { os: 'macos' } }),
    prisma.download.create({ data: { os: 'linux' } }),
  ]);
  console.log('Created', result.length, 'downloads');
} catch (error) {
  console.error('Transaction failed, all changes rolled back');
}
```

## Raw SQL Queries

```typescript
// Execute raw SQL (for complex queries)
const result = await prisma.$queryRaw`
  SELECT os, COUNT(*) as count
  FROM downloads
  WHERE timestamp > ${new Date('2025-11-01')}
  GROUP BY os
  ORDER BY count DESC
`;

// Execute parameterized query
const os = 'windows';
const downloads = await prisma.$queryRaw`
  SELECT * FROM downloads
  WHERE os = ${os}
  LIMIT 10
`;

// Execute non-query SQL
await prisma.$executeRaw`
  DELETE FROM downloads
  WHERE timestamp < ${new Date('2025-01-01')}
`;
```

## Utility Functions

```typescript
// Health check
import { isDatabaseConnected } from './db';

const isHealthy = await isDatabaseConnected();
console.log('Database health:', isHealthy ? 'OK' : 'Error');

// Get statistics
import { getDatabaseStats } from './db';

const stats = await getDatabaseStats();
console.log('Database stats:', stats);
/*
{
  downloads: 150,
  feedbacks: 42,
  diagnostics: 8,
  versions: 3,
  timestamp: 2025-11-03T...
}
*/
```

## Error Handling

```typescript
import { Prisma } from '@prisma/client';

try {
  await prisma.download.create({
    data: { os: 'windows' },
  });
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle known errors
    if (error.code === 'P2002') {
      console.error('Unique constraint violation');
    } else if (error.code === 'P2025') {
      console.error('Record not found');
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    console.error('Validation error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## TypeScript Types

```typescript
import type { Download, Feedback, Diagnostic, AppVersion } from './db';

// Use types in function signatures
function processDownload(download: Download) {
  console.log(`Download from ${download.os} at ${download.timestamp}`);
}

// Partial types
function updateFeedback(id: string, data: Partial<Feedback>) {
  return prisma.feedback.update({
    where: { id },
    data,
  });
}

// Create input types
type CreateDownloadInput = {
  os: string;
  userAgent?: string;
  ipHash?: string;
};

function createDownload(input: CreateDownloadInput) {
  return prisma.download.create({ data: input });
}
```

## Best Practices

1. **Always use the singleton instance** from `./db/index.ts`
   ```typescript
   // Good
   import { prisma } from './db';

   // Bad - creates multiple instances
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   ```

2. **Handle errors gracefully**
   ```typescript
   try {
     const result = await prisma.download.create({ ... });
     return { success: true, data: result };
   } catch (error) {
     console.error('Database error:', error);
     return { success: false, error: 'Operation failed' };
   }
   ```

3. **Use transactions for related operations**
   ```typescript
   await prisma.$transaction([
     prisma.appVersion.updateMany({ ... }),
     prisma.appVersion.create({ ... }),
   ]);
   ```

4. **Validate input before database operations**
   ```typescript
   if (message.length > 1000) {
     throw new Error('Message too long');
   }
   await prisma.feedback.create({ data: { message } });
   ```

5. **Use indexes for frequently queried fields**
   - Already configured in schema.prisma
   - Query by indexed fields for better performance

6. **Clean up connections**
   - Handled automatically by the singleton instance
   - Shutdown handlers registered in db/index.ts

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Schema Reference](./prisma/schema.prisma)
- [Database Client](./src/db/index.ts)
