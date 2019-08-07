export default interface LicensingService {
  installProtection(): void

  getAllLicenses(): Promise<Partial<LicenseKeyDetails>[]>
  getLicenseInfo(licenseKey?: string): Promise<LicenseInfo>
  getLicenseStatus(workspaceId: string): Promise<LicenseStatus>

  refreshLicenseKey(workspaceId?: string): Promise<boolean>
  addNewKey(licenseKey: string, workspaceId?: string): Promise<void>
  setWorkspaceKey(workspaceId: string, filename: string): Promise<void>
  findWorkspaceLicense(workspaceId: string): Promise<LicenseKeyDetails | undefined>
  getPolicyUsage(policy: Policy, workspaceId?: string, license?: LicenseInfo): Promise<PolicyCount>
}

export interface LicenseStatus {
  status: 'licensed' | 'invalid' | 'breached'
  policyResults: CheckPolicyResult[]
  breachReasons: string[]
}

export interface LicenseInfo {
  ownerEmail: string
  keyName: string
  licenseId: number
  externalUrl: string

  autoRenew: boolean
  whiteLabel: boolean
  branding: boolean

  startDate: Date
  endDate: Date

  maxWorkspaces: number
  maxCollaborators: number
  maxEndUsers: number
  maxBots: number

  versions: string
  licenseSchema: 'v2'
}

export interface LicenseKeyDetails {
  filename: string
  licenseKey: string
  licenseInfo: LicenseInfo
  isAvailable: boolean
  isValid: boolean
  usedBy: { id: string; name: string }[]
}

export interface CheckPolicyResult {
  breached: boolean
  reason?: string
  policy: Policy
  /** Text displayed to the user on the admin panel in the policies section */
  status?: string
}

export interface PolicyCount {
  current: number
  maximum: number
  isOverLimit?: boolean
  available?: number
  display: string
}

export type LicensingStatus = {
  isPro: boolean
  isBuiltWithPro: boolean
  license?: LicenseInfo
} & LicenseStatus

export type Policy = 'Version' | 'Date' | 'Endpoint' | 'Collaborators' | 'Bots' | 'Workspaces' | 'End Users'
