export interface LoginRequest {
  identifier: string;
  password: string;

}


export const EMPTY_USER_SETTING: LoginRequest = {
  identifier: '',
  password: '',
};