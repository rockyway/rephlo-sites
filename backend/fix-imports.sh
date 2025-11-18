#!/bin/bash

# Fix missing AdminAuditLog import
files_needing_admin_audit_log=(
  "src/services/audit-log.service.ts"
)

for file in "${files_needing_admin_audit_log[@]}"; do
  if grep -q "from '@prisma/client'" "$file"; then
    # Add to existing import
    sed -i "s/from '@prisma\/client';/, admin_audit_log as AdminAuditLog } from '@prisma\/client';/g" "$file"
    sed -i "s/{ PrismaClient,/{ PrismaClient, admin_audit_log as AdminAuditLog,/g" "$file"
    sed -i "s/, admin_audit_log as AdminAuditLog, admin_audit_log as AdminAuditLog/, admin_audit_log as AdminAuditLog/g" "$file"
  fi
done

echo "Import fixes applied"
