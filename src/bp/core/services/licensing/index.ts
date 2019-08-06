import LicensingService, { LicenseInfo, LicenseKeyDetails, LicenseStatus } from 'common/licensing-service'
import { injectable } from 'inversify'

@injectable()
export default class CELicensingService implements LicensingService {
  installProtection(): void {}

  refreshLicenseKey(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async getLicenseStatus(workspaceId: string): Promise<LicenseStatus> {
    return {
      breachReasons: [],
      policyResults: [],
      status: 'licensed'
    }
  }

  getLicenseInfo(): Promise<LicenseInfo> {
    throw new Error('Not implemented')
  }
  getAllLicenses(): Promise<Partial<LicenseKeyDetails>[]> {
    throw new Error('Not implemented')
  }

  addNewKey(licenseKey: string, workspaceId?: string): Promise<void> {
    throw new Error('Not implemented')
  }

  setWorkspaceKey(workspaceId: string, filename: string): Promise<void> {
    throw new Error('Not implemented')
  }

  findWorkspaceLicense(workspaceId: string): Promise<LicenseKeyDetails | undefined> {
    throw new Error('Not implemented')
  }
}
