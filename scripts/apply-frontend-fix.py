import os

BASE_PATH = r"D:\sources\work\rephlo-sites"
file_path = os.path.join(BASE_PATH, 'frontend', 'src', 'api', 'admin.ts')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change the updateModelTier method
old = '''    const response = await apiClient.patch<{
      status: string;
      data: { model: ModelTierInfo; auditLog: any };
    }>(
      `/admin/models/${modelId}/tier`,
      data
    );
    // Backend returns { model: {...}, auditLog: {...} }, extract model only
    return response.data.data.model;'''

new = '''    const response = await apiClient.patch<{
      status: string;
      data: ModelTierInfo;
      meta?: { auditLog: any };
    }>(
      `/admin/models/${modelId}/tier`,
      data
    );
    // Backend returns flat data
    return response.data.data;'''

content = content.replace(old, new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated: {file_path}")
