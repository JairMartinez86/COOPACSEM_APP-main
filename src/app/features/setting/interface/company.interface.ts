export interface CompanyRequest {
  CompanyName: string;
  TradeName: string;
  Ruc: string;
  BusinessType: string;
  Status: string;
  Description: string;

  LogoUrl: string;
  LogoFileName: string;

  Email: string;
  Phone: string;
  Mobile: string;
  Website: string;
  Address: string;
  Country: string;
  City: string;

  DateFormat: string;
  Currency: string;
  DecimalSeparator: string;
  ThousandSeparator: string;

  AffiliationCost: number;
  OrdinaryCapitalPercentage: number;
  OtherDeferredIncomePercentage: number;
  AffiliationAccount?: string;
  AffiliationNavidadAccount?: string;
  OrdinaryCapitalAccount?: string;
  OtherDeferredIncomeAccount?: string;

  SmtpHost: string;
  SmtpPort: number;
  SmtpUsername: string;
  SmtpPassword: string;
  SmtpFrom: string;

  TwoFactorCodeExpirationMinutes: number;
  PasswordResetExpirationMinutes: number;
  TrustedDeviceExpirationDays: number;
  LoginLockMinutes: number;
  JwtExpiresMinutes: number;
  RefreshExpiresMinutes: number;
}

export const EMPTY_COMPANY: CompanyRequest = {
  CompanyName: '',
  TradeName: '',
  Ruc: '',
  BusinessType: '',
  Status: 'Activo',
  Description: '',

  LogoUrl: '',
  LogoFileName: '',

  Phone: '',
  Mobile: '',
  Email: '',
  Website: '',
  Address: '',
  Country: '',
  City: '',

  DateFormat: 'dd/MM/yyyy',
  Currency: 'NIO',
  DecimalSeparator: '.',
  ThousandSeparator: ',',

  AffiliationCost: 0,
  OrdinaryCapitalPercentage: 0,
  OtherDeferredIncomePercentage: 0,
  AffiliationAccount: '',
  AffiliationNavidadAccount: '',
  OrdinaryCapitalAccount: '',
  OtherDeferredIncomeAccount: '',

  SmtpHost: '',
  SmtpPort: 0,
  SmtpFrom: '',
  SmtpUsername: '',
  SmtpPassword: '',

  TwoFactorCodeExpirationMinutes: 5,
  PasswordResetExpirationMinutes: 30,
  TrustedDeviceExpirationDays: 30,
  LoginLockMinutes: 10,
  JwtExpiresMinutes: 60,
  RefreshExpiresMinutes: 1440
};
