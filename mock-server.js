// Mock Backend Server for Integration Testing (using Node.js http module only)
const http = require('http');
const url = require('url');

// Mock data store
let mockDownloads = [];
let mockFeedback = [];
let mockDiagnostics = [];

// Helper to parse JSON body
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      callback(null, JSON.parse(body));
    } catch (e) {
      callback(e, null);
    }
  });
}

// Helper to send JSON response
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Health check
  if (pathname === '/health' && method === 'GET') {
    return sendJSON(res, 200, {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: 'mock-testing'
    });
  }

  // Track download
  if (pathname === '/api/track-download' && method === 'POST') {
    return parseBody(req, (err, body) => {
      if (err) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Invalid JSON'
        });
      }

      const { os } = body;
      if (!os || !['windows', 'macos', 'linux'].includes(os)) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Validation failed: OS must be one of: windows, macos, linux'
        });
      }

      const downloadId = 'mock_' + Date.now();
      const downloadUrls = {
        windows: 'https://releases.rephlo.ai/rephlo-1.2.0-windows.exe',
        macos: 'https://releases.rephlo.ai/rephlo-1.2.0-macos.dmg',
        linux: 'https://releases.rephlo.ai/rephlo-1.2.0-linux.AppImage'
      };

      mockDownloads.push({
        id: downloadId,
        os,
        timestamp: new Date(),
        ipHash: 'mock_hash_' + Math.random().toString(36).substring(7)
      });

      return sendJSON(res, 200, {
        success: true,
        data: {
          downloadUrl: downloadUrls[os],
          downloadId
        }
      });
    });
  }

  // Submit feedback
  if (pathname === '/api/feedback' && method === 'POST') {
    return parseBody(req, (err, body) => {
      if (err) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Invalid JSON'
        });
      }

      const { message, email, userId } = body;

      if (!message || message.trim().length === 0) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Validation failed: Message is required'
        });
      }

      if (message.length > 1000) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Validation failed: Message must be 1000 characters or less'
        });
      }

      if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Validation failed: Invalid email format'
        });
      }

      const feedbackId = 'feedback_' + Date.now();
      mockFeedback.push({
        id: feedbackId,
        message,
        email: email || null,
        userId: userId || null,
        timestamp: new Date()
      });

      return sendJSON(res, 200, {
        success: true,
        data: { feedbackId }
      });
    });
  }

  // Get version
  if (pathname === '/api/version' && method === 'GET') {
    return sendJSON(res, 200, {
      success: true,
      data: {
        version: '1.2.0',
        releaseDate: '2025-11-03T00:00:00.000Z',
        downloadUrl: 'https://releases.rephlo.ai/rephlo-1.2.0-windows.exe',
        changelog: '## v1.2.0\n\n- Fixed text transformation bugs\n- Improved performance\n- Added new features'
      }
    });
  }

  // Get admin metrics
  if (pathname === '/admin/metrics' && method === 'GET') {
    const downloadsByOS = mockDownloads.reduce((acc, d) => {
      acc[d.os] = (acc[d.os] || 0) + 1;
      return acc;
    }, { windows: 0, macos: 0, linux: 0 });

    const recentFeedback = mockFeedback.slice(-10).reverse().map(f => ({
      id: f.id,
      message: f.message,
      email: f.email,
      timestamp: f.timestamp
    }));

    return sendJSON(res, 200, {
      success: true,
      data: {
        downloads: {
          ...downloadsByOS,
          total: mockDownloads.length
        },
        feedback: {
          total: mockFeedback.length,
          recentCount: recentFeedback.length,
          entries: recentFeedback
        },
        diagnostics: {
          total: mockDiagnostics.length,
          totalSize: mockDiagnostics.reduce((sum, d) => sum + d.fileSize, 0)
        },
        timestamps: {
          firstDownload: mockDownloads.length > 0 ? mockDownloads[0].timestamp : null,
          lastDownload: mockDownloads.length > 0 ? mockDownloads[mockDownloads.length - 1].timestamp : null
        }
      }
    });
  }

  // Upload diagnostics
  if (pathname === '/api/diagnostics' && method === 'POST') {
    const diagnosticId = 'diag_' + Date.now();
    mockDiagnostics.push({
      id: diagnosticId,
      fileSize: 1024,
      timestamp: new Date()
    });

    return sendJSON(res, 200, {
      success: true,
      data: {
        diagnosticId,
        fileSize: 1024
      }
    });
  }

  // 404 handler
  return sendJSON(res, 404, {
    success: false,
    error: 'Route not found'
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log('This server simulates the backend API for integration testing');
  console.log('');
  console.log('Available endpoints:');
  console.log('- GET  /health');
  console.log('- POST /api/track-download');
  console.log('- POST /api/feedback');
  console.log('- GET  /api/version');
  console.log('- GET  /admin/metrics');
  console.log('- POST /api/diagnostics');
});
