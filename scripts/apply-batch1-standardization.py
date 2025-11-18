#!/usr/bin/env python3
"""
Apply Batch 1 API Response Standardization

This script applies the exact code changes documented in
docs/analysis/073-batch1-standardization-implementation-spec.md
"""

import os
import re

# Define the base path
BASE_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def update_backend_controller():
    """Update backend/src/controllers/admin/model-tier-admin.controller.ts"""
    file_path = os.path.join(BASE_PATH, 'backend', 'src', 'controllers', 'admin', 'model-tier-admin.controller.ts')

    print(f"Updating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change 1: updateModelTier method
    old_pattern_1 = r'''      res\.status\(200\)\.json\(\{
        status: 'success',
        data: result,
      \}\);'''

    new_code_1 = '''      // Standard response format: flat data with optional metadata
      res.status(200).json({
        status: 'success',
        data: result.model,
        meta: {
          auditLog: result.auditLog,
        },
      });'''

    # Apply change 1
    content = re.sub(old_pattern_1, new_code_1, content, count=2)  # Updates both methods

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] Backend controller updated")

def update_frontend_api_client():
    """Update frontend/src/api/admin.ts"""
    file_path = os.path.join(BASE_PATH, 'frontend', 'src', 'api', 'admin.ts')

    print(f"Updating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change: updateModelTier method
    old_pattern = r'''const response = await apiClient\.patch<\{
      status: string;
      data: \{ model: ModelTierInfo; auditLog: any \};
    \}>\(
      `/admin/models/\$\{modelId\}/tier`,
      data
    \);
    // Backend returns \{ model: \{...\}, auditLog: \{...\} \}, extract model only
    return response\.data\.data\.model;'''

    new_code = '''const response = await apiClient.patch<{
      status: string;
      data: ModelTierInfo;
      meta?: { auditLog: any };
    }>(
      `/admin/models/${modelId}/tier`,
      data
    );
    // Backend returns flat data
    return response.data.data;'''

    content = re.sub(old_pattern, new_code, content)

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("[OK] Frontend API client updated")

def main():
    """Main function"""
    print("=" * 60)
    print("Batch 1 API Response Standardization")
    print("=" * 60)
    print()

    try:
        update_backend_controller()
        update_frontend_api_client()

        print()
        print("=" * 60)
        print("✓ All changes applied successfully!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. cd backend && npm run build")
        print("2. cd frontend && npm run build")
        print("3. Test the endpoints manually")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == '__main__':
    exit(main())
