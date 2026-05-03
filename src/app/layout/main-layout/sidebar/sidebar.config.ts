export interface SidebarPermissions {
  view: boolean | null;
  create: boolean | null;
  edit: boolean | null;
  delete: boolean | null;
}

export interface SidebarItem {
  type: 'link' | 'heading' | 'submenu';
  titleKey: string;
  iconclass?: string;
  router?: string;
  children?: SidebarItem[];
  permissions?: SidebarPermissions;
  open?: boolean;
  id?: string;
}

export const SIDEBAR_DATA: SidebarItem[] = [
  {
    type: 'link',
    titleKey: 'sidebar.items.dashboard',
    iconclass: 'fa-jelly-fill fa-regular fa-gauge',
    router: '/dashboard',
    permissions: {
      view: false,
      create: null,
      edit: null,
      delete: null
    }
  },
  {
    type: 'heading',
    titleKey: 'sidebar.items.adminPanel'
  },
  {
    type: 'link',
    titleKey: 'sidebar.items.company',
    iconclass: 'ri-building-2-fill',
    router: '/company',
    permissions: {
      view: false,
      create: null,
      edit: false,
      delete: null
    }
  },
  {
    type: 'submenu',
    titleKey: 'sidebar.items.users',
    iconclass: 'fa-duotone fa-solid fa-users',
    children: [
      {
        type: 'link',
        titleKey: 'sidebar.items.userlist',
        router: '/user-list',

        permissions: {
          view: false,
          create: false,
          edit: false,
          delete: false
        }
      },
      {
        type: 'submenu',
        titleKey: 'sidebar.items.settings',
        children: [
          {
            type: 'link',
            titleKey: 'sidebar.items.account',
            router: '/user-setting',
            permissions: {
              view: false,
              create: null,
              edit: false,
              delete: null
            }
          },
          {
            type: 'link',
            titleKey: 'sidebar.items.activity',
            router: '/activity-history',
            permissions: {
              view: false,
              create: null,
              edit: null,
              delete: null
            }
          }
        ]
      },
      {
        type: 'link',
        titleKey: 'sidebar.items.rolesPermissions',
        router: '/roles-setting',
        permissions: {
          view: false,
          create: false,
          edit: false,
          delete: false
        }
      }
    ]
  },

  //SOCIO
  {
    type: 'heading',
    titleKey: 'sidebar.items.partnerPanel'
  },
    {
    type: 'link',
    titleKey: 'sidebar.items.partner',
    iconclass: 'fa-solid fa-handshake',
    router: '/socios',
    permissions: {
      view: false,
      create: false,
      edit: false,
      delete: false
    }
  },

  {
    type: 'submenu',
    titleKey: 'sidebar.items.saving',
    iconclass: 'fa-sharp fa-solid fa-piggy-bank',
    children: [
    {
    type: 'link',
    titleKey: 'sidebar.items.saverList',
    iconclass: '',
    router: '/ahorro',
    permissions: {
      view: false,
      create: false,
      edit: false,
      delete: null
    }
  },

   {
    type: 'link',
    titleKey: 'sidebar.items.estadoCuentaList',
    iconclass: '',
    router: '/estado-cuenta',
    permissions: {
      view: false,
      create: null,
      edit: null,
      delete: null
    }
  },
  

     
    ]
  },



  //CREDITO
  {
    type: 'heading',
    titleKey: 'sidebar.items.creditoPanel'
  },
    {
    type: 'link',
    titleKey: 'sidebar.items.solicitudCredito',
    iconclass: 'fa-duotone fa-solid fa-hand-holding-dollar',
    router: '/solicitud-credito',
    permissions: {
      view: false,
      create: false,
      edit: null,
      delete: null
    }
  },



    {
    type: 'heading',
    titleKey: 'sidebar.items.emptyPanel'
  },

 

  {
    type: 'link',
    titleKey: 'sidebar.items.supplier',
    iconclass: 'fa-duotone fa-solid fa-truck',
    router: '/proveedores',
    permissions: {
      view: false,
      create: false,
      edit: false,
      delete: false
    }
  },

  {
    type: 'link',
    titleKey: 'sidebar.items.empty',
    iconclass: 'fa-solid fa-empty-set',
    router: '/dashboard',
    permissions: {
      view: false,
      create: null,
      edit: null,
      delete: null
    }
  },

  {
    type: 'heading',
    titleKey: 'sidebar.items.otro',
    
  },


];