import os
import re

BASE_PATH = r"D:\sources\work\rephlo-sites"

# Update backend controller
file_path = os.path.join(BASE_PATH, 'backend', 'src', 'controllers', 'admin', 'model-tier-admin.controller.ts')
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change the response format
old = '''      res.status(200).json({
        status: 'success',
        data: result,
      });'''

new = '''      // Standard response format: flat data with optional metadata
      res.status(200).json({
        status: 'success',
        data: result.model,
        meta: {
          auditLog: result.auditLog,
        },
      });'''

content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated: {file_path}")
