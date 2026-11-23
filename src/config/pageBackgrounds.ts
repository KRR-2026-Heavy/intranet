import type { CSSProperties } from 'react'

const backgroundImages = {
  'background-one': '/images/background.jpeg',
  'background-two': '/images/background2.jpeg',
  'background-three': '/images/background3.jpeg',
  'company-view': '/images/company view.jpeg',
} as const

const pageBackgrounds: Record<string, keyof typeof backgroundImages> = {
  'login-landing': 'background-one',
  'employee-login': 'background-two',
  'admin-login': 'background-three',
  'employee-dashboard': 'company-view',
  'employee-module-organization-board': 'background-three',
  'employee-module-departments': 'background-two',
  'employee-module-announcements': 'background-one',
  'employee-module-thoughts': 'company-view',
  'employee-module-notices': 'background-two',
  'employee-module-meetings': 'background-three',
  'employee-module-quick-access': 'company-view',
  'employee-module-it-support': 'background-one',
  'employee-module-leave-management': 'background-two',
  'employee-module-policies': 'background-three',
  'employee-module-holidays': 'company-view',
  'admin-dashboard-overview': 'background-one',
  'admin-employee-management': 'background-two',
  'admin-department-management': 'background-three',
  'admin-company-announcements': 'company-view',
  'admin-thoughts-for-the-month': 'background-one',
  'admin-important-notices': 'background-two',
  'admin-meeting-updates': 'background-three',
  'admin-holiday-management': 'company-view',
  'admin-company-policies': 'background-one',
}

type BackgroundStyle = CSSProperties & {
  '--page-background-image': string
}

export function getPageBackgroundStyle(page: string): BackgroundStyle {
  const background = pageBackgrounds[page] ?? 'background-one'
  return {
    '--page-background-image': `url("${backgroundImages[background]}")`,
  }
}
