import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppStateService } from '../../../../core/services/app-state.service';
import { JMartAutoFocusNextDirective, JMartEngineSyncDirective, JMartErrorNotifyDirective, JMartMassiveValidationService } from '@JairMartinez86/jmartinez-validator';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService, ForgotPasswordRequest } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-auth-forgot-password',
  imports: [CommonModule,
    FormsModule,
    TranslateModule,
    JMartAutoFocusNextDirective,
    JMartErrorNotifyDirective,
    JMartEngineSyncDirective,
    RouterLink],
  templateUrl: './auth-forgot-password.html',
  styleUrl: './auth-forgot-password.scss',
})
export class AuthForgotPassword {
   public appState = inject(AppStateService);
   private translate = inject(TranslateService);
   private engine = inject(JMartMassiveValidationService);
    public notify = inject(NotificationService);
    private auth = inject(AuthService);
    

  ForgotPasswordRequest: ForgotPasswordRequest  = {
      identifier: ''
    };


     ngOnInit(): void {
    this.loadLoginConfig();


    
  }


  
loadLoginConfig(): void {
  this.engine.resetRules();
  this.engine.clearFieldsMeta();


  const fieldMeta = this.translate.instant('forgotPassword.form.fieldMeta') || {};
  const validations = this.translate.instant('forgotPassword.form.validations') || {};


  for (const [fieldId, meta] of Object.entries(fieldMeta as Record<string, any>)) {
    this.engine.addFieldMeta({
      id: fieldId,
      label: meta?.label ?? '',
      tooltip: meta?.tooltip ?? '',
      tooltipIconClass: meta?.tooltipIconClass ?? ''
    });
  }

  for (const [fieldId, fieldConfig] of Object.entries(validations as Record<string, any>)) {
    const rules = fieldConfig?.data || {};

    for (const rule of Object.values(rules) as any[]) {
      this.engine.addRule({
        id: fieldId,
        condition: rule?.rule ?? '',
        value: rule?.value ?? '',
        message: String(rule?.msj ?? '').replace('{value}', rule?.value ?? ''),
        classIconSuccess: rule?.classIconSuccess ?? '',
        classIconError: rule?.classIconError ?? ''
      });
    }
  }
}

 
 public sendResetLink(): void {


  const ok = this.engine.validateAll();

    if (!ok) {

      this.notify.show(this.notify.errorFortmat(this.engine.getGroupedErrorsSnapshot()), '', 'warning');
      return;
    }

    this.engine.clearErrors();
    this.notify.close();



    this.auth.requestPasswordReset(this.ForgotPasswordRequest).subscribe({
      next: (res) => {
        this.notify.showFromApiResponse(
          res,
          this.translate.instant('modal.types.success.title')
        );
      },
      error: (err) => {
        this.notify.showFromApiResponse(
          err?.error ?? err,
          this.translate.instant('modal.types.error.title')
        );
      }
    });
  }



}
