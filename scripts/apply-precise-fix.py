import re

file_path = r"D:\sources\work\rephlo-sites\backend\src\controllers\admin\model-tier-admin.controller.ts"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace in updateModelTier method (around line 112)
in_update_model_tier = False
in_revert_tier_change = False
output_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Detect updateModelTier method
    if 'updateModelTier = async' in line:
        in_update_model_tier = True
    elif in_update_model_tier and line.strip() == '};':
        in_update_model_tier = False
    
    # Detect revertTierChange method
    if 'revertTierChange = async' in line:
        in_revert_tier_change = True
    elif in_revert_tier_change and line.strip() == '};':
        in_revert_tier_change = False
    
    # Replace the response format in these two methods only
    if (in_update_model_tier or in_revert_tier_change) and 'res.status(200).json({' in line:
        # Found the start of response, replace the next 3 lines
        output_lines.append('      // Standard response format: flat data with optional metadata\n')
        output_lines.append('      res.status(200).json({\n')
        output_lines.append("        status: 'success',\n")
        output_lines.append('        data: result.model,\n')
        output_lines.append('        meta: {\n')
        output_lines.append('          auditLog: result.auditLog,\n')
        output_lines.append('        },\n')
        output_lines.append('      });\n')
        # Skip the next 3 lines (old format)
        i += 4
        continue
    
    output_lines.append(line)
    i += 1

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("Backend controller updated successfully")
