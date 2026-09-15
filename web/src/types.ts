export type Lang = 'en' | 'ar';

export interface ImageDto { src: string; srcSet: string; width: number; height: number; alt: string; }

export interface ProfileDto {
  name: string; headline: string; eyebrow: string; heroTitle: string; heroSubtitle: string;
  summary: string; location: string; about: string; quote: string;
  email: string; linkedInUrl: string; gitHubUrl: string;
  heroImage?: ImageDto | null; portrait?: ImageDto | null;
}
export interface JourneyDto {
  id: number; title: string; organisation: string; summary: string; highlights: string[];
  start: string; end: string | null; kind: 'main' | 'additional'; seniority: number;
}
export interface ProjectDto {
  slug: string; title: string; summary: string; body: string; technologies: string[];
  featured: boolean; availableInOtherLanguage: boolean;
  cover?: ImageDto | null;
}
export interface HomeData {
  lang: Lang; profile: ProfileDto; journey: JourneyDto[]; featuredProject: ProjectDto | null;
  projects: ProjectDto[]; technologies: { category: string; items: string[] }[];
  certificates: { title: string; issuer: string; issuedOn: string }[];
  education: { degree: string; institution: string }[];
  languages: { name: string; level: string }[];
  updatedAt: string;
}
export interface PageData {
  kind: 'home' | 'journey' | 'projects' | 'project' | 'notfound';
  lang: Lang; path: string; home: HomeData | null; project: ProjectDto | null;
}
