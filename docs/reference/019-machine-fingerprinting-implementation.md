# Machine Fingerprinting Implementation Guide

**Document**: 019-machine-fingerprinting-implementation.md
**Plan**: Plan 110 - Perpetual Licensing System
**Date**: 2025-11-09
**Related Schema**: `license_activation` table

---

## Overview

Machine fingerprinting is a critical fraud prevention mechanism for perpetual license activation tracking. It generates a unique, stable identifier for each device to enforce the 3-device activation limit.

## Fingerprint Components

The machine fingerprint is a **SHA-256 hash** combining the following hardware and OS identifiers:

```typescript
machineFingerprint = SHA256(
  cpuId +           // CPU serial number or processor ID
  macAddress +      // Primary network adapter MAC address
  diskSerial +      // Primary disk drive serial number
  osVersion         // OS version string (e.g., "Windows 11 Pro 22H2")
)
```

### Component Details

| Component | Description | Stability | Platform |
|-----------|-------------|-----------|----------|
| `cpuId` | CPU serial number or processor ID | High | Windows, macOS, Linux |
| `macAddress` | Primary network adapter MAC address | Medium | All platforms |
| `diskSerial` | Primary disk drive serial number | High | All platforms |
| `osVersion` | OS version string | Low (changes on updates) | All platforms |

## Implementation by Platform

### Windows (Electron Main Process)

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

