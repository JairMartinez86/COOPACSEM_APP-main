import interceptor from './es/interceptor.json';
import alerts from './es/alerts.json';
import file_manager from './es/file-manajer.json';
import draft from './es/draft.json';
import twoFactor from './es/twoFactor.json';
import sidebar from './es/sidebar.json';
import navbar from './es/navbar.json';
import modal from './es/modal.json';
import loader from './es/loader.json';
import auth from './es/auth.json';
import login from './es/login.json';
import forgotPassword from './es/forgotPassword.json';
import resetPassword from './es/resetPassword.json';
import company from './es/company.json';
import userSettings from './es/userSettings.json';
import rolesPermissions from './es/rolesPermissions.json';
import activity from './es/activity.json';
import userlist from './es/userlist.json';
import socios from './es/socios.json';
import proveedor from './es/proveedores.json';
import socio_ahorro from './es/socio-ahorro.json';
import socio_retiro from './es/socio-retiro.json';
import socio_cambio_cuota from './es/socio-cambio-cuota.json';
import socio_apertura_nav from './es/apertura-cuenta-navidena.json';
import ahorro from './es/ahorro.json';
import afiliacion_pago from './es/afiliacionPago.json';
import fichaSocio from './es/fichaSocio.json';
import estadoCuentaLista from './es/estadoCuentaLista.json';
import estadoCuentaDet from './es/estadoCuentaDetalle.json';
import solicitudCreditoLista from './es/solicitudCreditoListSocio.json';


export const es = Object.assign({}, interceptor, alerts, file_manager, twoFactor, sidebar, navbar, modal, loader, auth, login, forgotPassword, resetPassword, company, userSettings, rolesPermissions, activity, userlist, socios, proveedor, socio_ahorro, socio_retiro, socio_cambio_cuota, socio_apertura_nav, ahorro,
    afiliacion_pago, fichaSocio, estadoCuentaLista, estadoCuentaDet, solicitudCreditoLista,  draft);
