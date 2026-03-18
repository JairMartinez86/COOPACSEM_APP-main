

export interface UserSettingRequest {
  identifier: string;
  FullName: string;
  Email: string;
  Mobile: string;
  PhoneNumber: string;
  Address: string;
  Theme: string;
  Language: string;
  DefaultLandingPage: string;
  EnableTwoFactorLogin : boolean;
  EnableAuditEmailNotifications: boolean;
  SessionActive : number,
  MaxSessions : number,
  PasswordChangedAtUtc : string;
  Password : string;
  NewPassword : string;
  ConfirmPassword : string;
}

export const EMPTY_USER_SETTING: UserSettingRequest = {
  identifier: '',
  FullName: '',
  Email: '',
  Mobile: '',
  PhoneNumber: '',
  Address: '',
  Theme: '',
  Language: '',
  DefaultLandingPage: '',
  EnableTwoFactorLogin : false,
  EnableAuditEmailNotifications: false,
  SessionActive : 0,
  MaxSessions : 0,
  PasswordChangedAtUtc : '',
  Password : '',
  NewPassword : '',
  ConfirmPassword: ''
};