async function getWindowsFingerprint(): Promise<string> {
  const components: string[] = [];

  // 1. CPU ID (using WMIC)
  try {
    const { stdout: cpuId } = await execAsync('wmic cpu get ProcessorId');
    const cpuSerial = cpuId.split('\n')[1]?.trim();
    components.push(cpuSerial || 'unknown-cpu');
  } catch (error) {
    components.push('unknown-cpu');
  }

  // 2. MAC Address (primary adapter)
  try {
    const { stdout: macAddr } = await execAsync('getmac /fo csv /nh');
    const mac = macAddr.split(',')[0]?.replace(/['"]/g, '').trim();
    components.push(mac || 'unknown-mac');
  } catch (error) {
    components.push('unknown-mac');
  }

  // 3. Disk Serial (C: drive)
  try {
    const { stdout: diskInfo } = await execAsync('wmic diskdrive get SerialNumber');
    const diskSerial = diskInfo.split('\n')[1]?.trim();
    components.push(diskSerial || 'unknown-disk');
  } catch (error) {
    components.push('unknown-disk');
  }

  // 4. OS Version
  try {
    const { stdout: osInfo } = await execAsync('wmic os get Caption,Version');
    const osVersion = osInfo.split('\n')[1]?.trim();
    components.push(osVersion || 'unknown-os');
  } catch (error) {
    components.push('unknown-os');
  }

  // Generate SHA-256 hash
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');

  return fingerprint;
}
```

### macOS (Electron Main Process)

```typescript
async function getMacOSFingerprint(): Promise<string> {
  const components: string[] = [];

  // 1. CPU ID (using system_profiler)
  try {
    const { stdout: cpuInfo } = await execAsync(
      'system_profiler SPHardwareDataType | grep "Serial Number"'
    );
    const cpuSerial = cpuInfo.split(':')[1]?.trim();
    components.push(cpuSerial || 'unknown-cpu');
  } catch (error) {
    components.push('unknown-cpu');
  }

  // 2. MAC Address (en0 primary adapter)
  try {
    const { stdout: macAddr } = await execAsync('ifconfig en0 | grep ether');
    const mac = macAddr.split('ether')[1]?.trim();
    components.push(mac || 'unknown-mac');
  } catch (error) {
    components.push('unknown-mac');
  }

  // 3. Disk Serial (primary disk)
  try {
    const { stdout: diskInfo } = await execAsync(
      'system_profiler SPSerialATADataType | grep "Serial Number"'
    );
    const diskSerial = diskInfo.split(':')[1]?.trim();
    components.push(diskSerial || 'unknown-disk');
  } catch (error) {
    components.push('unknown-disk');
  }

  // 4. OS Version
  try {
    const { stdout: osVersion } = await execAsync('sw_vers -productVersion');
    components.push(osVersion.trim() || 'unknown-os');
  } catch (error) {
    components.push('unknown-os');
  }

  // Generate SHA-256 hash
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');

  return fingerprint;
}
```

### Linux (Electron Main Process)

```typescript
async function getLinuxFingerprint(): Promise<string> {
  const components: string[] = [];

  // 1. CPU ID (from /proc/cpuinfo)
  try {
    const { stdout: cpuInfo } = await execAsync('cat /proc/cpuinfo | grep "processor"');
    const cpuId = cpuInfo.split('\n')[0]?.split(':')[1]?.trim();
    components.push(cpuId || 'unknown-cpu');
  } catch (error) {
    components.push('unknown-cpu');
  }

  // 2. MAC Address (primary adapter)
  try {
    const { stdout: macAddr } = await execAsync('ip link show | grep "link/ether"');
    const mac = macAddr.split('link/ether')[1]?.trim().split(' ')[0];
    components.push(mac || 'unknown-mac');
  } catch (error) {
    components.push('unknown-mac');
  }

  // 3. Disk Serial (using udevadm)
  try {
    const { stdout: diskInfo } = await execAsync('udevadm info --query=all --name=/dev/sda | grep ID_SERIAL=');
    const diskSerial = diskInfo.split('ID_SERIAL=')[1]?.trim();
    components.push(diskSerial || 'unknown-disk');
  } catch (error) {
    components.push('unknown-disk');
  }

  // 4. OS Version
  try {
    const { stdout: osVersion } = await execAsync('cat /etc/os-release | grep PRETTY_NAME');
    const osName = osVersion.split('=')[1]?.replace(/['"]/g, '').trim();
    components.push(osName || 'unknown-os');
  } catch (error) {
    components.push('unknown-os');
  }

  // Generate SHA-256 hash
  const fingerprint = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');

  return fingerprint;
}
```

## Unified API

Create a platform-agnostic wrapper:

```typescript
export async function getMachineFingerprint(): Promise<string> {
  switch (process.platform) {
    case 'win32':
      return getWindowsFingerprint();
    case 'darwin':
      return getMacOSFingerprint();
    case 'linux':
      return getLinuxFingerprint();
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}
```

## Device Information Collection

In addition to the fingerprint, collect human-readable device metadata:

```typescript
export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  osType: 'Windows' | 'macOS' | 'Linux';
  osVersion: string;
  cpuInfo: string;
}

export async function collectDeviceInfo(): Promise<DeviceInfo> {
  const fingerprint = await getMachineFingerprint();

  return {
    fingerprint,
    deviceName: os.hostname(),
    osType: getPlatformName(),
    osVersion: os.release(),
    cpuInfo: os.cpus()[0]?.model || 'Unknown CPU',
  };
}

function getPlatformName(): 'Windows' | 'macOS' | 'Linux' {
  switch (process.platform) {
    case 'win32': return 'Windows';
    case 'darwin': return 'macOS';
    case 'linux': return 'Linux';
    default: return 'Linux'; // Fallback
  }
}
```

## Activation Flow

### 1. License Activation Request

```typescript
// Desktop App → Backend API
POST /api/licenses/activate
{
  "licenseKey": "REPHLO-1A2B-3C4D-5E6F-7G8H",
  "machineFingerprint": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "deviceName": "John-Laptop",
  "osType": "Windows",
  "osVersion": "11 Pro 22H2",
  "cpuInfo": "Intel Core i7-12700K"
}
```

### 2. Backend Validation

```typescript
async function activateLicense(req: Request, res: Response) {
  const { licenseKey, machineFingerprint, deviceName, osType, osVersion, cpuInfo } = req.body;

  // 1. Find license by key
  const license = await prisma.perpetualLicense.findUnique({
    where: { licenseKey },
    include: { activations: { where: { status: 'active' } } },
  });

  if (!license) {
    return res.status(404).json({ error: 'License not found' });
  }

  // 2. Check activation limit
  const activeActivations = license.activations.filter(a => a.status === 'active');
  if (activeActivations.length >= license.maxActivations) {
    // Check if this machine is already activated
    const existingActivation = activeActivations.find(
      a => a.machineFingerprint === machineFingerprint
    );

    if (!existingActivation) {
      return res.status(403).json({
        error: 'Activation limit reached',
        maxActivations: license.maxActivations,
        currentActivations: activeActivations.length,
      });
    }

    // Already activated - update last_seen_at
    await prisma.licenseActivation.update({
      where: { id: existingActivation.id },
      data: { lastSeenAt: new Date() },
    });

    return res.json({ message: 'Device already activated', activation: existingActivation });
  }

  // 3. Create new activation
  const activation = await prisma.licenseActivation.create({
    data: {
      licenseId: license.id,
      userId: license.userId,
      machineFingerprint,
      deviceName,
      osType,
      osVersion,
      cpuInfo,
      status: 'active',
    },
  });

  // 4. Update license activation count
  await prisma.perpetualLicense.update({
    where: { id: license.id },
    data: {
      currentActivations: { increment: 1 },
      activatedAt: license.activatedAt || new Date(),
      status: 'active',
    },
  });

  return res.json({ message: 'License activated successfully', activation });
}
```

### 3. Deactivation Flow

Allow users to deactivate devices to free up activation slots:

```typescript
async function deactivateLicense(req: Request, res: Response) {
  const { licenseKey, machineFingerprint } = req.body;

  // Find activation
  const activation = await prisma.licenseActivation.findFirst({
    where: {
      license: { licenseKey },
      machineFingerprint,
      status: 'active',
    },
    include: { license: true },
  });

  if (!activation) {
    return res.status(404).json({ error: 'Activation not found' });
  }

  // Deactivate
  await prisma.licenseActivation.update({
    where: { id: activation.id },
    data: {
      status: 'deactivated',
      deactivatedAt: new Date(),
    },
  });

  // Decrement activation count
  await prisma.perpetualLicense.update({
    where: { id: activation.licenseId },
    data: { currentActivations: { decrement: 1 } },
  });

  return res.json({ message: 'Device deactivated successfully' });
}
```

## Security Considerations

### 1. Fingerprint Collisions

**Risk**: Two different machines generate the same fingerprint.

**Mitigation**:
- Use 256-bit SHA-256 hashes (2^256 possible values)
- Combine 4 independent hardware identifiers
- Collision probability: ~0% for realistic dataset sizes

### 2. Fingerprint Spoofing

**Risk**: Malicious users clone hardware identifiers.

**Mitigation**:
- Combine with backend rate limiting (max 3 activations per license)
- Monitor suspicious patterns (e.g., same fingerprint across multiple licenses)
- Implement fraud detection (e.g., too many deactivations/reactivations)

### 3. Hardware Changes

**Risk**: Legitimate hardware upgrades change the fingerprint.

**Issue**: User upgrades RAM/GPU → fingerprint remains same (good)
**Issue**: User upgrades CPU/motherboard → fingerprint changes (requires deactivation)

**Mitigation**:
- Allow users to deactivate old devices via web dashboard
- Implement "device replacement" flow (auto-deactivate old, activate new)
- Grace period: Allow 1 extra activation for 7 days during hardware changes

### 4. Virtual Machines

**Risk**: Users run desktop app in VMs with randomized hardware IDs.

**Mitigation**:
- Detect VM environments (check for VMware, VirtualBox, Hyper-V signatures)
- Block activations from VMs or require manual approval

## Testing

### Unit Tests

```typescript
describe('Machine Fingerprinting', () => {
  it('should generate consistent fingerprints for same machine', async () => {
    const fp1 = await getMachineFingerprint();
    const fp2 = await getMachineFingerprint();
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64); // SHA-256 hex
  });

  it('should generate different fingerprints for different components', async () => {
    const fp1 = crypto.createHash('sha256').update('cpu1|mac1|disk1|os1').digest('hex');
    const fp2 = crypto.createHash('sha256').update('cpu2|mac1|disk1|os1').digest('hex');
    expect(fp1).not.toBe(fp2);
  });
});
```

### Integration Tests

```typescript
describe('License Activation API', () => {
  it('should activate license for first device', async () => {
    const response = await request(app)
      .post('/api/licenses/activate')
      .send({
        licenseKey: 'REPHLO-TEST-1234-5678-ABCD',
        machineFingerprint: 'a1b2c3...',
        deviceName: 'Test-Device-1',
        osType: 'Windows',
        osVersion: '11 Pro',
        cpuInfo: 'Intel i7',
      });

    expect(response.status).toBe(200);
    expect(response.body.activation).toBeDefined();
  });

  it('should reject activation when limit reached', async () => {
    // Activate 3 devices first
    // ...

    // Try to activate 4th device
    const response = await request(app)
      .post('/api/licenses/activate')
      .send({ licenseKey: 'REPHLO-TEST-1234-5678-ABCD', /* ... */ });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Activation limit reached');
  });
});
```

## Monitoring and Analytics

Track activation patterns to detect fraud:

```sql
-- Suspicious patterns: Same fingerprint across multiple licenses
SELECT
  machine_fingerprint,
  COUNT(DISTINCT license_id) AS license_count,
  COUNT(*) AS activation_count
FROM license_activation
GROUP BY machine_fingerprint
HAVING COUNT(DISTINCT license_id) > 1;

-- Excessive deactivations (potential abuse)
SELECT
  license_id,
  COUNT(*) AS total_activations,
  SUM(CASE WHEN status = 'deactivated' THEN 1 ELSE 0 END) AS deactivation_count
FROM license_activation
GROUP BY license_id
HAVING SUM(CASE WHEN status = 'deactivated' THEN 1 ELSE 0 END) > 5;
```

## Next Steps

1. Implement fingerprinting in Electron main process
2. Create `/api/licenses/activate` and `/api/licenses/deactivate` endpoints
3. Build "Device Management" UI in user dashboard
4. Add fraud detection monitoring
5. Implement VM detection (optional)
6. Test across Windows, macOS, Linux platforms

---

**Related Documents**:
- `docs/plan/110-perpetual-plan-and-proration-strategy.md`
- `docs/plan/115-master-orchestration-plan-109-110-111.md`
- `backend/prisma/schema.prisma` (license_activation table)
