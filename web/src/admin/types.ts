/** Mirrors of the admin API's shapes (api/Profile.Api/Admin). */

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface ProfileEdit {
  name: LocalizedText;
  headline: LocalizedText;
  eyebrow: LocalizedText;
  heroTitle: LocalizedText;
  heroSubtitle: LocalizedText;
  summary: LocalizedText;
  location: LocalizedText;
  about: LocalizedText;
  quote: LocalizedText;
  email: string;
  linkedInUrl: string;
  gitHubUrl: string;
  heroMediaId: string | null;
  portraitMediaId: string | null;
}

export interface JourneyItem {
  id: number;
  sortOrder: number;
  title: LocalizedText;
  organisation: LocalizedText;
  summary: LocalizedText;
  highlights: LocalizedText[];
  startDate: string;
  endDate: string | null;
  kind: 'main' | 'additional';
  seniority: number;
  visible: boolean;
}

export interface ProjectItem {
  id: number;
  sortOrder: number;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  body: LocalizedText;
  technologies: string[];
  featured: boolean;
  visible: boolean;
  coverMediaId: string | null;
}

export interface TechnologyItem {
  id: number;
  sortOrder: number;
  name: string;
  category: LocalizedText;
}

export interface CertificateItem {
  id: number;
  sortOrder: number;
  title: LocalizedText;
  issuer: string;
  issuedOn: string;
}

export interface EducationItem {
  id: number;
  sortOrder: number;
  degree: LocalizedText;
  institution: LocalizedText;
}

export interface LanguageItem {
  id: number;
  sortOrder: number;
  name: LocalizedText;
  level: LocalizedText;
}

export interface MediaView {
  id: string;
  fileName: string;
  width: number;
  height: number;
  alt: LocalizedText;
  widths: number[];
  previewUrl: string;
  createdAt: string;
}

export interface CvFileView {
  lang: 'en' | 'ar';
  fileName: string;
  size: number;
  uploadedAt: string;
}

export interface PageSeoView {
  key: 'home' | 'journey' | 'projects';
  title: LocalizedText;
  description: LocalizedText;
  shareMediaId: string | null;
}

export interface SettingsView {
  gaMeasurementId: string;
  gaPropertyId: string;
  searchConsoleToken: string;
  notificationEmail: string;
  messageRetentionDays: number;
}

export interface SeoView {
  pages: PageSeoView[];
  settings: SettingsView;
}

export interface CompletenessItem {
  area: 'profile' | 'journey' | 'projects' | 'technologies' | 'certificates' | 'education' | 'languages' | 'media';
  id: string | null;
  label: string;
  missing: string[];
}

export const emptyText = (): LocalizedText => ({ en: '', ar: '' });
