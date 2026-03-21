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
    iconclass: 'ph-light ph-squares-four',
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
    iconclass: 'ph-light ph-users-three',
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
   {
    type: 'heading',
    titleKey: 'sidebar.items.emptyPanel'
  },

  {
    type: 'link',
    titleKey: 'sidebar.items.partner',
    iconclass: 'ph ph-money',
    router: '/socios',
    permissions: {
      view: false,
      create: false,
      edit: false,
      delete: false
    }
  },

   {
    type: 'link',
    titleKey: 'sidebar.items.supplier',
    iconclass: 'ph ph-money',
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
    iconclass: 'ph ph-money',
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
    titleKey: 'sidebar.items.otro'
  },
];