import { Routes } from '@angular/router';
import { JMartMassiveValidationService } from '@JairMartinez86/jmartinez-validator';
import { guestGuard } from './core/guards/guest-guard';
import { authChildGuard } from './core/guards/CanActivateChildFn';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.Login),
    canActivate: [guestGuard],
    providers: [JMartMassiveValidationService],
  },
  {
    path: 'two-factor',
    loadComponent: () =>
      import('./features/auth/pages/two-factor/two-factor').then(m => m.TwoFactor),
    canActivate: [guestGuard],
    providers: [JMartMassiveValidationService],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/auth-forgot-password/auth-forgot-password')
        .then(m => m.AuthForgotPassword),
    canActivate: [guestGuard],
    providers: [JMartMassiveValidationService],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/auth-reset-password/auth-reset-password')
        .then(m => m.AuthResetPassword),
    providers: [JMartMassiveValidationService],
  },


  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    canActivateChild: [authChildGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [permissionGuard],
        data: { permission: '/dashboard' },
        providers: [JMartMassiveValidationService],
      },
      {
        path: 'company',
        loadComponent: () =>
          import('./features/setting/pages/company/company')
            .then(m => m.CompanyComponent),
        canActivate: [permissionGuard],
        data: { permission: '/company' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'roles-setting',
        loadComponent: () =>
          import('./features/setting/pages/roles-permissions/roles-permissions')
            .then(m => m.RolesPermissionsComponent),
        canActivate: [permissionGuard],
        data: { permission: '/roles-setting' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },


      {
        path: 'user-list',
        loadComponent: () =>
          import('./features/setting/pages/user-list/user-list')
            .then(m => m.UserList),
        canActivate: [permissionGuard],
        data: { permission: '/user-list', tableFilterKey: 'user-list' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },





      {
        path: 'user-setting',
        loadComponent: () =>
          import('./features/setting/pages/user-setting/user-setting')
            .then(m => m.UserSettingComponent),
        canActivate: [permissionGuard],
        data: { permission: '/user-setting' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },


      {
        path: 'activity-history',
        loadComponent: () =>
          import('./features/setting/pages/activity-history/activity-history.component')
            .then(m => m.ActivityHistoryComponent),
        canActivate: [permissionGuard],
        data: { permission: '/activity-history' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'activity-history/:user',
        loadComponent: () =>
          import('./features/setting/pages/activity-history/activity-history.component')
            .then(m => m.ActivityHistoryComponent),
        canActivate: [permissionGuard],
        data: { permission: '/activity-history' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },




      // SOCIOS
      {
        path: 'socios',
        loadComponent: () =>
          import('./features/prueba/pages/socios-list/socios-list')
            .then(m => m.SociosListComponent),
        canActivate: [permissionGuard],
        data: { permission: '/socios', action: 'view', tableFilterKey: 'socios', tableFilterEnter: true },
        providers: [JMartMassiveValidationService],
      },
      {
        path: 'socios/:id/ficha',
        loadComponent: () =>
          import('./features/prueba/pages/ficha-socio/ficha-socio.component')
            .then(m => m.FichaSocioComponent),
        canActivate: [permissionGuard],
        data: { permission: '/socios', action: 'view' },
      },



      {
        path: 'socios/new',
        loadComponent: () =>
          import('./features/prueba/pages/socios/socios')
            .then(m => m.SociosComponent),
        canActivate: [permissionGuard],
        data: { permission: '/socios', action: 'create' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'socios/:id/edit',
        loadComponent: () =>
          import('./features/prueba/pages/socios/socios')
            .then(m => m.SociosComponent),
        canActivate: [permissionGuard],
        data: { permission: '/socios', action: ['view', 'edit'] },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'socios/:id',
        loadComponent: () =>
          import('./features/prueba/pages/socios/socios')
            .then(m => m.SociosComponent),
        canActivate: [permissionGuard],
        data: { permission: '/socios', action: 'view' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },

      {
        path: 'socio-ahorro/new/:socioId',
        loadComponent: () =>
          import('./features/prueba/pages/socio-ahorro/socio-ahorro').then(m => m.SocioAhorroComponent),
        data: { permission: '/socio-ahorro', action: ['view', 'create'], tableFilterKey: 'socio-ahorro' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'socio-retiro/new/:socioId',
        loadComponent: () =>
          import('./features/prueba/pages/socio-retiro/socio-retiro.component').then(m => m.SocioRetiroComponent),
        data: { permission: '/socio-retiro', action: ['view', 'create'], tableFilterKey: 'socio-retiro' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'socio-retiro/view/:socioId/:solicitudId',
        loadComponent: () =>
          import('./features/prueba/pages/socio-retiro/socio-retiro.component')
            .then(m => m.SocioRetiroComponent),
        data: {
          permission: '/socio-retiro',
          action: ['view'],
          tableFilterKey: 'socio-retiro'
        },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'socio-retiro/edit/:socioId/:solicitudId',
        loadComponent: () =>
          import('./features/prueba/pages/socio-retiro/socio-retiro.component')
            .then(m => m.SocioRetiroComponent),
        data: {
          permission: '/socio-retiro',
          action: ['edit'],
          tableFilterKey: 'socio-retiro'
        },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'cambio-cuota/new/:socioId/:tipoMovimiento',
        loadComponent: () =>
          import('./features/prueba/pages/socio-cambio-cuota/socio-cambio-cuota').then(m => m.SocioCambioCuotaComponent),
        data: { permission: '/cambio-cuota', action: ['view', 'create'], tableFilterKey: 'socio-cambio-cuota' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },

      {
        path: 'apertura-cuenta-navidena/:socioId',
        loadComponent: () =>
          import('./features/prueba/pages/apertura-cuenta-navidena/apertura-cuenta-navidena')
            .then(m => m.AperturaCuentaNavidenaComponent),
        data: {
          permission: '/apertura-cuenta-navidena',
          action: ['view', 'create'],
          tableFilterKey: 'apertura-cuenta-navidena'
        },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },


      //PAGO AFILIACION
      {
        path: 'socio-afiliacion-pago/new/:socioId',
        loadComponent: () =>
          import('./features/prueba/pages/pago-afiliacion/socio-afiliacion.component')
            .then(m => m.SocioAfiliacionPagoComponent),
        data: {
          permission: '/socios',
          action: ['view', 'create']
        },
        providers: [JMartMassiveValidationService]
      },


      // AHORROS

      {
        path: 'ahorro',
        loadComponent: () =>
          import('./features/ahorro/pages/ahorro.component')
            .then(m => m.AhorroComponent),
        canActivate: [permissionGuard],
        data: { permission: '/ahorro', action: 'view', tableFilterKey: 'ahorro', tableFilterEnter: true },
        providers: [JMartMassiveValidationService],
      },






      // ESTADO DE CUENTA
      {
        path: 'estado-cuenta',
        loadComponent: () =>
          import('./features/ahorro/pages/components/estado-cuenta/estado-cuenta-lista.component')
            .then(m => m.EstadoCuentaListaComponent),
        canActivate: [permissionGuard],
        data: {
          permission: '/estado-cuenta',
          action: 'view',
          tableFilterKey: 'estado-cuenta-lista',
          tableFilterEnter: true
        }
      },
      {
        path: 'estado-cuenta/:id/detalle',
        loadComponent: () =>
          import('./features/ahorro/pages/components/estado-cuenta/estado-cuenta-detalle/estado-cuenta-detalle.component')
            .then(m => m.EstadoCuentaDetalleComponent),
        canActivate: [permissionGuard],
        data: {
          permission: '/estado-cuenta',
          action: 'view'

        }
      },



      //SOLICITUD DE CREDITO
      {
        path: 'solicitud-credito',
        loadComponent: () =>
          import('./features/credito/pages/components/solicitud-credito-list-socio/solicitud-credito-list-socio.component')
            .then(m => m.SolicitudCreditoListSocioComponent),
        canActivate: [permissionGuard],
        data: {
          permission: '/solicitud-credito',
          action: 'view',
          tableFilterKey: 'solicitud-credito-lista',
          tableFilterEnter: true
        },
        providers: [JMartMassiveValidationService],
      },

      {
        path: 'solicitud-credito/new/:socioId',
        loadComponent: () =>
          import('./features/credito/pages/components/solicitud-credito/solicitud-credito.component')
            .then(m => m.SolicitudCreditoComponent),
        data: {
          permission: '/solicitud-credito',
          action: ['view', 'create'],
          tableFilterKey: 'solicitud-credito'
        },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },


      {
        path: 'solicitud-credito/view/:socioId/:solicitudId',
        loadComponent: () =>
          import('./features/credito/pages/components/solicitud-credito/solicitud-credito.component')
            .then(m => m.SolicitudCreditoComponent),
        data: {
          permission: '/solicitud-credito',
          action: ['view']
        },
        providers: [JMartMassiveValidationService]
      },
      {
        path: 'solicitud-credito/edit/:socioId/:solicitudId',
        loadComponent: () =>
          import('./features/credito/pages/components/solicitud-credito/solicitud-credito.component')
            .then(m => m.SolicitudCreditoComponent),
        data: {
          permission: '/solicitud-credito',
          action: ['edit']
        },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },



      // APROBACIONES DE CRÉDITO
      {
        path: 'aprobaciones-credito',
        loadComponent: () =>
          import('./features/credito/pages/components/solicitud-credito-lista/solicitud-credito-lista.component')
            .then(m => m.SolicitudCreditoListaComponent),
        canActivate: [permissionGuard],
        data: {
          permission: '/aprobaciones-credito',
          action: 'view'
        }
      },





      // PROVEEDORES
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./features/prueba/pages/proveedores-list/proveedores-list')
            .then(m => m.ProveedoresListComponent),
        canActivate: [permissionGuard],
        data: { permission: '/proveedores', action: 'view', tableFilterKey: 'proveedores' },
        providers: [JMartMassiveValidationService],
      },
      {
        path: 'proveedores/new',
        loadComponent: () =>
          import('./features/prueba/pages/proveedor/proveedores')
            .then(m => m.ProveedoresComponent),
        canActivate: [permissionGuard],
        data: { permission: '/proveedores', action: 'create' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'proveedores/:id/edit',
        loadComponent: () =>
          import('./features/prueba/pages/proveedor/proveedores')
            .then(m => m.ProveedoresComponent),
        canActivate: [permissionGuard],
        data: { permission: '/proveedores', action: ['view', 'edit'] },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'proveedores/:id',
        loadComponent: () =>
          import('./features/prueba/pages/proveedor/proveedores')
            .then(m => m.ProveedoresComponent),
        canActivate: [permissionGuard],
        data: { permission: '/proveedores', action: 'view' },
        providers: [JMartMassiveValidationService],
        canDeactivate: [pendingChangesGuard],
      }




    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];