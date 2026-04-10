import { Routes } from '@angular/router';
import { AhorroComponent } from './ahorro.component';

export default [
  {
    path: '',
    component: AhorroComponent,
    data: {
      permission: '/ahorro',
      action: 'view',
    },
  },
] as Routes;
