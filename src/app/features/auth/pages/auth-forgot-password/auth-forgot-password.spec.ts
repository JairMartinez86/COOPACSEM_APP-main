import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthForgotPassword } from './auth-forgot-password';

describe('AuthForgotPassword', () => {
  let component: AuthForgotPassword;
  let fixture: ComponentFixture<AuthForgotPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthForgotPassword],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthForgotPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
